import { randomUUID } from "crypto";
import { admin } from "../../lib/supabase/admin";
import { fromRow } from "../../lib/supabase/transform";
import { getCountryFromIP } from "../../lib/privacy";
import { widgetLimiter, runMiddleware } from "../../lib/rate-limit";
import { resolvePromptVersion } from "../../lib/chat/prompts";
import { generateChatResponse, toAiMessages } from "../../lib/ai/engine";
import { retrieveContext } from "../../lib/rag/retrieve";

// Non-streaming chat endpoint for the in-platform multi-provider engine.
// Mirrors respond-responses.js (same conversation/quota/analytics handling) but
// resolves the prompt + model from the platform DB and calls the Vercel AI SDK
// + AI Gateway instead of OpenAI's hosted-prompt Responses API. The legacy
// endpoints (respond.js / respond-responses.js) are untouched.

if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(v) {
  return typeof v === 'string' && UUID_RE.test(v);
}

const widgetCache = new Map();
const WIDGET_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const runInBackground = (fn) => {
  if (typeof setImmediate === 'function') setImmediate(fn);
  else setTimeout(fn, 0);
};

function updateAnalyticsAsync(widgetUuid, conversation, isNewConversation = false) {
  runInBackground(async () => {
    try {
      await updateAnalytics(widgetUuid, conversation, isNewConversation);
    } catch (analyticsError) {
      console.error('Analytics update error (background):', analyticsError);
    }
  });
}

async function getWidgetWithCache(widgetId) {
  const cacheKey = String(widgetId);
  const cached = widgetCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt <= WIDGET_CACHE_TTL) {
    return cached.widget;
  }
  widgetCache.delete(cacheKey);

  let { data } = await admin.from('widgets').select('*').eq('legacy_id', cacheKey).maybeSingle();
  if (!data && isUuid(cacheKey)) {
    ({ data } = await admin.from('widgets').select('*').eq('id', cacheKey).maybeSingle());
  }
  if (!data) return null;

  const widget = fromRow(data);
  widgetCache.set(cacheKey, { widget, cachedAt: Date.now() });
  return widget;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-elva-consent-analytics, x-elva-consent-functional');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await runMiddleware(req, res, widgetLimiter);
  } catch (error) {
    return res.status(429).json({ error: 'Too many requests, please slow down', retryAfter: '60 seconds' });
  }

  try {
    const { widgetId, message, userId, conversationId, imageUrl } = req.body;

    if (!widgetId || !message || !userId) {
      return res.status(400).json({ error: 'Missing required fields: widgetId, message, userId' });
    }

    const widget = await getWidgetWithCache(widgetId);
    if (!widget) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    // This endpoint only serves in-platform widgets.
    if (!(widget.ai?.engine === 'in-platform' && widget.promptId)) {
      return res.status(400).json({
        error: 'Widget not configured for the in-platform engine',
        details: 'Widget must have ai.engine = "in-platform" and a promptId.'
      });
    }

    // Check quota before allowing new conversations.
    if (!conversationId && widget.organizationId) {
      const { checkQuota } = await import('../../lib/quota.js');
      const quotaCheck = await checkQuota(String(widget.organizationId));
      if (quotaCheck.blocked) {
        return res.status(403).json({
          error: 'Quota exceeded',
          message: quotaCheck.message || (quotaCheck.reason === 'trial_expired'
            ? 'Gratis prøveperiode udløbet. Opgrader for at fortsætte.'
            : 'Månedlig samtalekvote nået. Opgrader for at fortsætte.')
        });
      }
    }

    // Get or create conversation.
    let conversation;
    if (conversationId && isUuid(conversationId)) {
      const { data } = await admin.from('conversations').select('*').eq('id', conversationId).maybeSingle();
      if (data) conversation = fromRow(data);
    }

    if (!conversation) {
      const analyticsConsent = req.headers['x-elva-consent-analytics'] === 'true';
      const rawIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
      const country = analyticsConsent ? await getCountryFromIP(rawIP) : null;
      const sessionId = `session_${Date.now()}`;

      const newRow = {
        widget_id: widget._id,
        widget_legacy_id: widget.legacyId || String(widgetId),
        organization_id: widget.organizationId || null,
        session_id: sessionId,
        user_id: userId || null,
        start_time: new Date().toISOString(),
        message_count: 0,
        messages: [],
        satisfaction: null,
        tags: [],
        metadata: {
          userAgent: req.headers['user-agent'] || '',
          country: country,
          referrer: analyticsConsent ? (req.headers['referer'] || null) : null,
          consentGiven: analyticsConsent
        }
      };
      const { data: inserted, error: convErr } = await admin
        .from('conversations').insert(newRow).select('id').single();
      if (convErr) throw convErr;

      conversation = {
        _id: inserted.id,
        widgetId: widget._id,
        organizationId: widget.organizationId || null,
        sessionId,
        startTime: new Date(),
        messageCount: 0,
        messages: [],
        isNew: true
      };

      if (widget.organizationId) {
        try {
          const { incrementConversationCount } = await import('../../lib/quota.js');
          await incrementConversationCount(String(widget.organizationId));
        } catch (quotaError) {
          console.error('❌ Error incrementing quota:', quotaError);
        }
      }
    }

    if (!Array.isArray(conversation.messages)) conversation.messages = [];

    // Append the user message BEFORE building the model input (history replay).
    const userMessage = {
      id: randomUUID(),
      type: "user",
      content: message,
      imageUrl: imageUrl || null,
      timestamp: new Date(),
      responseTime: null,
      tokens: null
    };
    conversation.messages.push(userMessage);

    // Resolve the pinned prompt version and generate.
    const resolved = await resolvePromptVersion(widget);

    // RAG: prepend relevant knowledge-base context (gated on the widget binding;
    // retrieveContext never throws, returns empty context on any failure).
    if (widget.knowledgeBase?.enabled === true) {
      const { contextText } = await retrieveContext({
        widgetId: widget.id,
        query: message,
        topK: widget.knowledgeBase?.topK,
      });
      if (contextText) {
        resolved.systemPrompt = `${contextText}\n\n${resolved.systemPrompt || ''}`.trim();
      }
    }

    const startTime = Date.now();
    const { text: aiReply, usage } = await generateChatResponse({
      provider: resolved.provider,
      model: resolved.model,
      systemPrompt: resolved.systemPrompt,
      messages: toAiMessages(conversation.messages, { provider: resolved.provider, model: resolved.model }),
      temperature: resolved.temperature,
      maxTokens: resolved.maxTokens,
    });
    const responseTime = Date.now() - startTime;

    if (!aiReply) {
      throw new Error('Empty response from model');
    }

    const aiMessage = {
      id: randomUUID(),
      type: "assistant",
      content: aiReply,
      timestamp: new Date(),
      responseTime: responseTime,
      tokens: usage?.total_tokens || null,
      ai: { provider: resolved.provider, model: resolved.model, promptVersion: resolved.version, usage }
    };
    conversation.messages.push(aiMessage);
    conversation.messageCount = conversation.messages.length;

    await admin.from('conversations').update({
      messages: conversation.messages,
      message_count: conversation.messageCount
    }).eq('id', conversation._id);

    res.json({
      reply: aiReply,
      conversationId: conversation._id,
      metadata: {
        usage,
        provider: resolved.provider,
        model: resolved.model,
        promptVersion: resolved.version
      }
    });

    updateAnalyticsAsync(widget._id, conversation, conversation.isNew);

  } catch (error) {
    console.error('❌ Error in /api/respond-v2 (in-platform):', error);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Atomic analytics rollup via record_analytics_event RPC (mirrors respond-responses.js).
async function updateAnalytics(widgetUuid, conversation, isNewConversation = false) {
  if (!widgetUuid) return;

  const baseDate = conversation.startTime || conversation.createdAt || new Date();
  const date = new Date(baseDate);
  const dateKey = date.toISOString().split('T')[0];

  const messageCount = conversation.messageCount || conversation.messages?.length || 0;
  const responseTimes = conversation.messages?.filter(m => m.responseTime && m.type === 'assistant').map(m => m.responseTime) || [];
  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0;

  const hasAssistantMessage = conversation.messages?.some(msg => msg.type === 'assistant') || false;
  const shouldCountConversation = isNewConversation && messageCount > 0 && hasAssistantMessage;

  const sessionId = conversation.sessionId ? String(conversation.sessionId) : null;
  const hour = date.getHours();

  const { error } = await admin.rpc('record_analytics_event', {
    p_widget_id: widgetUuid,
    p_date: dateKey,
    p_hour: hour,
    p_message_count: messageCount,
    p_avg_response_time: avgResponseTime,
    p_count_conversation: shouldCountConversation,
    p_session_id: sessionId
  });
  if (error) {
    console.error('❌ Analytics RPC error:', error.message);
  }
}

import OpenAI from "openai";
import { randomUUID } from "crypto";
import { admin } from "../../lib/supabase/admin";
import { fromRow } from "../../lib/supabase/transform";
import { getCountryFromIP } from "../../lib/privacy";
import { widgetLimiter, runMiddleware } from "../../lib/rate-limit";

// Set environment variable to handle SSL certificate issues in development
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000, // 30 second timeout
  maxRetries: 2
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-elva-consent-analytics, x-elva-consent-functional');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Apply rate limiting - GDPR security requirement
  try {
    await runMiddleware(req, res, widgetLimiter);
  } catch (error) {
    return res.status(429).json({ 
      error: 'Too many requests, please slow down',
      retryAfter: '60 seconds'
    });
  }

  try {
    const { widgetId, message, userId, conversationId } = req.body;

    if (!widgetId || !message || !userId) {
      return res.status(400).json({ error: 'Missing required fields: widgetId, message, userId' });
    }

    // Get widget configuration (looked up by legacy embed id)
    let { data } = await admin.from('widgets').select('*').eq('legacy_id', String(widgetId)).maybeSingle();
    if (!data && UUID_RE.test(widgetId)) {
      ({ data } = await admin.from('widgets').select('*').eq('id', widgetId).maybeSingle());
    }
    const widget = data ? fromRow(data) : null;
    if (!widget) {
      return res.status(404).json({ error: "Widget not found" });
    }

    // Check quota before allowing new conversations
    if (!conversationId && widget.organizationId) {
      const { checkQuota } = await import('../../lib/quota.js');
      // Convert organizationId to string for the quota helper
      const orgIdString = String(widget.organizationId);
      const quotaCheck = await checkQuota(orgIdString);
      
      if (quotaCheck.blocked) {
        return res.status(403).json({ 
          error: 'Quota exceeded',
          message: quotaCheck.message || (quotaCheck.reason === 'trial_expired' 
            ? 'Gratis prøveperiode udløbet. Opgrader for at fortsætte.'
            : 'Månedlig samtalekvote nået. Opgrader for at fortsætte.')
        });
      }
    }

    // Get or create conversation
    let conversation;
    if (conversationId && UUID_RE.test(conversationId)) {
      const { data: convData } = await admin.from('conversations').select('*').eq('id', conversationId).maybeSingle();
      if (convData) conversation = fromRow(convData);
    }

    if (!conversation) {
      // GDPR COMPLIANCE: Check if user has given analytics consent
      const analyticsConsent = req.headers['x-elva-consent-analytics'] === 'true';

      // Only collect country data if consent given
      const rawIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
      const country = analyticsConsent ? await getCountryFromIP(rawIP) : null;
      const sessionId = `session_${Date.now()}`;

      // Create new conversation with proper schema
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
          // ✅ GDPR FIX: Only collect if consent given
          country: country,
          referrer: analyticsConsent ? (req.headers['referer'] || null) : null,
          consentGiven: analyticsConsent
        },
        openai: {
          lastResponseId: null,
          conversationHistory: []
        },
        last_response_id: null
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
      console.log('✅ New conversation created:', conversation._id, 'Consent:', analyticsConsent);

      // Increment conversation quota count
      if (widget.organizationId) {
        try {
          const { incrementConversationCount } = await import('../../lib/quota.js');
          // Convert organizationId to string for the quota helper
          const orgIdString = String(widget.organizationId);
          await incrementConversationCount(orgIdString);
        } catch (quotaError) {
          console.error('❌ Error incrementing quota:', quotaError);
          // Don't fail the conversation if quota increment fails
        }
      }
    }

    // Add user message to conversation
    const userMessage = {
      id: randomUUID(),
      type: "user",
      content: message,
      timestamp: new Date(),
      responseTime: null,
      tokens: null
    };
    conversation.messages.push(userMessage);

    // Build conversation context for AI
    const conversationInput = [
      { role: "system", content: widget.prompt },
      ...conversation.messages.map(msg => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content
      }))
    ];

    // Get AI response with timing
    const startTime = Date.now();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: conversationInput,
      max_tokens: 200,
      temperature: 0.7
    });
    const responseTime = Date.now() - startTime;

    const aiReply = response.choices[0].message.content;

    // Add AI response to conversation
    const aiMessage = {
      id: randomUUID(),
      type: "assistant",
      content: aiReply,
      timestamp: new Date(),
      responseTime: responseTime,
      tokens: response.usage?.total_tokens || null
    };
    conversation.messages.push(aiMessage);

    // Update conversation in database
    await admin.from('conversations').update({
      messages: conversation.messages,
      message_count: conversation.messages.length
    }).eq('id', conversation._id);
    console.log('📝 Conversation updated:', conversation._id, 'Messages:', conversation.messages.length, 'Response time:', responseTime + 'ms');

    // Update analytics after successful conversation - pass isNewConversation flag
    try {
      await updateAnalytics(widget._id, conversation, conversation.isNew);
    } catch (analyticsError) {
      console.error('Analytics update error:', analyticsError);
      // Don't fail the response if analytics update fails
    }

    res.json({
      reply: aiReply,
      conversationId: conversation._id
    });

  } catch (error) {
    console.error('Error in /api/respond:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Helper function to update analytics via the atomic record_analytics_event RPC.
async function updateAnalytics(widgetUuid, conversation, isNewConversation = false) {
  if (!widgetUuid) return;

  const date = new Date(conversation.startTime || new Date());
  const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

  const messageCount = conversation.messageCount || conversation.messages?.length || 0;
  const responseTimes = conversation.messages?.filter(m => m.responseTime && m.type === 'assistant').map(m => m.responseTime) || [];
  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0;

  const hasAssistantMessage = conversation.messages?.some(m => m.type === 'assistant') || false;
  const shouldCountConversation = isNewConversation && messageCount > 0 && hasAssistantMessage;

  const sessionId = conversation.sessionId ? String(conversation.sessionId) : null;

  const { error } = await admin.rpc('record_analytics_event', {
    p_widget_id: widgetUuid,
    p_date: dateKey,
    p_hour: date.getHours(),
    p_message_count: messageCount,
    p_avg_response_time: avgResponseTime,
    p_count_conversation: shouldCountConversation,
    p_session_id: sessionId
  });
  if (error) console.error('Analytics RPC error:', error.message);
}

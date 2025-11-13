import OpenAI from "openai";
import { ObjectId } from "mongodb";
import clientPromise from "../../lib/mongodb";
import { getCountryFromIP, hasAnalyticsConsent } from "../../lib/privacy";
import { widgetLimiter, runMiddleware } from "../../lib/rate-limit";

// Set environment variable to handle SSL certificate issues in development
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000,
  maxRetries: 2
});

const widgetCache = new Map();
const WIDGET_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const runInBackground = (fn) => {
  if (typeof setImmediate === 'function') {
    setImmediate(fn);
  } else {
    setTimeout(fn, 0);
  }
};

function updateAnalyticsAsync(db, widgetId, conversation, isNewConversation = false) {
  runInBackground(async () => {
    try {
      await updateAnalytics(db, widgetId, conversation, isNewConversation);
    } catch (analyticsError) {
      console.error('Analytics update error (background):', analyticsError);
    }
  });
}

function cacheWidget(widgetId, widget) {
  widgetCache.set(widgetId, {
    widget,
    cachedAt: Date.now()
  });
}

function getCachedWidget(widgetId) {
  const cached = widgetCache.get(widgetId);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > WIDGET_CACHE_TTL) {
    widgetCache.delete(widgetId);
    return null;
  }
  return cached.widget;
}

async function getWidgetWithCache(db, queryId) {
  const cacheKey = String(queryId);
  const cachedWidget = getCachedWidget(cacheKey);
  if (cachedWidget) {
    return cachedWidget;
  }

  const widget = await db.collection("widgets").findOne({ _id: queryId });
  if (widget) {
    cacheWidget(cacheKey, widget);
  }
  return widget;
}

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
    const { widgetId, message, userId, conversationId, imageUrl } = req.body;
    
    console.log('📥 Received request:', {
      widgetId,
      message: message ? message.substring(0, 50) + '...' : 'null',
      userId,
      conversationId,
      hasImage: !!imageUrl,
      bodyKeys: Object.keys(req.body)
    });

    if (!widgetId || !message || !userId) {
      console.log('❌ Missing required fields:', { widgetId: !!widgetId, message: !!message, userId: !!userId });
      return res.status(400).json({ error: 'Missing required fields: widgetId, message, userId' });
    }

    const client = await clientPromise;
    const db = client.db("elva-agents");
    
    // Convert string ID to ObjectId if it's a valid ObjectId string
    let queryId = widgetId;
    if (ObjectId.isValid(widgetId)) {
      queryId = new ObjectId(widgetId);
    }
    
    // Get widget configuration
    const widget = await getWidgetWithCache(db, queryId);
    if (!widget) {
      console.log('❌ Widget not found:', widgetId);
      return res.status(404).json({ error: "Widget not found" });
    }
    
    console.log('✅ Widget found:', {
      id: widget._id,
      hasOpenAI: !!widget.openai,
      promptId: widget.openai?.promptId,
      version: widget.openai?.version
    });

    // Check if widget has OpenAI prompt configuration for Responses API
    if (!widget.openai || !widget.openai.promptId) {
      return res.status(400).json({ 
        error: "Widget not configured for Responses API", 
        details: "Widget must have openai.promptId field. Please update widget configuration." 
      });
    }

    // Validate prompt ID format
    if (!widget.openai.promptId.startsWith('pmpt_')) {
      return res.status(400).json({ 
        error: "Invalid prompt ID format", 
        details: "Prompt ID must start with 'pmpt_'" 
      });
    }

    // Check quota before allowing new conversations
    if (!conversationId && widget.organizationId) {
      const { checkQuota } = await import('../../lib/quota.js');
      // Convert organizationId to string to avoid ObjectId errors
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
    if (conversationId) {
      try {
        conversation = await db.collection("conversations").findOne({ 
          _id: new ObjectId(conversationId) 
        });
      } catch (error) {
        // Invalid ObjectId format, create new conversation
        conversation = null;
      }
    }
    
    if (!conversation) {
      // GDPR COMPLIANCE: Check if user has given analytics consent
      const analyticsConsent = req.headers['x-elva-consent-analytics'] === 'true';
      
      // Only collect country data if consent given
      const rawIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
      const country = analyticsConsent ? await getCountryFromIP(rawIP) : null;
      
      // Create new conversation with proper schema
      const newConversation = {
        widgetId,
        organizationId: widget.organizationId || null,
        sessionId: `session_${Date.now()}`,
        userId: userId || null,
        startTime: new Date(),
        endTime: null,
        messageCount: 0,
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
          conversationHistory: [] // Store response IDs for debugging
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const result = await db.collection("conversations").insertOne(newConversation);
      conversation = { ...newConversation, _id: result.insertedId };
      console.log('✅ New conversation created (Responses API):', conversation._id, 'Consent:', analyticsConsent);
      
      // Increment conversation quota count
      if (widget.organizationId) {
        try {
          const { incrementConversationCount } = await import('../../lib/quota.js');
          // Convert organizationId to string to avoid ObjectId errors
          const orgIdString = String(widget.organizationId);
          await incrementConversationCount(orgIdString);
        } catch (quotaError) {
          console.error('❌ Error incrementing quota:', quotaError);
          // Don't fail the conversation if quota increment fails
        }
      }
      
      // Track that this is a new conversation for analytics
      conversation.isNew = true;
    }

    // Prepare the Responses API call
    const responsePayload = {
      prompt: {
        id: widget.openai.promptId
      },
      input: imageUrl ? [
        {
          role: "user",
          content: [
            { type: "input_text", text: message },
            { type: "input_image", image_url: imageUrl }
          ]
        }
      ] : message
    };

    // Add version if specified in widget configuration
    if (widget.openai.version) {
      responsePayload.prompt.version = widget.openai.version;
    }

    // Add previous response ID for conversation continuity
    if (conversation.openai?.lastResponseId) {
      responsePayload.previous_response_id = conversation.openai.lastResponseId;
    }

    console.log('🤖 Calling OpenAI Responses API with payload:', {
      promptId: responsePayload.prompt.id,
      version: responsePayload.prompt.version || 'latest',
      hasContext: !!responsePayload.previous_response_id,
      hasImage: !!imageUrl,
      messageLength: message.length
    });

    // Call OpenAI Responses API with timing
    const startTime = Date.now();
    let aiReply, responseId, usage;

    const response = await openai.responses.create(responsePayload);

    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Raw OpenAI response (dev):', JSON.stringify(response, null, 2));
    }

    ({ aiReply, responseId, usage } = extractResponseData(response));

    const responseTime = Date.now() - startTime;

    console.log('✅ OpenAI Responses API success:', {
      responseId: responseId,
      replyLength: aiReply.length,
      usage: usage,
      hadImage: !!imageUrl
    });

    // Add user message to conversation
    const userMessage = {
      id: new ObjectId().toString(),
      type: "user",
      content: message,
      imageUrl: imageUrl || null,
      timestamp: new Date(),
      responseTime: null,
      tokens: null
    };
    conversation.messages.push(userMessage);

    // Add AI response to conversation
    const aiMessage = {
      id: new ObjectId().toString(),
      type: "assistant",
      content: aiReply,
      timestamp: new Date(),
      responseTime: responseTime,
      tokens: usage?.total_tokens || null,
      openai: {
        responseId: responseId,
        usage: usage,
        promptId: widget.openai.promptId,
        promptVersion: widget.openai.version || 'latest'
      }
    };
    conversation.messages.push(aiMessage);

    // Update conversation history tracking
    if (!conversation.openai) {
      conversation.openai = {
        lastResponseId: null,
        conversationHistory: []
      };
    }
    if (!conversation.openai.conversationHistory) {
      conversation.openai.conversationHistory = [];
    }
    conversation.openai.conversationHistory.push(responseId);
    conversation.openai.lastResponseId = responseId;

    conversation.messageCount = conversation.messages.length;
    conversation.updatedAt = new Date();

    // Update conversation in database
    await db.collection("conversations").updateOne(
      { _id: conversation._id },
      { 
        $set: { 
          messages: conversation.messages,
          messageCount: conversation.messageCount,
          updatedAt: conversation.updatedAt,
          "openai.lastResponseId": conversation.openai.lastResponseId,
          "openai.conversationHistory": conversation.openai.conversationHistory
        } 
      }
    );
    console.log(
      '📝 Conversation updated (Responses API):',
      conversation._id,
      'Messages:',
      conversation.messages.length,
      'Response time:',
      responseTime + 'ms',
      `(${(responseTime / 1000).toFixed(2)}s)`
    );

    res.json({ 
      reply: aiReply,
      conversationId: conversation._id.toString(),
      metadata: {
        responseId: responseId,
        promptId: widget.openai.promptId,
        promptVersion: widget.openai.version || 'latest',
        usage: usage
      }
    });

    updateAnalyticsAsync(db, widgetId, conversation, conversation.isNew);

  } catch (error) {
    console.error('❌ Error in /api/respond (Responses API):', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      widgetId: req.body.widgetId,
      hasImage: !!req.body.imageUrl
    });
    
    // Provide more specific error messages for common issues
    let errorMessage = 'Internal server error';
    let errorDetails = undefined;
    
    if (error.message?.includes('prompt not found')) {
      errorMessage = 'Prompt ID not found';
      errorDetails = 'The prompt ID configured for this widget was not found on OpenAI platform';
    } else if (error.message?.includes('insufficient credits')) {
      errorMessage = 'OpenAI API credits insufficient';
      errorDetails = 'Please check your OpenAI account credits';
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'Rate limit exceeded';
      errorDetails = 'Too many requests to OpenAI API';
    } else if (error.message?.includes('vision') || error.message?.includes('image') || error.message?.includes('multimodal')) {
      errorMessage = 'Vision not enabled';
      errorDetails = 'Your OpenAI prompt/assistant does not have vision capabilities enabled. Please enable vision on platform.openai.com';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? (errorDetails || error.message) : errorDetails
    });
  }
}

function extractResponseData(response) {
  if (!response) {
    throw new Error('No response received from OpenAI Responses API');
  }

  let aiReply = null;

  if (typeof response.output_text === 'string' && response.output_text.trim().length > 0) {
    aiReply = response.output_text;
  } else if (Array.isArray(response.output)) {
    const messageOutput = response.output.find(output => output.type === 'message');

    if (messageOutput && Array.isArray(messageOutput.content)) {
      const textContent = messageOutput.content.find(
        contentItem => contentItem?.type === 'output_text' || contentItem?.type === 'text'
      );
      if (textContent) {
        aiReply = textContent.text || textContent.content || '';
      }

      if (!aiReply && messageOutput.content[0]) {
        const firstContent = messageOutput.content[0];
        if (typeof firstContent === 'string') {
          aiReply = firstContent;
        } else if (typeof firstContent.text === 'string') {
          aiReply = firstContent.text;
        }
      }
    }

    if (!aiReply) {
      const outputText = response.output.find(output => output.type === 'output_text');
      if (outputText && typeof outputText.text === 'string') {
        aiReply = outputText.text;
      }
    }
  }

  if (!aiReply || aiReply.length === 0) {
    throw new Error('No message output found in Responses API response');
  }

  const responseId = response.id || `resp_${Date.now()}`;
  const usage = response.usage || { total_tokens: 0 };

  return { aiReply, responseId, usage };
}

// Helper function to update analytics
async function updateAnalytics(db, widgetId, conversation, isNewConversation = false) {
  const analytics = db.collection('analytics');
  const baseDate = conversation.startTime || conversation.createdAt || new Date();
  const date = new Date(baseDate);
  const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
  
  // IMPORTANT: Always convert widgetId to string for consistency
  const agentIdString = typeof widgetId === 'object' ? widgetId.toString() : String(widgetId);
  
  // Calculate metrics for this conversation
  const messageCount = conversation.messageCount || conversation.messages?.length || 0;
  const responseTimes = conversation.messages?.filter(m => m.responseTime && m.type === 'assistant').map(m => m.responseTime) || [];
  const avgResponseTime = responseTimes.length > 0 
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
    : 0;
  
  // Only count conversations that have:
  // 1. At least one message (messageCount > 0)
  // 2. At least one assistant message (handled by OpenAI API)
  const hasAssistantMessage = conversation.messages?.some(msg => msg.type === 'assistant') || false;
  const shouldCountConversation = isNewConversation && messageCount > 0 && hasAssistantMessage;
  
  const sessionId = conversation.sessionId ? String(conversation.sessionId) : null;
  const hourKey = date.getHours().toString();

  // Get or create analytics document for this day
  const existingDoc = await analytics.findOne({ 
    agentId: agentIdString, 
    date: new Date(dateKey) 
  });
  
  if (existingDoc) {
    // Update existing document
    const updates = {
      $inc: {
        'metrics.messages': messageCount
      },
      $set: {
        'metrics.avgResponseTime': Math.round(((existingDoc.metrics?.avgResponseTime || 0) + avgResponseTime) / 2),
        [`hourly.${hourKey}`]: ((existingDoc.hourly && existingDoc.hourly[hourKey]) || 0) + 1,
        updatedAt: new Date()
      }
    };

    if (shouldCountConversation) {
      updates.$inc['metrics.conversations'] = 1;
    }

    if (sessionId) {
      const alreadyCounted = Array.isArray(existingDoc.sessionIds) && existingDoc.sessionIds.includes(sessionId);
      if (!alreadyCounted) {
        updates.$addToSet = { sessionIds: sessionId };
        updates.$inc['metrics.uniqueUsers'] = 1;
      }
    }

    await analytics.updateOne(
      { _id: existingDoc._id },
      updates
    );
  } else {
    // Create new analytics document
    const hourly = Array(24).fill(0);
    hourly[date.getHours()] = 1;
    const uniqueUsersCount = sessionId ? 1 : 0;
    
    await analytics.insertOne({
      agentId: agentIdString,
      date: new Date(dateKey),
      metrics: {
        conversations: shouldCountConversation ? 1 : 0,
        messages: messageCount,
        uniqueUsers: uniqueUsersCount,
        responseRate: 100,
        avgResponseTime: Math.round(avgResponseTime),
        satisfaction: null
      },
      hourly: hourly.reduce((acc, count, hour) => {
        acc[hour.toString()] = count;
        return acc;
      }, {}),
      sessionIds: sessionId ? [sessionId] : [],
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  console.log('📊 Analytics updated for', agentIdString, 'on', dateKey, shouldCountConversation ? '(counted conversation)' : '(did not count conversation)');
}

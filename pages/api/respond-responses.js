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
    const widget = await db.collection("widgets").findOne({ _id: queryId });
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
      const quotaCheck = await checkQuota(widget.organizationId);
      
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
          await incrementConversationCount(widget.organizationId);
        } catch (quotaError) {
          console.error('❌ Error incrementing quota:', quotaError);
          // Don't fail the conversation if quota increment fails
        }
      }
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
            { type: "text", text: message },
            { type: "image_url", image_url: { url: imageUrl } }
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
    const response = await openai.responses.create(responsePayload);
    const responseTime = Date.now() - startTime;

    console.log('🔍 Raw OpenAI response structure:', JSON.stringify(response, null, 2));

    // Extract response data from Responses API structure
    let aiReply, responseId, usage;
    
    // The Responses API has a direct output_text field for the final response
    if (response.output_text) {
      aiReply = response.output_text;
    } else if (response.output && Array.isArray(response.output)) {
      // Find the message output (type: 'message')
      const messageOutput = response.output.find(output => output.type === 'message');
      if (messageOutput && messageOutput.content && messageOutput.content[0]) {
        aiReply = messageOutput.content[0].text;
      } else {
        throw new Error('No message output found in Responses API response');
      }
    } else {
      throw new Error('Unexpected response structure from OpenAI Responses API');
    }
    
    responseId = response.id || `resp_${Date.now()}`;
    usage = response.usage || { total_tokens: 0 };

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
    if (!conversation.openai.conversationHistory) {
      conversation.openai.conversationHistory = [];
    }
    conversation.openai.conversationHistory.push(responseId);

    // Update conversation in database
    await db.collection("conversations").updateOne(
      { _id: conversation._id },
      { 
        $set: { 
          messages: conversation.messages,
          messageCount: conversation.messages.length,
          updatedAt: new Date(),
          "openai.lastResponseId": responseId,
          "openai.conversationHistory": conversation.openai.conversationHistory
        } 
      }
    );
    console.log('📝 Conversation updated (Responses API):', conversation._id, 'Messages:', conversation.messages.length, 'Response time:', responseTime + 'ms');

    // Update analytics after successful conversation
    try {
      await updateAnalytics(db, widgetId, conversation);
    } catch (analyticsError) {
      console.error('Analytics update error:', analyticsError);
      // Don't fail the response if analytics update fails
    }

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

  } catch (error) {
    console.error('❌ Error in /api/respond (Responses API):', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      widgetId: req.body.widgetId,
      hasImage: !!req.body.imageUrl,
      promptId: widget?.openai?.promptId
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

// Helper function to update analytics
async function updateAnalytics(db, widgetId, conversation) {
  const analytics = db.collection('analytics');
  const date = new Date(conversation.startTime);
  const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
  
  // IMPORTANT: Always convert widgetId to string for consistency
  const agentIdString = typeof widgetId === 'object' ? widgetId.toString() : String(widgetId);
  
  // Calculate metrics for this conversation
  const messageCount = conversation.messageCount || conversation.messages?.length || 0;
  const responseTimes = conversation.messages?.filter(m => m.responseTime).map(m => m.responseTime) || [];
  const avgResponseTime = responseTimes.length > 0 
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
    : 0;
  
  // Calculate unique users for this widget on this date
  const uniqueUsersToday = await db.collection('conversations').distinct('sessionId', {
    widgetId: widgetId,
    createdAt: {
      $gte: new Date(dateKey),
      $lt: new Date(new Date(dateKey).getTime() + 24 * 60 * 60 * 1000)
    }
  });
  
  // Get or create analytics document for this day
  const existingDoc = await analytics.findOne({ 
    agentId: agentIdString, 
    date: new Date(dateKey) 
  });
  
  if (existingDoc) {
    // Update existing document
    await analytics.updateOne(
      { _id: existingDoc._id },
      {
        $inc: {
          'metrics.conversations': 1,
          'metrics.messages': messageCount
        },
        $set: {
          'metrics.avgResponseTime': Math.round((existingDoc.metrics.avgResponseTime + avgResponseTime) / 2),
          'metrics.uniqueUsers': uniqueUsersToday.length, // Update with actual count
          [`hourly.${date.getHours()}`]: (existingDoc.hourly[date.getHours().toString()] || 0) + 1
        }
      }
    );
  } else {
    // Create new analytics document
    const hourly = Array(24).fill(0);
    hourly[date.getHours()] = 1;
    
    await analytics.insertOne({
      agentId: agentIdString,
      date: new Date(dateKey),
      metrics: {
        conversations: 1,
        messages: messageCount,
        uniqueUsers: uniqueUsersToday.length, // Use actual count
        responseRate: 100,
        avgResponseTime: Math.round(avgResponseTime),
        satisfaction: null
      },
      hourly: hourly.reduce((acc, count, hour) => {
        acc[hour.toString()] = count;
        return acc;
      }, {}),
      createdAt: new Date()
    });
  }
  
  console.log('📊 Analytics updated for', agentIdString, 'on', dateKey, 'with', uniqueUsersToday.length, 'unique users');
}

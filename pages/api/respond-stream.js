import OpenAI from "openai";
import { ObjectId } from "mongodb";
import clientPromise from "../../lib/mongodb";
import { getCountryFromIP } from "../../lib/privacy";
import { widgetLimiter, runMiddleware } from "../../lib/rate-limit";

// Set environment variable to handle SSL certificate issues in development
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000, // 60 second timeout for streaming
  maxRetries: 2
});

// Disable body parser for streaming - Next.js specific
export const config = {
  api: {
    bodyParser: true, // We still need body parser for POST body
  },
};

export default async function handler(req, res) {
  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-elva-consent-analytics, x-elva-consent-functional');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Apply rate limiting
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

    if (!widgetId || !message || !userId) {
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
      return res.status(404).json({ error: "Widget not found" });
    }

    // Check quota before allowing new conversations
    if (!conversationId && widget.organizationId) {
      const { checkQuota } = await import('../../lib/quota.js');
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
    let isNewConversation = false;
    
    if (conversationId) {
      try {
        conversation = await db.collection("conversations").findOne({ 
          _id: new ObjectId(conversationId) 
        });
      } catch (error) {
        conversation = null;
      }
    }
    
    if (!conversation) {
      isNewConversation = true;
      const analyticsConsent = req.headers['x-elva-consent-analytics'] === 'true';
      const rawIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
      const country = analyticsConsent ? await getCountryFromIP(rawIP) : null;
      
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
          country: country,
          referrer: analyticsConsent ? (req.headers['referer'] || null) : null,
          consentGiven: analyticsConsent
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const result = await db.collection("conversations").insertOne(newConversation);
      conversation = { ...newConversation, _id: result.insertedId };
      
      // Increment conversation quota count
      if (widget.organizationId) {
        try {
          const { incrementConversationCount } = await import('../../lib/quota.js');
          const orgIdString = String(widget.organizationId);
          await incrementConversationCount(orgIdString);
        } catch (quotaError) {
          console.error('❌ Error incrementing quota:', quotaError);
        }
      }
    }

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

    // Set headers for Server-Sent Events streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Send conversation ID first so client knows which conversation this belongs to
    res.write(`data: ${JSON.stringify({ 
      type: 'conversation', 
      conversationId: conversation._id.toString() 
    })}\n\n`);

    // Determine which API to use based on widget configuration
    const useResponsesApi = widget.openai?.promptId;
    
    const startTime = Date.now();
    let fullResponse = '';
    let responseId = `resp_${Date.now()}`;
    let usage = { total_tokens: 0 };

    if (useResponsesApi) {
      // Use Responses API with streaming
      const responsePayload = {
        prompt: { id: widget.openai.promptId },
        input: imageUrl ? [
          {
            role: "user",
            content: [
              { type: "input_text", text: message },
              { type: "input_image", image_url: imageUrl }
            ]
          }
        ] : message,
        stream: true
      };

      if (widget.openai.version) {
        responsePayload.prompt.version = widget.openai.version;
      }

      if (conversation.openai?.lastResponseId) {
        responsePayload.previous_response_id = conversation.openai.lastResponseId;
      }

      console.log('🚀 Starting Responses API streaming...');
      const stream = await openai.responses.create(responsePayload);

      for await (const event of stream) {
        // Handle different event types from Responses API streaming
        if (event.type === 'response.output_text.delta') {
          const delta = event.delta || '';
          if (delta) {
            fullResponse += delta;
            res.write(`data: ${JSON.stringify({ type: 'delta', content: delta })}\n\n`);
          }
        } else if (event.type === 'response.done' && event.response) {
          responseId = event.response.id || responseId;
          usage = event.response.usage || usage;
        } else if (event.type === 'response.created' && event.response) {
          responseId = event.response.id || responseId;
        }
      }
    } else {
      // Use Chat Completions API with streaming
      const conversationInput = [
        { role: "system", content: widget.prompt || "You are a helpful assistant." },
        ...conversation.messages.map(msg => ({
          role: msg.type === "user" ? "user" : "assistant",
          content: msg.content
        }))
      ];

      console.log('🚀 Starting Chat Completions API streaming...');
      const stream = await openai.chat.completions.create({
        model: widget.model || "gpt-4o-mini",
        messages: conversationInput,
        max_tokens: widget.maxTokens || 500,
        temperature: widget.temperature || 0.7,
        stream: true
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          fullResponse += delta;
          res.write(`data: ${JSON.stringify({ type: 'delta', content: delta })}\n\n`);
        }
        
        // Capture usage from final chunk if available
        if (chunk.usage) {
          usage = chunk.usage;
        }
      }
    }

    const responseTime = Date.now() - startTime;

    // Add AI response to conversation
    const aiMessage = {
      id: new ObjectId().toString(),
      type: "assistant",
      content: fullResponse,
      timestamp: new Date(),
      responseTime: responseTime,
      tokens: usage?.total_tokens || null,
      streamed: true
    };

    // Add OpenAI metadata if using Responses API
    if (useResponsesApi) {
      aiMessage.openai = {
        responseId: responseId,
        usage: usage,
        promptId: widget.openai.promptId,
        promptVersion: widget.openai.version || 'latest'
      };
    }

    conversation.messages.push(aiMessage);

    // Update conversation in database
    const updateData = { 
      messages: conversation.messages,
      messageCount: conversation.messages.length,
      updatedAt: new Date()
    };

    // Add Responses API specific fields
    if (useResponsesApi) {
      updateData["openai.lastResponseId"] = responseId;
      if (!conversation.openai?.conversationHistory) {
        updateData["openai.conversationHistory"] = [responseId];
      } else {
        updateData["openai.conversationHistory"] = [...(conversation.openai.conversationHistory || []), responseId];
      }
    }

    await db.collection("conversations").updateOne(
      { _id: conversation._id },
      { $set: updateData }
    );

    console.log('📝 Streaming complete. Total response:', fullResponse.length, 'chars in', responseTime + 'ms');

    // Update analytics
    try {
      await updateAnalytics(db, widgetId, conversation, isNewConversation);
    } catch (analyticsError) {
      console.error('Analytics update error:', analyticsError);
    }

    // Send completion event
    res.write(`data: ${JSON.stringify({ 
      type: 'done', 
      conversationId: conversation._id.toString(),
      metadata: useResponsesApi ? {
        responseId: responseId,
        promptId: widget.openai.promptId,
        promptVersion: widget.openai.version || 'latest',
        usage: usage
      } : { usage }
    })}\n\n`);

    res.end();

  } catch (error) {
    console.error('❌ Error in /api/respond-stream:', error);
    
    // Try to send error as SSE event if headers already sent
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        error: error.message || 'An error occurred during streaming'
      })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

// Helper function to update analytics (copied from respond.js)
async function updateAnalytics(db, widgetId, conversation, isNewConversation = false) {
  const analytics = db.collection('analytics');
  const date = new Date(conversation.startTime);
  const dateKey = date.toISOString().split('T')[0];
  
  const agentIdString = typeof widgetId === 'object' ? widgetId.toString() : String(widgetId);
  
  const messageCount = conversation.messageCount || conversation.messages?.length || 0;
  const responseTimes = conversation.messages?.filter(m => m.responseTime && m.type === 'assistant').map(m => m.responseTime) || [];
  const avgResponseTime = responseTimes.length > 0 
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
    : 0;
  
  const hasAssistantMessage = conversation.messages?.some(msg => msg.type === 'assistant') || false;
  const shouldCountConversation = isNewConversation && messageCount > 0 && hasAssistantMessage;
  
  const uniqueUsersToday = await db.collection('conversations').distinct('sessionId', {
    widgetId: widgetId,
    createdAt: {
      $gte: new Date(dateKey),
      $lt: new Date(new Date(dateKey).getTime() + 24 * 60 * 60 * 1000)
    },
    messageCount: { $gt: 0 },
    'messages.type': 'assistant'
  });
  
  const existingDoc = await analytics.findOne({ 
    agentId: agentIdString, 
    date: new Date(dateKey) 
  });
  
  if (existingDoc) {
    await analytics.updateOne(
      { _id: existingDoc._id },
      {
        $inc: {
          'metrics.conversations': shouldCountConversation ? 1 : 0,
          'metrics.messages': messageCount
        },
        $set: {
          'metrics.avgResponseTime': Math.round((existingDoc.metrics.avgResponseTime + avgResponseTime) / 2),
          'metrics.uniqueUsers': uniqueUsersToday.length,
          [`hourly.${date.getHours()}`]: (existingDoc.hourly[date.getHours().toString()] || 0) + 1
        }
      }
    );
  } else {
    const hourly = Array(24).fill(0);
    hourly[date.getHours()] = 1;
    
    await analytics.insertOne({
      agentId: agentIdString,
      date: new Date(dateKey),
      metrics: {
        conversations: shouldCountConversation ? 1 : 0,
        messages: messageCount,
        uniqueUsers: uniqueUsersToday.length,
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
}


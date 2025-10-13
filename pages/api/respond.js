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
  timeout: 30000, // 30 second timeout
  maxRetries: 2
});

export default async function handler(req, res) {
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
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const result = await db.collection("conversations").insertOne(newConversation);
      conversation = { ...newConversation, _id: result.insertedId };
      console.log('✅ New conversation created:', conversation._id, 'Consent:', analyticsConsent);
    }

    // Add user message to conversation
    const userMessage = {
      id: new ObjectId().toString(),
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
      id: new ObjectId().toString(),
      type: "assistant",
      content: aiReply,
      timestamp: new Date(),
      responseTime: responseTime,
      tokens: response.usage?.total_tokens || null
    };
    conversation.messages.push(aiMessage);

    // Update conversation in database
    await db.collection("conversations").updateOne(
      { _id: conversation._id },
      { 
        $set: { 
          messages: conversation.messages,
          messageCount: conversation.messages.length,
          updatedAt: new Date() 
        } 
      }
    );
    console.log('📝 Conversation updated:', conversation._id, 'Messages:', conversation.messages.length, 'Response time:', responseTime + 'ms');

    // Update analytics after successful conversation
    try {
      await updateAnalytics(db, widgetId, conversation);
    } catch (analyticsError) {
      console.error('Analytics update error:', analyticsError);
      // Don't fail the response if analytics update fails
    }

    res.json({ 
      reply: aiReply,
      conversationId: conversation._id.toString()
    });

  } catch (error) {
    console.error('Error in /api/respond:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Helper function to update analytics
async function updateAnalytics(db, widgetId, conversation) {
  const analytics = db.collection('analytics');
  const date = new Date(conversation.startTime);
  const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Calculate metrics for this conversation
  const messageCount = conversation.messageCount || conversation.messages?.length || 0;
  const responseTimes = conversation.messages?.filter(m => m.responseTime).map(m => m.responseTime) || [];
  const avgResponseTime = responseTimes.length > 0 
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
    : 0;
  
  // Get or create analytics document for this day
  const existingDoc = await analytics.findOne({ 
    agentId: widgetId, 
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
          [`hourly.${date.getHours()}`]: (existingDoc.hourly[date.getHours().toString()] || 0) + 1
        }
      }
    );
  } else {
    // Create new analytics document
    const hourly = Array(24).fill(0);
    hourly[date.getHours()] = 1;
    
    await analytics.insertOne({
      agentId: widgetId,
      date: new Date(dateKey),
      metrics: {
        conversations: 1,
        messages: messageCount,
        uniqueUsers: 1,
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
  
  console.log('📊 Analytics updated for', widgetId, 'on', dateKey);
}

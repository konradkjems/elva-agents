import OpenAI from "openai";
import { ObjectId } from "mongodb";
import clientPromise from "../../lib/mongodb";

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

  try {
    const { widgetId, message, userId, conversationId } = req.body;

    if (!widgetId || !message || !userId) {
      return res.status(400).json({ error: 'Missing required fields: widgetId, message, userId' });
    }

    const client = await clientPromise;
    const db = client.db("chatwidgets");
    
    // Get widget configuration
    const widget = await db.collection("widgets").findOne({ _id: widgetId });
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
      // Create new conversation
      const newConversation = {
        widgetId,
        userId,
        sessionId: `session_${Date.now()}`,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const result = await db.collection("conversations").insertOne(newConversation);
      conversation = { ...newConversation, _id: result.insertedId };
    }

    // Add user message to conversation
    const userMessage = {
      role: "user",
      content: message,
      timestamp: new Date()
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

    // Get AI response
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: conversationInput,
      max_tokens: 200,
      temperature: 0.7
    });

    const aiReply = response.choices[0].message.content;

    // Add AI response to conversation
    const aiMessage = {
      role: "assistant",
      content: aiReply,
      timestamp: new Date()
    };
    conversation.messages.push(aiMessage);

    // Update conversation in database
    await db.collection("conversations").updateOne(
      { _id: conversation._id },
      { 
        $set: { 
          messages: conversation.messages, 
          updatedAt: new Date() 
        } 
      }
    );

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

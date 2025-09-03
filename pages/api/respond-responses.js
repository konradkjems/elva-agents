import OpenAI from "openai";
import { ObjectId } from "mongodb";
import clientPromise from "../../lib/mongodb";

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
      // Create new conversation with Responses API structure
      const newConversation = {
        widgetId,
        userId,
        sessionId: `session_${Date.now()}`,
        openai: {
          lastResponseId: null,
          conversationHistory: [] // Store response IDs for debugging
        },
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const result = await db.collection("conversations").insertOne(newConversation);
      conversation = { ...newConversation, _id: result.insertedId };
    }

    // Prepare the Responses API call
    const responsePayload = {
      prompt: {
        id: widget.openai.promptId
      },
      input: message
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
      messageLength: message.length
    });

    // Call OpenAI Responses API
    const response = await openai.responses.create(responsePayload);

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
      usage: usage
    });

    // Add user message to conversation
    const userMessage = {
      role: "user",
      content: message,
      timestamp: new Date()
    };
    conversation.messages.push(userMessage);

    // Add AI response to conversation
    const aiMessage = {
      role: "assistant",
      content: aiReply,
      timestamp: new Date(),
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
          updatedAt: new Date(),
          "openai.lastResponseId": responseId,
          "openai.conversationHistory": conversation.openai.conversationHistory
        } 
      }
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

  } catch (error) {
    console.error('❌ Error in /api/respond (Responses API):', error);
    
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
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? (errorDetails || error.message) : errorDetails
    });
  }
}

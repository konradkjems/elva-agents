import { ObjectId } from 'mongodb';
import clientPromise from '../../../lib/mongodb';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { conversationId, message } = req.body;

    if (!conversationId || !message) {
      return res.status(400).json({ error: 'conversationId and message are required' });
    }

    const client = await clientPromise;
    const db = client.db('elva-agents');

    // Get conversation
    const conversation = await db.collection('conversations').findOne({
      _id: new ObjectId(conversationId)
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Verify live chat is active
    if (conversation.liveChat?.status !== 'active') {
      return res.status(400).json({ 
        error: 'Live chat is not active',
        status: conversation.liveChat?.status || 'ai'
      });
    }

    // Create user message
    const userMessage = {
      id: new ObjectId().toString(),
      type: 'user',
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    // Add message to conversation
    await db.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      {
        $push: { messages: userMessage },
        $inc: { messageCount: 1 },
        $set: { updatedAt: new Date() }
      }
    );

    // Broadcast to SSE connections
    try {
      const { broadcastToConversation } = await import('./stream');
      const convId = conversationId.toString();
      broadcastToConversation(convId, {
        type: 'message',
        conversationId: convId,
        message: userMessage
      });
    } catch (error) {
      console.error('Error broadcasting message:', error);
      // Don't fail the request if broadcast fails
    }

    res.status(200).json({
      success: true,
      message: userMessage
    });

  } catch (error) {
    console.error('Error saving user message:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}


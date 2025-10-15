import clientPromise from '../../../lib/mongodb.js';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('elva-agents');
    const conversations = db.collection('conversations');

    const {
      conversationId,
      message,
      responseTime,
      tokens,
      widgetId,
      sessionId
    } = req.body;

    if (!conversationId && !sessionId) {
      return res.status(400).json({ 
        error: 'Either conversationId or sessionId is required' 
      });
    }

    // Find conversation by ID or sessionId
    let conversation;
    if (conversationId) {
      conversation = await conversations.findOne({ 
        _id: new ObjectId(conversationId) 
      });
    } else {
      conversation = await conversations.findOne({ 
        sessionId: sessionId,
        widgetId: widgetId,
        endTime: null // Only active conversations
      });
    }

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Add message to conversation
    const newMessage = {
      id: new ObjectId().toString(),
      type: message.type, // 'user' or 'assistant'
      content: message.content,
      timestamp: new Date(),
      responseTime: responseTime || null,
      tokens: tokens || null
    };

    // Update conversation
    const updateData = {
      messages: [...conversation.messages, newMessage],
      messageCount: conversation.messageCount + 1,
      updatedAt: new Date()
    };

    // If this is an assistant message and it's the first one, mark conversation as active
    if (message.type === 'assistant' && conversation.messageCount === 0) {
      updateData.status = 'active';
    }

    await conversations.updateOne(
      { _id: conversation._id },
      { $set: updateData }
    );

    return res.status(200).json({
      success: true,
      messageId: newMessage.id,
      conversationId: conversation._id
    });

  } catch (error) {
    console.error('Error tracking message:', error);
    return res.status(500).json({ error: 'Failed to track message' });
  }
}

import { ObjectId } from 'mongodb';
import clientPromise from '../../../lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
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

    // Get user
    const user = await db.collection('users').findOne({ 
      email: session.user.email 
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get conversation
    const conversation = await db.collection('conversations').findOne({
      _id: new ObjectId(conversationId)
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Verify user is the agent for this conversation
    if (conversation.liveChat?.status !== 'active' || 
        conversation.liveChat?.acceptedBy?.toString() !== user._id.toString()) {
      return res.status(403).json({ 
        error: 'You are not the active agent for this conversation' 
      });
    }

    // Get agent info
    const agentInfo = conversation.liveChat?.agentInfo || {
      displayName: user.agentProfile?.displayName || user.name || user.email.split('@')[0],
      title: user.agentProfile?.title || 'Support Agent',
      avatarUrl: user.agentProfile?.avatarUrl || null
    };

    // Create agent message
    const agentMessage = {
      id: new ObjectId().toString(),
      type: 'agent',
      role: 'agent',
      content: message,
      timestamp: new Date(),
      agentInfo: agentInfo
    };

    // Add message to conversation
    await db.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      {
        $push: { messages: agentMessage },
        $inc: { messageCount: 1 },
        $set: { updatedAt: new Date() }
      }
    );

    // Broadcast to SSE connections
    try {
      const { broadcastToConversation } = await import('./stream');
      broadcastToConversation(conversationId, {
        type: 'message',
        conversationId,
        message: agentMessage
      });
    } catch (error) {
      console.error('Error broadcasting message:', error);
      // Don't fail the request if broadcast fails
    }

    res.status(200).json({
      success: true,
      message: agentMessage
    });

  } catch (error) {
    console.error('Error sending agent message:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}


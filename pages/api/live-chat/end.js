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
    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId is required' });
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

    // Verify user is the agent for this conversation (or allow admin/owner)
    const widget = await db.collection('widgets').findOne({
      _id: conversation.widgetId
    });

    if (!widget || !widget.organizationId) {
      return res.status(404).json({ error: 'Widget or organization not found' });
    }

    const membership = await db.collection('team_members').findOne({
      userId: user._id,
      organizationId: widget.organizationId,
      status: 'active'
    });

    if (!membership) {
      return res.status(403).json({ error: 'You do not have access to this organization' });
    }

    // Check if user is the agent or has admin/owner role
    const isAgent = conversation.liveChat?.acceptedBy?.toString() === user._id.toString();
    const isAdmin = membership.role === 'admin' || membership.role === 'owner';

    if (!isAgent && !isAdmin) {
      return res.status(403).json({ 
        error: 'You are not authorized to end this conversation' 
      });
    }

    // Update conversation
    const updateResult = await db.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      {
        $set: {
          'liveChat.status': 'ended',
          'liveChat.endedAt': new Date(),
          updatedAt: new Date()
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(500).json({ error: 'Failed to end conversation' });
    }

    // Remove from agent's active chats
    if (isAgent) {
      await db.collection('users').updateOne(
        { _id: user._id },
        {
          $pull: {
            'agentProfile.currentActiveChats': conversationId
          }
        }
      );
    }

    // Add ending message
    const endMessage = {
      id: new ObjectId().toString(),
      type: 'system',
      role: 'system',
      content: 'Live chat er afsluttet. Du kan fortsætte med at chatte med AI\'en, eller starte en ny samtale.',
      timestamp: new Date()
    };

    await db.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      {
        $push: { messages: endMessage },
        $inc: { messageCount: 1 },
        $set: { updatedAt: new Date() }
      }
    );

    // Broadcast status change and end message to SSE connections
    try {
      const { broadcastToConversation } = await import('./stream');
      broadcastToConversation(conversationId, {
        type: 'status',
        conversationId,
        status: 'ended'
      });
      broadcastToConversation(conversationId, {
        type: 'message',
        conversationId,
        message: endMessage
      });
    } catch (error) {
      console.error('Error broadcasting end:', error);
      // Don't fail the request if broadcast fails
    }

    res.status(200).json({
      success: true,
      conversationId: conversationId,
      status: 'ended'
    });

  } catch (error) {
    console.error('Error ending live chat:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}


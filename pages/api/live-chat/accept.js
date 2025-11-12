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

    // Check if user has agent profile and is available
    if (!user.agentProfile?.isAvailable) {
      return res.status(403).json({ 
        error: 'You are not available as an agent. Please update your agent profile settings.' 
      });
    }

    // Get conversation
    const conversation = await db.collection('conversations').findOne({
      _id: new ObjectId(conversationId)
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Check if already accepted by someone else
    if (conversation.liveChat?.status === 'active' && conversation.liveChat?.acceptedBy) {
      if (conversation.liveChat.acceptedBy.toString() !== user._id.toString()) {
        return res.status(409).json({ 
          error: 'This chat has already been accepted by another agent',
          acceptedBy: conversation.liveChat.acceptedBy
        });
      }
      // Already accepted by this user, return success
      return res.status(200).json({
        success: true,
        conversationId: conversationId,
        status: 'active'
      });
    }

    // Verify conversation is in requested status
    if (conversation.liveChat?.status !== 'requested') {
      return res.status(400).json({ 
        error: 'Conversation is not in requested status',
        currentStatus: conversation.liveChat?.status
      });
    }

    // Verify user has access to this conversation's organization
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

    // Prepare agent info
    const agentInfo = {
      displayName: user.agentProfile?.displayName || user.name || user.email.split('@')[0],
      title: user.agentProfile?.title || 'Support Agent',
      avatarUrl: user.agentProfile?.avatarUrl || null
    };

    // Update conversation
    const updateResult = await db.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      {
        $set: {
          'liveChat.status': 'active',
          'liveChat.acceptedAt': new Date(),
          'liveChat.acceptedBy': user._id,
          'liveChat.agentInfo': agentInfo,
          updatedAt: new Date()
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(500).json({ error: 'Failed to accept conversation' });
    }

    // Add agent info to user's active chats
    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $addToSet: {
          'agentProfile.currentActiveChats': conversationId
        }
      }
    );

    // Add welcome message from agent
    const welcomeMessage = {
      id: new ObjectId().toString(),
      type: 'agent',
      role: 'agent',
      content: `Hej! Jeg er ${agentInfo.displayName}${agentInfo.title ? ` - ${agentInfo.title}` : ''}. Hvordan kan jeg hjælpe dig?`,
      timestamp: new Date(),
      agentInfo: agentInfo
    };

    await db.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      {
        $push: { messages: welcomeMessage },
        $inc: { messageCount: 1 },
        $set: { updatedAt: new Date() }
      }
    );

    // Broadcast status change and welcome message to SSE connections
    try {
      const { broadcastToConversation } = await import('./stream');
      broadcastToConversation(conversationId, {
        type: 'status',
        conversationId,
        status: 'active',
        agentInfo: agentInfo
      });
      broadcastToConversation(conversationId, {
        type: 'message',
        conversationId,
        message: welcomeMessage
      });
    } catch (error) {
      console.error('Error broadcasting accept:', error);
      // Don't fail the request if broadcast fails
    }

    res.status(200).json({
      success: true,
      conversationId: conversationId,
      status: 'active',
      agentInfo: agentInfo
    });

  } catch (error) {
    console.error('Error accepting live chat:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}


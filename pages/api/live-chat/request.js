import { ObjectId } from 'mongodb';
import clientPromise from '../../../lib/mongodb';
import { sendLiveChatRequestEmail } from '../../../lib/email';

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
    const { conversationId, handoffReason } = req.body;

    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId is required' });
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

    // Check if already requested or active
    if (conversation.liveChat?.status === 'requested' || conversation.liveChat?.status === 'active') {
      return res.status(400).json({ 
        error: 'Live chat already requested or active',
        status: conversation.liveChat.status
      });
    }

    // Get widget to find organization
    const widget = await db.collection('widgets').findOne({
      _id: conversation.widgetId
    });

    if (!widget || !widget.organizationId) {
      return res.status(404).json({ error: 'Widget or organization not found' });
    }

    // Update conversation with live chat request
    const updateResult = await db.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      {
        $set: {
          'liveChat.status': 'requested',
          'liveChat.requestedAt': new Date(),
          'liveChat.handoffReason': handoffReason || null,
          updatedAt: new Date()
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(500).json({ error: 'Failed to update conversation' });
    }

    // Get organization and available agents
    const organization = await db.collection('organizations').findOne({
      _id: new ObjectId(widget.organizationId)
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Get all team members who are agents
    const teamMembers = await db.collection('team_members').find({
      organizationId: new ObjectId(widget.organizationId),
      status: 'active'
    }).toArray();

    const userIds = teamMembers.map(m => m.userId);
    
    // Get users with agent profiles who are available
    const agents = await db.collection('users').find({
      _id: { $in: userIds },
      'agentProfile.isAvailable': true
    }).toArray();

    // Send email notifications to all available agents
    if (agents.length > 0 && organization.settings?.supportEmail) {
      const conversationMessages = conversation.messages || [];
      const firstUserMessage = conversationMessages.find(m => m.type === 'user' || m.role === 'user');
      
      try {
        await sendLiveChatRequestEmail({
          agentEmails: agents.map(a => a.email).filter(Boolean),
          widgetName: widget.name || 'Widget',
          organizationName: organization.name,
          conversationId: conversationId,
          handoffReason: handoffReason,
          firstMessage: firstUserMessage?.content || 'No message available',
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/support-requests?tab=live-chat`
        });
      } catch (emailError) {
        console.error('Failed to send live chat notification emails:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.status(200).json({
      success: true,
      status: 'requested',
      conversationId: conversationId,
      message: 'Live chat request submitted. An agent will join shortly.'
    });

  } catch (error) {
    console.error('Error creating live chat request:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}


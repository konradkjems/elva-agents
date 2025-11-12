import { ObjectId } from 'mongodb';
import clientPromise from '../../../lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('elva-agents');
    
    // Get user's organization
    const user = await db.collection('users').findOne({ 
      email: session.user.email 
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's organization memberships
    const memberships = await db.collection('team_members').find({
      userId: user._id,
      status: 'active'
    }).toArray();

    // Use current organization if available, otherwise use all memberships
    let organizationIds;
    if (session.user.currentOrganizationId) {
      const hasAccess = memberships.some(m => 
        m.organizationId.toString() === session.user.currentOrganizationId
      );
      
      if (hasAccess) {
        organizationIds = [new ObjectId(session.user.currentOrganizationId)];
      } else {
        organizationIds = memberships.map(m => new ObjectId(m.organizationId));
      }
    } else {
      organizationIds = memberships.map(m => new ObjectId(m.organizationId));
    }

    if (organizationIds.length === 0) {
      return res.status(403).json({ error: 'No organization access' });
    }

    // Get all widgets for these organizations
    const widgets = await db.collection('widgets').find({
      organizationId: { $in: organizationIds }
    }).toArray();

    const widgetIds = widgets.map(w => w._id);
    // Also include string versions for conversations that store widgetId as string
    const widgetIdsWithStrings = [...widgetIds, ...widgetIds.map(id => id.toString())];

    // Get all conversations with requested live chat status
    const conversations = await db.collection('conversations').find({
      widgetId: { $in: widgetIdsWithStrings },
      'liveChat.status': 'requested'
    })
    .sort({ 'liveChat.requestedAt': 1 }) // Oldest first
    .toArray();

    // Enrich with widget and organization info
    const queueItems = await Promise.all(
      conversations.map(async (conv) => {
        const widget = widgets.find(w => 
          w._id.toString() === conv.widgetId.toString()
        );
        
        const organization = widget ? await db.collection('organizations').findOne({
          _id: widget.organizationId
        }) : null;

        // Calculate wait time
        const waitTime = conv.liveChat?.requestedAt 
          ? Math.floor((new Date() - new Date(conv.liveChat.requestedAt)) / 1000)
          : 0;

        return {
          conversationId: conv._id.toString(),
          widgetId: conv.widgetId.toString(),
          widgetName: widget?.name || 'Unknown Widget',
          organizationName: organization?.name || 'Unknown Organization',
          requestedAt: conv.liveChat?.requestedAt,
          handoffReason: conv.liveChat?.handoffReason,
          waitTimeSeconds: waitTime,
          messageCount: conv.messageCount || 0,
          messages: conv.messages || [],
          userId: conv.userId
        };
      })
    );

    res.status(200).json({
      success: true,
      queue: queueItems,
      count: queueItems.length
    });

  } catch (error) {
    console.error('Error fetching live chat queue:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}


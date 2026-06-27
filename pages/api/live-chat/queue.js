import { admin } from '../../../lib/supabase/admin';
import { fromRow, fromRows } from '../../../lib/supabase/transform';
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
    // Get user's organization
    const { data: userRow } = await admin
      .from('users').select('*').eq('email', session.user.email).maybeSingle();
    const user = userRow ? fromRow(userRow) : null;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's organization memberships
    const { data: membershipRows } = await admin
      .from('team_members').select('*')
      .eq('user_id', user._id)
      .eq('status', 'active');
    const memberships = fromRows(membershipRows);

    // Use current organization if available, otherwise use all memberships
    let organizationIds;
    if (session.user.currentOrganizationId) {
      const hasAccess = memberships.some(m =>
        String(m.organizationId) === session.user.currentOrganizationId
      );

      if (hasAccess) {
        organizationIds = [session.user.currentOrganizationId];
      } else {
        organizationIds = memberships.map(m => m.organizationId);
      }
    } else {
      organizationIds = memberships.map(m => m.organizationId);
    }

    if (organizationIds.length === 0) {
      return res.status(403).json({ error: 'No organization access' });
    }

    // Get all widgets for these organizations
    const { data: widgetRows } = await admin
      .from('widgets').select('*').in('organization_id', organizationIds);
    const widgets = fromRows(widgetRows);

    const widgetIds = widgets.map(w => w._id);

    // Get all conversations with requested live chat status (oldest first)
    let conversations = [];
    if (widgetIds.length > 0) {
      const { data: convRows } = await admin
        .from('conversations').select('*')
        .in('widget_id', widgetIds)
        .eq('live_chat->>status', 'requested')
        .order('live_chat->>requestedAt', { ascending: true });
      conversations = fromRows(convRows);
    }

    // Enrich with widget and organization info
    const queueItems = await Promise.all(
      conversations.map(async (conv) => {
        const widget = widgets.find(w =>
          String(w._id) === String(conv.widgetId)
        );

        let organization = null;
        if (widget) {
          const { data: orgRow } = await admin
            .from('organizations').select('*').eq('id', widget.organizationId).maybeSingle();
          organization = orgRow ? fromRow(orgRow) : null;
        }

        // Calculate wait time
        const waitTime = conv.liveChat?.requestedAt
          ? Math.floor((new Date() - new Date(conv.liveChat.requestedAt)) / 1000)
          : 0;

        return {
          conversationId: String(conv._id),
          widgetId: conv.widgetId != null ? String(conv.widgetId) : conv.widgetId,
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

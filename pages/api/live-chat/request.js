import { admin } from '../../../lib/supabase/admin';
import { fromRow, fromRows } from '../../../lib/supabase/transform';
import { sendLiveChatRequestEmail } from '../../../lib/email';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(v) {
  return typeof v === 'string' && UUID_RE.test(v);
}

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

    if (!isUuid(conversationId)) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get conversation
    const { data: convRow } = await admin
      .from('conversations').select('*').eq('id', conversationId).maybeSingle();
    const conversation = convRow ? fromRow(convRow) : null;

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Check if already requested or active
    if (conversation.liveChat?.status === 'requested' || conversation.liveChat?.status === 'active') {
      return res.status(400).json({
        error: 'Live chat already ' + (conversation.liveChat.status === 'active' ? 'active' : 'requested'),
        status: conversation.liveChat.status,
        agentInfo: conversation.liveChat?.agentInfo || null
      });
    }

    // Get widget to find organization (widget_id is a uuid FK on conversations)
    let widget = null;
    if (isUuid(conversation.widgetId)) {
      const { data: widgetRow } = await admin
        .from('widgets').select('*').eq('id', conversation.widgetId).maybeSingle();
      widget = widgetRow ? fromRow(widgetRow) : null;
    }

    if (!widget || !widget.organizationId) {
      return res.status(404).json({ error: 'Widget or organization not found' });
    }

    // Update conversation with live chat request (dot-path $set into the
    // live_chat JSONB column → mutate the object and write it back whole)
    const liveChat = conversation.liveChat || {};
    liveChat.status = 'requested';
    liveChat.requestedAt = new Date();
    liveChat.handoffReason = handoffReason || null;

    const { error: updateError } = await admin
      .from('conversations').update({ live_chat: liveChat }).eq('id', conversationId);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update conversation' });
    }

    // Get organization and available agents
    const { data: orgRow } = await admin
      .from('organizations').select('*').eq('id', widget.organizationId).maybeSingle();
    const organization = orgRow ? fromRow(orgRow) : null;

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Get all team members who are agents
    const { data: teamMemberRows } = await admin
      .from('team_members').select('*')
      .eq('organization_id', widget.organizationId)
      .eq('status', 'active');
    const teamMembers = fromRows(teamMemberRows);

    const userIds = teamMembers.map(m => m.userId);

    // Get users with agent profiles who are available
    let agents = [];
    if (userIds.length > 0) {
      const { data: userRows } = await admin
        .from('users').select('*').in('id', userIds);
      agents = fromRows(userRows).filter(u => u.agentProfile?.isAvailable === true);
    }

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

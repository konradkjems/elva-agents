import { randomUUID } from 'crypto';
import { admin } from '../../../lib/supabase/admin';
import { fromRow } from '../../../lib/supabase/transform';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(v) {
  return typeof v === 'string' && UUID_RE.test(v);
}

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

    if (!isUuid(conversationId)) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get user
    const { data: userRow } = await admin
      .from('users').select('*').eq('email', session.user.email).maybeSingle();
    const user = userRow ? fromRow(userRow) : null;

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
    const { data: convRow } = await admin
      .from('conversations').select('*').eq('id', conversationId).maybeSingle();
    const conversation = convRow ? fromRow(convRow) : null;

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
    // (widget_id is a uuid FK on conversations)
    let widget = null;
    if (isUuid(conversation.widgetId)) {
      const { data: widgetRow } = await admin
        .from('widgets').select('*').eq('id', conversation.widgetId).maybeSingle();
      widget = widgetRow ? fromRow(widgetRow) : null;
    }

    if (!widget || !widget.organizationId) {
      return res.status(404).json({ error: 'Widget or organization not found' });
    }

    const { data: membershipRow } = await admin
      .from('team_members').select('*')
      .eq('user_id', user._id)
      .eq('organization_id', widget.organizationId)
      .eq('status', 'active')
      .maybeSingle();
    const membership = membershipRow ? fromRow(membershipRow) : null;

    if (!membership) {
      return res.status(403).json({ error: 'You do not have access to this organization' });
    }

    // Prepare agent info
    const agentInfo = {
      displayName: user.agentProfile?.displayName || user.name || user.email.split('@')[0],
      title: user.agentProfile?.title || 'Support Agent',
      avatarUrl: user.agentProfile?.avatarUrl || null
    };

    // Update conversation (dot-path $set into the live_chat JSONB column →
    // mutate the object and write it back whole)
    const liveChat = conversation.liveChat || {};
    liveChat.status = 'active';
    liveChat.acceptedAt = new Date();
    liveChat.acceptedBy = user._id;
    liveChat.agentInfo = agentInfo;

    const { error: updateError } = await admin
      .from('conversations').update({ live_chat: liveChat }).eq('id', conversationId);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to accept conversation' });
    }

    // Add this conversation to the user's active chats ($addToSet into the
    // agent_profile JSONB column → mutate and write back whole)
    const agentProfile = user.agentProfile || {};
    const activeChats = Array.isArray(agentProfile.currentActiveChats)
      ? [...agentProfile.currentActiveChats]
      : [];
    if (!activeChats.includes(conversationId)) {
      activeChats.push(conversationId);
    }
    agentProfile.currentActiveChats = activeChats;
    await admin.from('users').update({ agent_profile: agentProfile }).eq('id', user._id);

    // Add welcome message from agent ($push into the messages JSONB column)
    const welcomeMessage = {
      id: randomUUID(),
      type: 'agent',
      role: 'agent',
      content: `Hej! Jeg er ${agentInfo.displayName}${agentInfo.title ? ` - ${agentInfo.title}` : ''}. Hvordan kan jeg hjælpe dig?`,
      timestamp: new Date(),
      agentInfo: agentInfo
    };

    const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
    messages.push(welcomeMessage);
    await admin.from('conversations').update({
      messages: messages,
      message_count: messages.length
    }).eq('id', conversationId);

    // Broadcast status change and welcome message to SSE connections
    try {
      const { broadcastToConversation } = await import('./stream');
      const convId = conversationId.toString();
      broadcastToConversation(convId, {
        type: 'status',
        conversationId: convId,
        status: 'active',
        agentInfo: agentInfo
      });
      broadcastToConversation(convId, {
        type: 'message',
        conversationId: convId,
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

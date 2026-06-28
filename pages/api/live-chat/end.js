import { randomUUID } from 'crypto';
import { admin } from '../../../lib/supabase/admin';
import { getSessionContext } from '../../../lib/supabase/session';
import { fromRow } from '../../../lib/supabase/transform';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(v) {
  return typeof v === 'string' && UUID_RE.test(v);
}

export default async function handler(req, res) {
  const session = await getSessionContext(req, res);

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

    // Get conversation
    const { data: convRow } = await admin
      .from('conversations').select('*').eq('id', conversationId).maybeSingle();
    const conversation = convRow ? fromRow(convRow) : null;

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Verify user is the agent for this conversation (or allow admin/owner)
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

    // Check if user is the agent or has admin/owner role
    const isAgent = conversation.liveChat?.acceptedBy?.toString() === user._id.toString();
    const isAdmin = membership.role === 'admin' || membership.role === 'owner';

    if (!isAgent && !isAdmin) {
      return res.status(403).json({
        error: 'You are not authorized to end this conversation'
      });
    }

    // Update conversation (dot-path $set into the live_chat JSONB column →
    // mutate the object and write it back whole)
    const liveChat = conversation.liveChat || {};
    liveChat.status = 'ended';
    liveChat.endedAt = new Date();

    const { error: updateError } = await admin
      .from('conversations').update({ live_chat: liveChat }).eq('id', conversationId);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to end conversation' });
    }

    // Remove from agent's active chats ($pull from the agent_profile JSONB
    // column → mutate and write back whole)
    if (isAgent) {
      const agentProfile = user.agentProfile || {};
      const activeChats = Array.isArray(agentProfile.currentActiveChats)
        ? agentProfile.currentActiveChats
        : [];
      agentProfile.currentActiveChats = activeChats.filter(
        id => id.toString() !== conversationId.toString()
      );
      await admin.from('users').update({ agent_profile: agentProfile }).eq('id', user._id);
    }

    // Add ending message ($push into the messages JSONB column)
    const endMessage = {
      id: randomUUID(),
      type: 'system',
      role: 'system',
      content: 'Live chat er afsluttet. Du kan fortsætte med at chatte med AI\'en, eller starte en ny samtale.',
      timestamp: new Date()
    };

    const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
    messages.push(endMessage);
    await admin.from('conversations').update({
      messages: messages,
      message_count: messages.length
    }).eq('id', conversationId);

    // Broadcast status change and end message to SSE connections
    try {
      const { broadcastToConversation } = await import('./stream');
      const convId = conversationId.toString();
      broadcastToConversation(convId, {
        type: 'status',
        conversationId: convId,
        status: 'ended'
      });
      broadcastToConversation(convId, {
        type: 'message',
        conversationId: convId,
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

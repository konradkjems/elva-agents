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
    const { conversationId, message } = req.body;

    if (!conversationId || !message) {
      return res.status(400).json({ error: 'conversationId and message are required' });
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
      id: randomUUID(),
      type: 'agent',
      role: 'agent',
      content: message,
      timestamp: new Date(),
      agentInfo: agentInfo
    };

    // Add message to conversation ($push into the messages JSONB column)
    const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
    messages.push(agentMessage);
    await admin.from('conversations').update({
      messages: messages,
      message_count: messages.length
    }).eq('id', conversationId);

    // Broadcast to SSE connections
    try {
      const { broadcastToConversation } = await import('./stream');
      console.log('Broadcasting agent message to conversation:', conversationId);
      console.log('Message:', agentMessage);
      broadcastToConversation(conversationId.toString(), {
        type: 'message',
        conversationId: conversationId.toString(),
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

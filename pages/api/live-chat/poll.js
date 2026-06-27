import { admin } from '../../../lib/supabase/admin';
import { fromRow } from '../../../lib/supabase/transform';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(v) {
  return typeof v === 'string' && UUID_RE.test(v);
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { conversationId, lastMessageId } = req.query;

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

    const messages = conversation.messages || [];

    // If lastMessageId is provided, return only new messages
    let newMessages = messages;
    if (lastMessageId) {
      const lastMessageIndex = messages.findIndex(m => m.id === lastMessageId);
      if (lastMessageIndex >= 0) {
        newMessages = messages.slice(lastMessageIndex + 1);
      }
    }

    // Return conversation status and new messages
    res.status(200).json({
      success: true,
      conversationId: conversationId,
      status: conversation.liveChat?.status || 'ai',
      agentInfo: conversation.liveChat?.agentInfo || null,
      newMessages: newMessages,
      hasNewMessages: newMessages.length > 0,
      lastMessageId: messages.length > 0 ? messages[messages.length - 1].id : null
    });

  } catch (error) {
    console.error('Error polling live chat:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

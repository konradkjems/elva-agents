import { randomUUID } from 'crypto';
import { admin } from '../../../lib/supabase/admin';
import { fromRow } from '../../../lib/supabase/transform';

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
    const { conversationId, message } = req.body;

    if (!conversationId || !message) {
      return res.status(400).json({ error: 'conversationId and message are required' });
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

    // Verify live chat is active
    if (conversation.liveChat?.status !== 'active') {
      return res.status(400).json({
        error: 'Live chat is not active',
        status: conversation.liveChat?.status || 'ai'
      });
    }

    // Create user message
    const userMessage = {
      id: randomUUID(),
      type: 'user',
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    // Add message to conversation ($push into the messages JSONB column)
    const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
    messages.push(userMessage);
    await admin.from('conversations').update({
      messages: messages,
      message_count: messages.length
    }).eq('id', conversationId);

    // Broadcast to SSE connections
    try {
      const { broadcastToConversation } = await import('./stream');
      const convId = conversationId.toString();
      broadcastToConversation(convId, {
        type: 'message',
        conversationId: convId,
        message: userMessage
      });
    } catch (error) {
      console.error('Error broadcasting message:', error);
      // Don't fail the request if broadcast fails
    }

    res.status(200).json({
      success: true,
      message: userMessage
    });

  } catch (error) {
    console.error('Error saving user message:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

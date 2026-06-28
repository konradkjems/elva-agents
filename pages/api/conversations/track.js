import { randomUUID } from 'crypto';
import { admin } from '../../../lib/supabase/admin';
import { fromRow } from '../../../lib/supabase/transform';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      conversationId,
      message,
      responseTime,
      tokens,
      widgetId,
      sessionId
    } = req.body;

    if (!conversationId && !sessionId) {
      return res.status(400).json({
        error: 'Either conversationId or sessionId is required'
      });
    }

    // Find conversation by ID or sessionId
    let conversation;
    if (conversationId) {
      if (UUID_RE.test(conversationId)) {
        const { data } = await admin
          .from('conversations')
          .select('*')
          .eq('id', conversationId)
          .maybeSingle();
        if (data) conversation = fromRow(data);
      }
    } else {
      // Only active conversations (end_time null) for this session/widget
      let q = admin
        .from('conversations')
        .select('*')
        .eq('session_id', sessionId)
        .is('end_time', null);
      if (widgetId) {
        // widget_id is the uuid FK; the embed id lives on widget_legacy_id
        q = UUID_RE.test(widgetId)
          ? q.eq('widget_id', widgetId)
          : q.eq('widget_legacy_id', widgetId);
      }
      const { data } = await q.limit(1);
      if (data && data[0]) conversation = fromRow(data[0]);
    }

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Add message to conversation
    const newMessage = {
      id: randomUUID(),
      type: message.type, // 'user' or 'assistant'
      content: message.content,
      timestamp: new Date(),
      responseTime: responseTime || null,
      tokens: tokens || null
    };

    // Update conversation (updated_at maintained by a trigger)
    const updatedMessages = [...(conversation.messages || []), newMessage];
    const patch = {
      messages: updatedMessages,
      message_count: (conversation.messageCount || 0) + 1
    };

    const { error } = await admin
      .from('conversations')
      .update(patch)
      .eq('id', conversation._id);
    if (error) throw error;

    return res.status(200).json({
      success: true,
      messageId: newMessage.id,
      conversationId: conversation._id
    });

  } catch (error) {
    console.error('Error tracking message:', error);
    return res.status(500).json({ error: 'Failed to track message' });
  }
}

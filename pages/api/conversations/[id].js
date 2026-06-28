import { admin } from '../../../lib/supabase/admin';
import { fromRow } from '../../../lib/supabase/transform';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  try {
    const { id } = req.query;

    if (!UUID_RE.test(id)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    switch (req.method) {
      case 'GET':
        return await getConversation(req, res, id);
      case 'PUT':
        return await updateConversation(req, res, id);
      case 'DELETE':
        return await deleteConversation(req, res, id);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Conversation API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getConversation(req, res, id) {
  try {
    const { data, error } = await admin
      .from('conversations')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    return res.status(200).json({ conversation: fromRow(data) });

  } catch (error) {
    console.error('Error fetching conversation:', error);
    return res.status(500).json({ error: 'Failed to fetch conversation' });
  }
}

async function updateConversation(req, res, id) {
  const {
    endTime,
    messageCount,
    messages,
    satisfaction,
    tags,
    metadata
  } = req.body;

  try {
    // Build a snake_case patch; updated_at is maintained by a trigger.
    const patch = {};
    if (endTime !== undefined) patch.end_time = new Date(endTime).toISOString();
    if (messageCount !== undefined) patch.message_count = messageCount;
    if (messages !== undefined) patch.messages = messages;
    if (satisfaction !== undefined) patch.satisfaction = satisfaction;
    if (tags !== undefined) patch.tags = tags;
    if (metadata !== undefined) patch.metadata = { ...metadata };

    // Nothing to update — just confirm the conversation exists.
    if (Object.keys(patch).length === 0) {
      const { data, error } = await admin
        .from('conversations')
        .select('id')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      return res.status(200).json({
        success: true,
        message: 'Conversation updated successfully'
      });
    }

    const { data, error } = await admin
      .from('conversations')
      .update(patch)
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Conversation updated successfully'
    });

  } catch (error) {
    console.error('Error updating conversation:', error);
    return res.status(500).json({ error: 'Failed to update conversation' });
  }
}

async function deleteConversation(req, res, id) {
  try {
    const { data, error } = await admin
      .from('conversations')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Conversation deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting conversation:', error);
    return res.status(500).json({ error: 'Failed to delete conversation' });
  }
}

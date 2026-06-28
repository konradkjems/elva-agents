import { admin } from "../../lib/supabase/admin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID required" });
    }

    if (!UUID_RE.test(conversationId)) {
      return res.status(400).json({ error: "Invalid conversation ID format" });
    }

    const { data: conversation, error } = await admin
      .from("conversations")
      .select("id, messages, created_at, updated_at")
      .eq("id", conversationId)
      .maybeSingle();
    if (error) throw error;

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.json({
      messages: conversation.messages || [],
      conversationId: conversation.id,
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at
    });

  } catch (error) {
    console.error('Error in /api/conversation:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

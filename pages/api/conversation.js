import { ObjectId } from "mongodb";
import clientPromise from "../../lib/mongodb";

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

    const client = await clientPromise;
    const db = client.db("chatwidgets");
    
    let conversation;
    try {
      conversation = await db.collection("conversations").findOne({ 
        _id: new ObjectId(conversationId) 
      });
    } catch (error) {
      return res.status(400).json({ error: "Invalid conversation ID format" });
    }
    
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.json({ 
      messages: conversation.messages || [],
      conversationId: conversation._id.toString(),
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt
    });

  } catch (error) {
    console.error('Error in /api/conversation:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

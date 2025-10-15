import clientPromise from '../../../lib/mongodb.js';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db('elva-agents');
    const conversations = db.collection('conversations');

    const { id } = req.query;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    switch (req.method) {
      case 'GET':
        return await getConversation(req, res, conversations, id);
      case 'PUT':
        return await updateConversation(req, res, conversations, id);
      case 'DELETE':
        return await deleteConversation(req, res, conversations, id);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Conversation API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getConversation(req, res, conversations, id) {
  try {
    const conversation = await conversations.findOne({ _id: new ObjectId(id) });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    return res.status(200).json({ conversation });

  } catch (error) {
    console.error('Error fetching conversation:', error);
    return res.status(500).json({ error: 'Failed to fetch conversation' });
  }
}

async function updateConversation(req, res, conversations, id) {
  const {
    endTime,
    messageCount,
    messages,
    satisfaction,
    tags,
    metadata
  } = req.body;

  try {
    const updateData = {
      updatedAt: new Date()
    };

    if (endTime !== undefined) updateData.endTime = new Date(endTime);
    if (messageCount !== undefined) updateData.messageCount = messageCount;
    if (messages !== undefined) updateData.messages = messages;
    if (satisfaction !== undefined) updateData.satisfaction = satisfaction;
    if (tags !== undefined) updateData.tags = tags;
    if (metadata !== undefined) updateData.metadata = { ...metadata };

    const result = await conversations.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
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

async function deleteConversation(req, res, conversations, id) {
  try {
    const result = await conversations.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
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

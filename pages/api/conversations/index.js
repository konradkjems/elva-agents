import clientPromise from '../../../lib/mongodb.js';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db('elva-agents');
    const conversations = db.collection('conversations');

    switch (req.method) {
      case 'GET':
        return await getConversations(req, res, conversations);
      case 'POST':
        return await createConversation(req, res, conversations);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Conversations API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getConversations(req, res, conversations) {
  const { 
    widgetId, 
    page = 1, 
    limit = 20, 
    startDate, 
    endDate,
    sortBy = 'startTime',
    sortOrder = 'desc'
  } = req.query;

  try {
    // Build query
    const query = {};
    
    if (widgetId) {
      query.widgetId = widgetId;
    }
    
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const [conversationList, totalCount] = await Promise.all([
      conversations
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .toArray(),
      conversations.countDocuments(query)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    return res.status(200).json({
      conversations: conversationList,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    return res.status(500).json({ error: 'Failed to fetch conversations' });
  }
}

async function createConversation(req, res, conversations) {
  const {
    widgetId,
    sessionId,
    userId,
    metadata = {}
  } = req.body;

  if (!widgetId || !sessionId) {
    return res.status(400).json({ 
      error: 'widgetId and sessionId are required' 
    });
  }

  try {
    const conversation = {
      widgetId,
      sessionId,
      userId: userId || null,
      startTime: new Date(),
      endTime: null,
      messageCount: 0,
      messages: [],
      satisfaction: null,
      tags: [],
      metadata: {
        userAgent: req.headers['user-agent'] || '',
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress || '',
        country: metadata.country || null,
        referrer: metadata.referrer || null,
        ...metadata
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await conversations.insertOne(conversation);
    
    return res.status(201).json({
      success: true,
      conversationId: result.insertedId,
      conversation: conversation
    });

  } catch (error) {
    console.error('Error creating conversation:', error);
    return res.status(500).json({ error: 'Failed to create conversation' });
  }
}

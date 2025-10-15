import clientPromise from '../../../../../lib/mongodb.js';
import { ObjectId } from 'mongodb';
import { withAdmin } from '../../../../../lib/auth';

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { widgetId } = req.query;
    const { 
      period = 'all',
      search = '',
      limit = 100,
      offset = 0
    } = req.query;

    const client = await clientPromise;
    const db = client.db('elva-agents');
    const conversations = db.collection('conversations');

    // Build query
    const query = { widgetId: widgetId };

    // Add date filtering
    if (period !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }
      
      if (startDate) {
        query.startTime = { $gte: startDate };
      }
    }

    // Add search filtering
    if (search) {
      query.$or = [
        { 'messages.content': { $regex: search, $options: 'i' } }
      ];
    }

    console.log('📞 Conversations query:', { query, period, search });

    // Fetch conversations
    const conversationsData = await conversations
      .find(query)
      .sort({ startTime: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .toArray();

    console.log(`📞 Found ${conversationsData.length} conversations for widget ${widgetId}`);

    // Transform data for frontend
    const transformedConversations = conversationsData.map(conv => ({
      _id: conv._id,
      widgetId: conv.widgetId,
      sessionId: conv.sessionId,
      startTime: conv.startTime,
      endTime: conv.endTime,
      messageCount: conv.messageCount || conv.messages?.length || 0,
      satisfaction: conv.satisfaction,
      messages: conv.messages || [],
      metadata: {
        country: conv.metadata?.country,
        referrer: conv.metadata?.referrer,
        userAgent: conv.metadata?.userAgent,
        ip: conv.metadata?.ip
      }
    }));

    return res.status(200).json(transformedConversations);

  } catch (error) {
    console.error('Error fetching conversations:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withAdmin(handler);

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
    const conversationsCollection = db.collection('conversations');

    // widgetId can be stored as ObjectId or string in conversations
    // Match both possibilities
    const widgetIdString = String(widgetId);
    const widgetIdObjectId = ObjectId.isValid(widgetId) ? new ObjectId(widgetId) : widgetId;

    // Build query - match widgetId as both string and ObjectId
    const queryConditions = [
      {
        $or: [
          { widgetId: widgetIdObjectId },
          { widgetId: widgetIdString }
        ]
      }
    ];

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
        // Use $or to match either createdAt or startTime
        queryConditions.push({
          $or: [
            { createdAt: { $gte: startDate } },
            { startTime: { $gte: startDate } }
          ]
        });
      }
    }

    // Add search filtering
    if (search) {
      queryConditions.push({
        'messages.content': { $regex: search, $options: 'i' }
      });
    }

    // Combine all conditions with $and
    const query = queryConditions.length > 1 
      ? { $and: queryConditions }
      : queryConditions[0];

    console.log('📞 Conversations query:', { query, period, search });

    // Fetch conversations
    const allConversations = await conversationsCollection
      .find(query)
      .sort({ startTime: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .toArray();

    console.log(`📞 Found ${allConversations.length} conversations for widget ${widgetId}`);

    // Filter to only include conversations with assistant messages and messageCount > 0
    const validConversations = allConversations.filter(conv => {
      // Must have at least one message
      if (!conv.messageCount || conv.messageCount === 0) return false;
      
      // Must have at least one assistant message (handled by OpenAI)
      if (!conv.messages || !Array.isArray(conv.messages)) return false;
      const hasAssistantMessage = conv.messages.some(msg => msg.type === 'assistant');
      return hasAssistantMessage;
    });

    console.log(`📞 Filtered to ${validConversations.length} valid conversations (with assistant messages)`);

    // Transform data for frontend
    // messageCount should only count assistant messages
    const transformedConversations = validConversations.map(conv => {
      const assistantMessageCount = conv.messages?.filter(msg => msg.type === 'assistant').length || 0;
      
      return {
        _id: conv._id,
        widgetId: conv.widgetId,
        sessionId: conv.sessionId,
        startTime: conv.startTime,
        endTime: conv.endTime,
        messageCount: assistantMessageCount, // Only count assistant messages
        satisfaction: conv.satisfaction,
        messages: conv.messages || [],
        metadata: {
          country: conv.metadata?.country,
          referrer: conv.metadata?.referrer,
          userAgent: conv.metadata?.userAgent,
          ip: conv.metadata?.ip
        }
      };
    });

    return res.status(200).json(transformedConversations);

  } catch (error) {
    console.error('Error fetching conversations:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withAdmin(handler);

import clientPromise from '../../../lib/mongodb.js';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { widgetId, timeRange = '30d' } = req.query;

    if (!widgetId) {
      return res.status(400).json({ error: 'Widget ID is required' });
    }

    const client = await clientPromise;
    const db = client.db('elva-agents');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Get satisfaction analytics for the time range
    const analytics = await db.collection('satisfaction_analytics')
      .find({
        widgetId: new ObjectId(widgetId),
        date: { $gte: startDate, $lte: endDate }
      })
      .sort({ date: 1 })
      .toArray();

    // Aggregate the data
    const aggregated = aggregateSatisfactionData(analytics);

    // Get conversation-level satisfaction data for additional insights
    const conversations = await db.collection('conversations')
      .find({
        widgetId: new ObjectId(widgetId),
        'satisfaction.rating': { $exists: true },
        'satisfaction.submittedAt': { $gte: startDate, $lte: endDate }
      })
      .sort({ 'satisfaction.submittedAt': -1 })
      .limit(100)
      .toArray();

    // Calculate trends
    const trends = calculateTrends(analytics, timeRange);

    res.status(200).json({
      success: true,
      data: {
        ...aggregated,
        trends,
        recentRatings: conversations.map(conv => ({
          rating: conv.satisfaction.rating,
          feedback: conv.satisfaction.feedback,
          submittedAt: conv.satisfaction.submittedAt,
          conversationId: conv._id
        }))
      }
    });

  } catch (error) {
    console.error('Satisfaction analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch satisfaction analytics' });
  }
}

function aggregateSatisfactionData(analytics) {
  if (analytics.length === 0) {
    return {
      total: 0,
      average: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      responseRate: 0
    };
  }

  const total = analytics.reduce((sum, record) => sum + record.ratings.total, 0);
  const weightedSum = analytics.reduce((sum, record) => {
    return sum + (record.ratings.average * record.ratings.total);
  }, 0);
  const average = total > 0 ? weightedSum / total : 0;

  const distribution = analytics.reduce((dist, record) => {
    for (let rating = 1; rating <= 5; rating++) {
      dist[rating] = (dist[rating] || 0) + (record.ratings.distribution[rating] || 0);
    }
    return dist;
  }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

  return {
    total,
    average: Math.round(average * 10) / 10, // Round to 1 decimal place
    distribution,
    responseRate: 0 // TODO: Calculate based on total conversations
  };
}

function calculateTrends(analytics, timeRange) {
  const trends = {
    daily: [],
    weekly: [],
    monthly: []
  };

  if (analytics.length === 0) {
    return trends;
  }

  // Group by time period and calculate averages
  const groupedByDay = {};
  analytics.forEach(record => {
    const dateKey = record.date.toISOString().split('T')[0];
    if (!groupedByDay[dateKey]) {
      groupedByDay[dateKey] = [];
    }
    groupedByDay[dateKey].push(record);
  });

  // Calculate daily trends
  Object.keys(groupedByDay)
    .sort()
    .forEach(dateKey => {
      const dayRecords = groupedByDay[dateKey];
      const dayTotal = dayRecords.reduce((sum, record) => sum + record.ratings.total, 0);
      const dayWeightedSum = dayRecords.reduce((sum, record) => {
        return sum + (record.ratings.average * record.ratings.total);
      }, 0);
      const dayAverage = dayTotal > 0 ? dayWeightedSum / dayTotal : 0;
      
      trends.daily.push({
        date: dateKey,
        average: Math.round(dayAverage * 10) / 10,
        total: dayTotal
      });
    });

  return trends;
}

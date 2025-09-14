import clientPromise from '../../../lib/mongodb.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('chatwidgets');
    const analytics = db.collection('analytics');

    const { 
      widgetId, 
      period = '7d', // 1d, 7d, 30d, 90d, all
      timezone = 'UTC'
    } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = null; // All time
    }

    // Build query for analytics collection
    const query = {};
    if (widgetId && widgetId !== 'all') {
      query.agentId = widgetId;
    }
    if (startDate) {
      query.date = { $gte: startDate };
    }

    // Get analytics data for the period
    const analyticsData = await analytics.find(query).sort({ date: -1 }).toArray();
    console.log('📊 Analytics query:', { widgetId, period, startDate, analyticsCount: analyticsData.length });

    // Calculate aggregated metrics
    const metrics = calculateAggregatedMetrics(analyticsData, period);

    // Get widget-specific metrics if widgetId provided
    let widgetMetrics = null;
    if (widgetId && widgetId !== 'all') {
      widgetMetrics = await getWidgetMetrics(db, widgetId, startDate);
    }

    return res.status(200).json({
      period,
      startDate: startDate?.toISOString(),
      endDate: now.toISOString(),
      metrics,
      widgetMetrics,
      dataPoints: analyticsData.length
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function calculateAggregatedMetrics(analyticsData, period) {
  if (analyticsData.length === 0) {
    return {
      totalConversations: 0,
      activeConversations: 0,
      completedConversations: 0,
      avgResponseTime: 0,
      avgConversationLength: 0,
      totalMessages: 0,
      avgSatisfaction: null,
      hourlyDistribution: Array(24).fill(0).map((_, hour) => ({ hour: `${hour}:00`, count: 0 })),
      dailyTrends: []
    };
  }

  // Aggregate metrics from analytics data
  const totalConversations = analyticsData.reduce((sum, data) => sum + (data.metrics?.conversations || 0), 0);
  const totalMessages = analyticsData.reduce((sum, data) => sum + (data.metrics?.messages || 0), 0);
  const totalResponseTime = analyticsData.reduce((sum, data) => sum + (data.metrics?.avgResponseTime || 0), 0);
  const totalSatisfaction = analyticsData.reduce((sum, data) => sum + (data.metrics?.satisfaction || 0), 0);
  
  const avgResponseTime = analyticsData.length > 0 ? totalResponseTime / analyticsData.length : 0;
  const avgConversationLength = totalConversations > 0 ? totalMessages / totalConversations : 0;
  const avgSatisfaction = analyticsData.length > 0 ? totalSatisfaction / analyticsData.length : null;

  console.log('📈 Aggregated metrics calculation:', {
    dataPoints: analyticsData.length,
    totalConversations,
    totalMessages,
    avgResponseTime: Math.round(avgResponseTime),
    avgConversationLength: Math.round(avgConversationLength * 10) / 10,
    avgSatisfaction: avgSatisfaction ? Math.round(avgSatisfaction * 10) / 10 : null
  });

  // Calculate hourly distribution from analytics data
  const hourlyDistribution = calculateHourlyDistributionFromAnalytics(analyticsData);

  // Calculate daily trends from analytics data
  const dailyTrends = calculateDailyTrendsFromAnalytics(analyticsData, period);

  return {
    totalConversations,
    activeConversations: totalConversations, // Assume all are active for now
    completedConversations: totalConversations, // Assume all are completed for now
    avgResponseTime: Math.round(avgResponseTime),
    avgConversationLength: Math.round(avgConversationLength * 10) / 10,
    totalMessages,
    avgSatisfaction: avgSatisfaction ? Math.round(avgSatisfaction * 10) / 10 : null,
    hourlyDistribution,
    dailyTrends
  };
}

function calculateHourlyDistributionFromAnalytics(analyticsData) {
  const hourly = Array(24).fill(0);
  
  analyticsData.forEach(data => {
    if (data.hourly) {
      for (let hour = 0; hour < 24; hour++) {
        const hourValue = data.hourly[hour.toString()] || data.hourly[hour] || 0;
        hourly[hour] += typeof hourValue === 'number' ? hourValue : 0;
      }
    }
  });

  return hourly.map((count, hour) => ({
    hour: `${hour}:00`,
    count: count
  }));
}

function calculateDailyTrendsFromAnalytics(analyticsData, period) {
  const days = [];
  const now = new Date();
  
  // Determine number of days to show
  let numDays;
  switch (period) {
    case '1d': numDays = 1; break;
    case '7d': numDays = 7; break;
    case '30d': numDays = 30; break;
    case '90d': numDays = 90; break;
    default: numDays = 30;
  }

  // Create array of days
  for (let i = numDays - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Find analytics data for this day
    const dayData = analyticsData.find(data => {
      const dataDate = new Date(data.date);
      return dataDate.getFullYear() === dayStart.getFullYear() &&
             dataDate.getMonth() === dayStart.getMonth() &&
             dataDate.getDate() === dayStart.getDate();
    });

    days.push({
      date: dayStart.toISOString().split('T')[0],
      conversations: dayData?.metrics?.conversations || 0,
      messages: dayData?.metrics?.messages || 0
    });
  }

  return days;
}

async function getWidgetMetrics(db, widgetId, startDate) {
  const widgets = db.collection('widgets');
  const analytics = db.collection('analytics');
  
  const widget = await widgets.findOne({ _id: widgetId });
  
  if (!widget) {
    return null;
  }

  // Get analytics data for this widget
  const query = { agentId: widgetId };
  if (startDate) {
    query.date = { $gte: startDate };
  }
  
  const analyticsData = await analytics.find(query).toArray();
  const totalConversations = analyticsData.reduce((sum, data) => sum + (data.metrics?.conversations || 0), 0);

  return {
    widgetId,
    widgetName: widget.name,
    createdAt: widget.createdAt,
    lastUpdated: widget.updatedAt,
    totalConversations,
    analyticsDataPoints: analyticsData.length
  };
}

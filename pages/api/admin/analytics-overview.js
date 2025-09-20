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
    const widgets = db.collection('widgets');

    // Get all widgets
    const allWidgets = await widgets.find({}).toArray();
    console.log('📊 Found widgets:', allWidgets.map(w => ({ id: w._id, name: w.name, status: w.status })));
    
    // Get analytics data for all widgets
    const analyticsData = await analytics.find({}).sort({ date: -1 }).toArray();
    console.log('📊 Found analytics data:', analyticsData.map(a => ({ agentId: a.agentId, date: a.date, conversations: a.metrics?.conversations })));
    
    // Calculate aggregated metrics
    const totalConversations = analyticsData.reduce((sum, data) => sum + (data.metrics?.conversations || 0), 0);
    const totalMessages = analyticsData.reduce((sum, data) => sum + (data.metrics?.messages || 0), 0);
    const totalResponseTime = analyticsData.reduce((sum, data) => sum + (data.metrics?.avgResponseTime || 0), 0);
    const totalSatisfaction = analyticsData.reduce((sum, data) => sum + (data.metrics?.satisfaction || 0), 0);
    
    const avgResponseTime = analyticsData.length > 0 ? totalResponseTime / analyticsData.length : 0;
    const avgSatisfaction = analyticsData.length > 0 ? totalSatisfaction / analyticsData.length : null;

    // Calculate active widgets (widgets with status 'active')
    console.log('📊 Widget statuses:', allWidgets.map(w => ({ name: w.name, status: w.status, isActive: w.isActive })));
    const activeWidgets = allWidgets.filter(widget => widget.status === 'active' || widget.isActive === true);
    console.log('📊 Active widgets count:', activeWidgets.length);

    // Get analytics for each widget
    const widgetsWithAnalytics = allWidgets.map(widget => {
      // Try different agentId formats for matching
      const widgetIdString = widget._id.toString();
      const widgetAnalytics = analyticsData.filter(data => 
        data.agentId === widget._id || 
        data.agentId === widgetIdString ||
        data.agentId === widget.name ||
        data.agentId === widget.slug
      );
      console.log(`📊 Widget ${widget.name} (${widget._id}): Found ${widgetAnalytics.length} analytics records`);
      
      const widgetTotalConversations = widgetAnalytics.reduce((sum, data) => sum + (data.metrics?.conversations || 0), 0);
      const widgetTotalMessages = widgetAnalytics.reduce((sum, data) => sum + (data.metrics?.messages || 0), 0);
      const widgetAvgResponseTime = widgetAnalytics.length > 0 
        ? widgetAnalytics.reduce((sum, data) => sum + (data.metrics?.avgResponseTime || 0), 0) / widgetAnalytics.length 
        : 0;

      return {
        ...widget,
        stats: {
          totalConversations: widgetTotalConversations,
          totalMessages: widgetTotalMessages,
          uniqueUsers: Math.ceil(widgetTotalConversations * 0.8), // Estimate
          responseTime: Math.round(widgetAvgResponseTime),
          lastActivity: widgetAnalytics.length > 0 ? widgetAnalytics[0].date : widget.createdAt
        },
        analytics: {
          totalConversations: widgetTotalConversations,
          totalMessages: widgetTotalMessages,
          averageResponseTime: Math.round(widgetAvgResponseTime),
          lastActivity: widgetAnalytics.length > 0 ? widgetAnalytics[0].date : widget.createdAt
        }
      };
    });

    const response = {
      overview: {
        totalWidgets: allWidgets.length,
        activeWidgets: activeWidgets.length,
        totalConversations,
        avgResponseTime: Math.round(avgResponseTime),
        avgSatisfaction: avgSatisfaction ? Math.round(avgSatisfaction * 10) / 10 : null
      },
      widgets: widgetsWithAnalytics
    };
    
    console.log('📊 Sending overview response:', response.overview);
    return res.status(200).json(response);

  } catch (error) {
    console.error('Analytics overview API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

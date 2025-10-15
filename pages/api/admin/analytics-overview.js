import clientPromise from '../../../lib/mongodb.js';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get session for organization context
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const currentOrgId = session.user?.currentOrganizationId;
    const isPlatformAdmin = session.user?.role === 'platform_admin';

    // Get query parameters for date filtering
    const { 
      period = '30d', 
      startDate: customStartDate, 
      endDate: customEndDate 
    } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    let endDate = now;
    
    if (period === 'custom' && customStartDate && customEndDate) {
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
    } else {
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
    }

    console.log('📊 Analytics overview date range:', { period, startDate, endDate });

    const client = await clientPromise;
    const db = client.db('elva-agents'); // Use new database
    const analytics = db.collection('analytics');
    const widgets = db.collection('widgets');
    const organizations = db.collection('organizations');
    const teamMembers = db.collection('team_members');
    const invitations = db.collection('invitations');
    const satisfactionAnalytics = db.collection('satisfaction_analytics');

    // Build query to filter by organization
    const widgetQuery = {
      isDemoMode: { $ne: true } // Exclude demo widgets
    };
    
    // Filter by organization unless platform admin viewing all
    if (currentOrgId && !isPlatformAdmin) {
      widgetQuery.organizationId = new ObjectId(currentOrgId);
    } else if (currentOrgId && isPlatformAdmin) {
      // Platform admin: filter by current org if one is selected
      widgetQuery.organizationId = new ObjectId(currentOrgId);
    }

    // Get widgets for current organization
    const allWidgets = await widgets.find(widgetQuery).toArray();
    console.log('📊 Found widgets:', allWidgets.map(w => ({ id: w._id, name: w.name, status: w.status })));
    
    // Get analytics data ONLY for widgets in current organization
    let analyticsData = [];
    if (allWidgets.length > 0) {
      // IMPORTANT: Analytics always stores agentId as string
      // Convert all widget IDs to strings for consistent lookup
      const widgetIds = allWidgets.map(w => {
        return typeof w._id === 'object' ? w._id.toString() : String(w._id);
      });
      
      // Build analytics query with date filtering
      const analyticsQuery = {
        agentId: { $in: widgetIds }
      };
      
      // Add date filter if startDate is provided
      if (startDate) {
        if (period === 'custom' && endDate) {
          analyticsQuery.date = { $gte: startDate, $lte: endDate };
        } else {
          analyticsQuery.date = { $gte: startDate };
        }
      }
      
      // Query analytics for these specific widgets
      analyticsData = await analytics.find(analyticsQuery).sort({ date: -1 }).toArray();
      
      console.log('📊 Found analytics data for org widgets:', analyticsData.map(a => ({ agentId: a.agentId, date: a.date, conversations: a.metrics?.conversations })));
    } else {
      console.log('📊 No widgets found for organization, analytics will be empty');
    }
    
    // Calculate aggregated metrics
    const totalConversations = analyticsData.reduce((sum, data) => sum + (data.metrics?.conversations || 0), 0);
    const totalMessages = analyticsData.reduce((sum, data) => sum + (data.metrics?.messages || 0), 0);
    const totalResponseTime = analyticsData.reduce((sum, data) => sum + (data.metrics?.avgResponseTime || 0), 0);
    const totalSatisfaction = analyticsData.reduce((sum, data) => sum + (data.metrics?.satisfaction || 0), 0);
    
    const avgResponseTime = analyticsData.length > 0 ? totalResponseTime / analyticsData.length : 0;
    const avgSatisfaction = analyticsData.length > 0 ? totalSatisfaction / analyticsData.length : null;

    // Calculate active widgets (widgets with status 'active')
    console.log('📊 Widget statuses:', allWidgets.map(w => ({ name: w.name, status: w.status })));
    const activeWidgets = allWidgets.filter(widget => widget.status === 'active');
    console.log('📊 Active widgets count:', activeWidgets.length);

    // Get satisfaction data for all widgets in organization
    let satisfactionData = { total: 0, average: 0 };
    if (allWidgets.length > 0) {
      try {
        // Handle both string and ObjectId widget IDs
        const widgetIds = allWidgets.map(w => {
          // If _id is already an ObjectId, use it as is
          // If _id is a string that looks like an ObjectId, convert it
          // Otherwise keep it as string
          if (typeof w._id === 'object') {
            return w._id;
          } else if (typeof w._id === 'string' && w._id.match(/^[0-9a-fA-F]{24}$/)) {
            return new ObjectId(w._id);
          } else {
            return w._id;
          }
        });
        console.log('⭐ Fetching satisfaction for widget IDs:', widgetIds.map(id => id.toString ? id.toString() : id));
        
        // Calculate date range for last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);
        console.log('⭐ Date range:', startDate.toISOString(), 'to', endDate.toISOString());
        
        const satisfactionRecords = await satisfactionAnalytics.find({
          widgetId: { $in: widgetIds },
          date: { $gte: startDate, $lte: endDate }
        }).toArray();
        
        console.log('⭐ Found', satisfactionRecords.length, 'satisfaction records');
        
        if (satisfactionRecords.length > 0) {
          const totalRatings = satisfactionRecords.reduce((sum, record) => sum + (record.ratings?.total || 0), 0);
          const weightedSum = satisfactionRecords.reduce((sum, record) => {
            return sum + ((record.ratings?.average || 0) * (record.ratings?.total || 0));
          }, 0);
          
          satisfactionData = {
            total: totalRatings,
            average: totalRatings > 0 ? Math.round((weightedSum / totalRatings) * 10) / 10 : 0
          };
          
          console.log('⭐ Calculated satisfaction - Total:', totalRatings, 'Average:', satisfactionData.average);
        } else {
          console.log('⭐ No satisfaction records found in date range');
        }
        
        console.log('⭐ Final satisfaction data:', satisfactionData);
      } catch (satisfactionError) {
        console.error('⭐ Error fetching satisfaction data:', satisfactionError);
        // Continue with default satisfaction data
      }
    } else {
      console.log('⭐ No widgets found, skipping satisfaction data fetch');
    }

    // Get analytics for each widget
    const widgetsWithAnalytics = allWidgets.map(widget => {
      // IMPORTANT: Convert widget ID to string for analytics lookup
      const widgetIdString = typeof widget._id === 'object' ? widget._id.toString() : String(widget._id);
      // Analytics always stores agentId as string, so only match by string
      const widgetAnalytics = analyticsData.filter(data => 
        data.agentId === widgetIdString
      );
      console.log(`📊 Widget ${widget.name} (${widget._id}): Found ${widgetAnalytics.length} analytics records`);
      
      const widgetTotalConversations = widgetAnalytics.reduce((sum, data) => sum + (data.metrics?.conversations || 0), 0);
      const widgetTotalMessages = widgetAnalytics.reduce((sum, data) => sum + (data.metrics?.messages || 0), 0);
      const widgetAvgResponseTime = widgetAnalytics.length > 0 
        ? widgetAnalytics.reduce((sum, data) => sum + (data.metrics?.avgResponseTime || 0), 0) / widgetAnalytics.length 
        : 0;
      
      // Calculate unique users by taking the maximum uniqueUsers value across all analytics records
      // (since uniqueUsers is cumulative in each analytics document)
      const widgetUniqueUsers = widgetAnalytics.length > 0
        ? Math.max(...widgetAnalytics.map(data => data.metrics?.uniqueUsers || 0))
        : 0;

      return {
        ...widget,
        stats: {
          totalConversations: widgetTotalConversations,
          totalMessages: widgetTotalMessages,
          uniqueUsers: widgetUniqueUsers,
          responseTime: Math.round(widgetAvgResponseTime),
          lastActivity: widgetAnalytics.length > 0 ? widgetAnalytics[0].date : widget.createdAt
        },
        analytics: {
          totalConversations: widgetTotalConversations,
          totalMessages: widgetTotalMessages,
          uniqueUsers: widgetUniqueUsers,
          averageResponseTime: Math.round(widgetAvgResponseTime),
          lastActivity: widgetAnalytics.length > 0 ? widgetAnalytics[0].date : widget.createdAt
        }
      };
    });

    // Get organization stats if an org is selected
    let orgStats = null;
    if (currentOrgId) {
      const org = await organizations.findOne({ _id: new ObjectId(currentOrgId) });
      const members = await teamMembers.countDocuments({ 
        organizationId: new ObjectId(currentOrgId), 
        status: 'active' 
      });
      const pendingInvitations = await invitations.countDocuments({ 
        organizationId: new ObjectId(currentOrgId), 
        status: 'pending' 
      });
      
      orgStats = {
        members,
        widgets: allWidgets.length,
        conversations: totalConversations,
        pendingInvitations
      };
    }

    const response = {
      overview: {
        totalWidgets: allWidgets.length,
        activeWidgets: activeWidgets.length,
        totalConversations,
        avgResponseTime: Math.round(avgResponseTime),
        avgSatisfaction: avgSatisfaction ? Math.round(avgSatisfaction * 10) / 10 : null,
        satisfaction: satisfactionData,
        organizationStats: orgStats
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

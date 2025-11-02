import clientPromise from '../../../lib/mongodb.js';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { ObjectId } from 'mongodb';
import { getCache, setCache, generateCacheKey } from '../../../lib/cache.js';

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

    // Generate cache key based on org and period
    const cacheKey = generateCacheKey('analytics-overview', {
      orgId: currentOrgId || 'none',
      period,
      customStartDate: customStartDate || 'none',
      customEndDate: customEndDate || 'none'
    });

    // Check for manual refresh parameter
    const shouldRefresh = req.query.refresh === 'true';
    
    // Check cache (60 second TTL for analytics data) - skip if refresh requested
    if (!shouldRefresh) {
      const cached = getCache(cacheKey);
      if (cached) {
        console.log('📦 Cache hit for analytics-overview');
        return res.status(200).json(cached);
      }
    } else {
      console.log('🔄 Manual refresh requested for analytics-overview');
    }

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
    const widgetsWithAnalytics = await Promise.all(allWidgets.map(async widget => {
      // IMPORTANT: Convert widget ID to string for analytics lookup
      // Start with string conversion - we'll update if needed for ObjectId queries
      let widgetIdString = typeof widget._id === 'object' ? widget._id.toString() : String(widget._id);
      
      // Analytics always stores agentId as string, so only match by string
      const widgetAnalytics = analyticsData.filter(data => 
        data.agentId === widgetIdString
      );
      console.log(`📊 Widget ${widget.name} (${widget._id}): Found ${widgetAnalytics.length} analytics records`);
      
      // Count conversations directly from conversations collection
      // Only count conversations that:
      // 1. Have at least one message (messageCount > 0)
      // 2. Have at least one assistant message (handled by OpenAI API)
      const conversations = db.collection('conversations');
      
      // widgetId can be stored as ObjectId or string in conversations
      // Match both possibilities - widgetIdString is already declared above
      // Only convert to ObjectId if it's a valid ObjectId format (24 char hex string)
      let widgetIdObjectId;
      
      if (typeof widget._id === 'object') {
        // Already an ObjectId
        widgetIdObjectId = widget._id;
        // widgetIdString is already set correctly above
      } else if (ObjectId.isValid(widget._id) && widget._id.length === 24) {
        // Valid ObjectId string - convert it
        widgetIdObjectId = new ObjectId(widget._id);
        // widgetIdString is already set correctly above
      } else {
        // Not a valid ObjectId format (e.g., 'cottonshoppen-widget-456')
        // Use as string only - widgetIdString is already set correctly above
        widgetIdObjectId = null; // Don't use ObjectId for query
      }
      
      // Get organization's billing period from quota system (same as admin/widgets.js)
      // This ensures we use the SAME period as the Quota Widget and Widget Cards
      const organization = widget.organizationId ? 
        await organizations.findOne({ _id: new ObjectId(widget.organizationId) }) : 
        null;
      
      // Use organization's quota period dates if available, otherwise use calendar month
      let monthStart, monthEnd;
      if (organization?.usage?.conversations?.lastReset && organization?.usage?.conversations?.nextReset) {
        monthStart = new Date(organization.usage.conversations.lastReset);
        monthEnd = new Date(organization.usage.conversations.nextReset);
      } else {
        // Fallback to calendar month
        const now = new Date();
        monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      }
      
      // Get all conversations for this widget in the billing period
      // Match widgetId as both string and ObjectId, and use createdAt or startTime
      const widgetIdQuery = widgetIdObjectId 
        ? {
            $or: [
              { widgetId: widgetIdObjectId },
              { widgetId: widgetIdString }
            ]
          }
        : { widgetId: widgetIdString }; // Only match string if not a valid ObjectId
      
      const allConversations = await conversations.find({
        $and: [
          widgetIdQuery,
          {
            $or: [
              { createdAt: { $gte: monthStart, $lt: monthEnd } },
              { startTime: { $gte: monthStart, $lt: monthEnd } }
            ]
          }
        ]
      }).toArray();
      
      // Filter to only count conversations with assistant messages and messageCount > 0
      const validConversations = allConversations.filter(conv => {
        // Must have at least one message
        if (!conv.messageCount || conv.messageCount === 0) return false;
        
        // Must have at least one assistant message (handled by OpenAI)
        if (!conv.messages || !Array.isArray(conv.messages)) return false;
        const hasAssistantMessage = conv.messages.some(msg => msg.type === 'assistant');
        return hasAssistantMessage;
      });
      
      const widgetTotalConversations = validConversations.length;
      
      // Calculate total messages from valid conversations only
      // Only count assistant messages (handled by OpenAI API)
      const widgetTotalMessages = validConversations.reduce((sum, conv) => {
        const assistantMessages = conv.messages?.filter(msg => msg.type === 'assistant').length || 0;
        return sum + assistantMessages;
      }, 0);
      
      // Calculate average response time from valid conversations
      const allResponseTimes = validConversations
        .flatMap(conv => conv.messages?.filter(m => m.responseTime && m.type === 'assistant').map(m => m.responseTime) || [])
        .filter(rt => rt != null);
      const widgetAvgResponseTime = allResponseTimes.length > 0 
        ? allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length
        : 0;
      
      // Calculate unique users from valid conversations
      const uniqueUserIds = new Set(validConversations
        .map(conv => conv.sessionId)
        .filter(id => id != null));
      const widgetUniqueUsers = uniqueUserIds.size;

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
    }));

    // Calculate aggregated metrics from widgetsWithAnalytics (which now uses correct conversation counting)
    const totalConversations = widgetsWithAnalytics.reduce((sum, widget) => sum + (widget.stats?.totalConversations || 0), 0);
    const totalMessages = widgetsWithAnalytics.reduce((sum, widget) => sum + (widget.stats?.totalMessages || 0), 0);
    
    // Calculate average response time from all widgets
    const allResponseTimes = widgetsWithAnalytics
      .map(widget => widget.stats?.responseTime || 0)
      .filter(rt => rt > 0);
    const avgResponseTime = allResponseTimes.length > 0 
      ? allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length
      : 0;
    
    // Calculate satisfaction from analytics data (this is still accurate)
    const totalSatisfaction = analyticsData.reduce((sum, data) => sum + (data.metrics?.satisfaction || 0), 0);
    const avgSatisfaction = analyticsData.length > 0 ? totalSatisfaction / analyticsData.length : null;

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
    
    // Cache the response for 60 seconds
    setCache(cacheKey, response, 60);
    console.log('📦 Cached analytics-overview response');
    
    console.log('📊 Sending overview response:', response.overview);
    return res.status(200).json(response);

  } catch (error) {
    console.error('Analytics overview API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

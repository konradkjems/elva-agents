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
    const isPlatformAdmin = session.user?.platformRole === 'platform_admin';

    const client = await clientPromise;
    const db = client.db('elva-agents'); // Use new database
    const analytics = db.collection('analytics');
    const widgets = db.collection('widgets');
    const organizations = db.collection('organizations');
    const teamMembers = db.collection('team_members');
    const invitations = db.collection('invitations');

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
      // Build array of widget IDs (as strings and ObjectIds)
      const widgetIds = allWidgets.map(w => w._id.toString());
      const widgetIdsAsObjects = allWidgets.map(w => w._id);
      
      // Query analytics for these specific widgets
      analyticsData = await analytics.find({
        $or: [
          { agentId: { $in: widgetIds } },
          { agentId: { $in: widgetIdsAsObjects } }
        ]
      }).sort({ date: -1 }).toArray();
      
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

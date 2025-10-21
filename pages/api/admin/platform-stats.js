import clientPromise from '../../../lib/mongodb.js';
import { withAdmin } from '../../../lib/auth';

/**
 * Platform Statistics API
 * 
 * Returns platform-wide statistics for platform administrators
 * Includes total organizations, users, widgets, and conversations
 */

async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db('elva-agents');
    
    // Collections
    const organizations = db.collection('organizations');
    const teamMembers = db.collection('team_members');
    const widgets = db.collection('widgets');
    const analytics = db.collection('analytics');
    
    // Get total organizations count
    const totalOrganizations = await organizations.countDocuments({});
    
    // Get total active users count
    const totalUsers = await teamMembers.countDocuments({ 
      status: 'active' 
    });
    
    // Get total widgets count (excluding demos)
    const totalWidgets = await widgets.countDocuments({ 
      isDemoMode: { $ne: true } 
    });
    
    // Get total conversations from analytics
    // Get all widget IDs first (excluding demos)
    const allWidgets = await widgets.find({ 
      isDemoMode: { $ne: true } 
    }).toArray();
    
    let totalConversations = 0;
    if (allWidgets.length > 0) {
      // Convert widget IDs to strings for analytics lookup
      const widgetIds = allWidgets.map(w => {
        return typeof w._id === 'object' ? w._id.toString() : String(w._id);
      });
      
      // Get all analytics records for these widgets
      const analyticsData = await analytics.find({
        agentId: { $in: widgetIds }
      }).toArray();
      
      // Sum up total conversations
      totalConversations = analyticsData.reduce((sum, data) => 
        sum + (data.metrics?.conversations || 0), 0
      );
    }
    
    // Get active organizations (organizations with at least one active widget)
    const activeWidgets = await widgets.find({ 
      isDemoMode: { $ne: true },
      status: 'active'
    }).toArray();
    
    const activeOrgIds = new Set(
      activeWidgets.map(w => w.organizationId?.toString())
        .filter(id => id) // Remove null/undefined values
    );
    
    const activeOrganizations = activeOrgIds.size;
    
    // Get demo widgets count
    const demoWidgets = await widgets.countDocuments({ 
      isDemoMode: true 
    });
    
    // Get recent activity (widgets updated in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentActivity = await widgets.countDocuments({
      isDemoMode: { $ne: true },
      updatedAt: { $gte: sevenDaysAgo }
    });
    
    const platformStats = {
      totalOrganizations,
      activeOrganizations,
      totalUsers,
      totalWidgets,
      activeWidgets: activeWidgets.length,
      totalConversations,
      demoWidgets,
      recentActivity
    };
    
    console.log('📊 Platform stats:', platformStats);
    
    return res.status(200).json(platformStats);
    
  } catch (error) {
    console.error('Platform stats API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withAdmin(handler);

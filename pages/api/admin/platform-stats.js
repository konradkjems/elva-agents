import { admin } from '../../../lib/supabase/admin';
import { withAdmin } from '../../../lib/auth';

/**
 * Platform Statistics API
 *
 * Returns platform-wide statistics for platform administrators
 * Includes total organizations, users, widgets, and conversations
 */

async function handler(req, res) {
  try {
    // Get total organizations count
    const { count: totalOrganizations } = await admin
      .from('organizations')
      .select('*', { count: 'exact', head: true });

    // Get total active users count
    const { count: totalUsers } = await admin
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get total widgets count (excluding demos)
    const { count: totalWidgets } = await admin
      .from('widgets')
      .select('*', { count: 'exact', head: true })
      .eq('is_demo_mode', false);

    // Get total conversations from analytics
    // Get all widget IDs first (excluding demos)
    const { data: allWidgets, error: widgetsError } = await admin
      .from('widgets')
      .select('id')
      .eq('is_demo_mode', false);
    if (widgetsError) throw widgetsError;

    let totalConversations = 0;
    if (allWidgets && allWidgets.length > 0) {
      const widgetIds = allWidgets.map(w => w.id);

      // Get all analytics records for these widgets
      const { data: analyticsData } = await admin
        .from('analytics')
        .select('metrics')
        .in('widget_id', widgetIds);

      // Sum up total conversations
      totalConversations = (analyticsData || []).reduce((sum, data) =>
        sum + (data.metrics?.conversations || 0), 0
      );
    }

    // Get active organizations (organizations with at least one active widget)
    const { data: activeWidgets, error: activeError } = await admin
      .from('widgets')
      .select('organization_id')
      .eq('is_demo_mode', false)
      .eq('status', 'active');
    if (activeError) throw activeError;

    const activeWidgetRows = activeWidgets || [];
    const activeOrgIds = new Set(
      activeWidgetRows.map(w => w.organization_id)
        .filter(id => id) // Remove null/undefined values
    );

    const activeOrganizations = activeOrgIds.size;

    // Get demo widgets count
    const { count: demoWidgets } = await admin
      .from('widgets')
      .select('*', { count: 'exact', head: true })
      .eq('is_demo_mode', true);

    // Get recent activity (widgets updated in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: recentActivity } = await admin
      .from('widgets')
      .select('*', { count: 'exact', head: true })
      .eq('is_demo_mode', false)
      .gte('updated_at', sevenDaysAgo.toISOString());

    const platformStats = {
      totalOrganizations: totalOrganizations || 0,
      activeOrganizations,
      totalUsers: totalUsers || 0,
      totalWidgets: totalWidgets || 0,
      activeWidgets: activeWidgetRows.length,
      totalConversations,
      demoWidgets: demoWidgets || 0,
      recentActivity: recentActivity || 0
    };

    console.log('📊 Platform stats:', platformStats);

    return res.status(200).json(platformStats);

  } catch (error) {
    console.error('Platform stats API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withAdmin(handler);

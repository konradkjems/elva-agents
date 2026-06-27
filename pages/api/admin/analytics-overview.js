import { admin } from '../../../lib/supabase/admin';
import { fromRow } from '../../../lib/supabase/transform';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { getCache, setCache, generateCacheKey } from '../../../lib/cache.js';

function dateKey(d) {
  return d ? new Date(d).toISOString().split('T')[0] : null;
}

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

    const shouldRefresh = req.query.refresh === 'true';
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
        case '1d': startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
        case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
        case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
        default: startDate = null; // All time
      }
    }

    console.log('📊 Analytics overview date range:', { period, startDate, endDate });

    // Get widgets for current organization (exclude demo widgets)
    let widgetQ = admin.from('widgets').select('*').eq('is_demo_mode', false);
    if (currentOrgId) widgetQ = widgetQ.eq('organization_id', currentOrgId);
    const { data: widgetRows, error: widgetErr } = await widgetQ;
    if (widgetErr) throw widgetErr;
    const allWidgets = fromRows(widgetRows);
    const widgetIds = allWidgets.map(w => w.id);

    // Analytics data for these widgets (widget_id is now a uuid FK)
    let analyticsData = [];
    if (widgetIds.length > 0) {
      let aQ = admin.from('analytics').select('widget_id, date, metrics').in('widget_id', widgetIds);
      if (startDate) {
        aQ = aQ.gte('date', dateKey(startDate));
        if (period === 'custom' && endDate) aQ = aQ.lte('date', dateKey(endDate));
      }
      const { data } = await aQ.order('date', { ascending: false });
      analyticsData = data || [];
    }

    const activeWidgets = allWidgets.filter(w => w.status === 'active');

    // Satisfaction (last 30 days) across the org's widgets
    let satisfactionData = { total: 0, average: 0 };
    if (widgetIds.length > 0) {
      const sEnd = new Date();
      const sStart = new Date();
      sStart.setDate(sEnd.getDate() - 30);
      const { data: satRecords } = await admin
        .from('satisfaction_analytics')
        .select('ratings')
        .in('widget_id', widgetIds)
        .gte('date', dateKey(sStart))
        .lte('date', dateKey(sEnd));

      if (satRecords && satRecords.length > 0) {
        const totalRatings = satRecords.reduce((s, r) => s + (r.ratings?.total || 0), 0);
        const weightedSum = satRecords.reduce((s, r) => s + ((r.ratings?.average || 0) * (r.ratings?.total || 0)), 0);
        satisfactionData = {
          total: totalRatings,
          average: totalRatings > 0 ? Math.round((weightedSum / totalRatings) * 10) / 10 : 0
        };
      }
    }

    // Fetch all conversations for these widgets once, plus the orgs' billing periods.
    let conversationsByWidget = new Map();
    const orgUsage = new Map();
    if (widgetIds.length > 0) {
      const { data: convs } = await admin
        .from('conversations')
        .select('widget_id, messages, message_count, session_id, created_at, start_time')
        .in('widget_id', widgetIds);
      for (const c of (convs || [])) {
        if (!conversationsByWidget.has(c.widget_id)) conversationsByWidget.set(c.widget_id, []);
        conversationsByWidget.get(c.widget_id).push(c);
      }

      const orgIds = [...new Set(allWidgets.map(w => w.organizationId).filter(Boolean))];
      if (orgIds.length > 0) {
        const { data: orgs } = await admin.from('organizations').select('id, usage').in('id', orgIds);
        for (const o of (orgs || [])) orgUsage.set(o.id, o.usage);
      }
    }

    // Per-widget stats computed in-memory
    const widgetsWithAnalytics = allWidgets.map(widget => {
      const widgetAnalytics = analyticsData.filter(a => a.widget_id === widget.id);

      // Billing period from the widget's organization (fallback: calendar month)
      const usage = orgUsage.get(widget.organizationId);
      let monthStart, monthEnd;
      if (usage?.conversations?.lastReset && usage?.conversations?.nextReset) {
        monthStart = new Date(usage.conversations.lastReset);
        monthEnd = new Date(usage.conversations.nextReset);
      } else {
        monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      }

      const widgetConvs = (conversationsByWidget.get(widget.id) || []).filter(conv => {
        const created = conv.created_at ? new Date(conv.created_at) : null;
        const started = conv.start_time ? new Date(conv.start_time) : null;
        const inCreated = created && created >= monthStart && created < monthEnd;
        const inStarted = started && started >= monthStart && started < monthEnd;
        return inCreated || inStarted;
      });

      // Only count conversations with at least one assistant message
      const validConversations = widgetConvs.filter(conv => {
        if (!conv.message_count || conv.message_count === 0) return false;
        if (!Array.isArray(conv.messages)) return false;
        return conv.messages.some(msg => msg.type === 'assistant');
      });

      const widgetTotalConversations = validConversations.length;
      const widgetTotalMessages = validConversations.reduce((sum, conv) =>
        sum + (conv.messages?.filter(m => m.type === 'assistant').length || 0), 0);

      const allResponseTimes = validConversations
        .flatMap(conv => conv.messages?.filter(m => m.responseTime && m.type === 'assistant').map(m => m.responseTime) || [])
        .filter(rt => rt != null);
      const widgetAvgResponseTime = allResponseTimes.length > 0
        ? allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length
        : 0;

      const widgetUniqueUsers = new Set(validConversations.map(c => c.session_id).filter(Boolean)).size;

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

    const totalConversations = widgetsWithAnalytics.reduce((s, w) => s + (w.stats?.totalConversations || 0), 0);
    const totalMessages = widgetsWithAnalytics.reduce((s, w) => s + (w.stats?.totalMessages || 0), 0);

    const responseTimes = widgetsWithAnalytics.map(w => w.stats?.responseTime || 0).filter(rt => rt > 0);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    const totalSatisfaction = analyticsData.reduce((s, a) => s + (a.metrics?.satisfaction || 0), 0);
    const avgSatisfaction = analyticsData.length > 0 ? totalSatisfaction / analyticsData.length : null;

    // Organization stats if an org is selected
    let orgStats = null;
    if (currentOrgId) {
      const { count: members } = await admin.from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrgId).eq('status', 'active');
      const { count: pendingInvitations } = await admin.from('invitations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrgId).eq('status', 'pending');

      orgStats = {
        members: members || 0,
        widgets: allWidgets.length,
        conversations: totalConversations,
        pendingInvitations: pendingInvitations || 0
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

    setCache(cacheKey, response, 60);
    console.log('📊 Sending overview response:', response.overview);
    return res.status(200).json(response);

  } catch (error) {
    console.error('Analytics overview API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

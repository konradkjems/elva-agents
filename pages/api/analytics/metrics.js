import { admin } from '../../../lib/supabase/admin';
import { fromRows } from '../../../lib/supabase/transform';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { getCache, setCache, generateCacheKey } from '../../../lib/cache.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// analytics.date is a DATE column — compare against YYYY-MM-DD strings.
function toDateStr(d) {
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

    const {
      widgetId,
      period = '7d', // 1d, 7d, 30d, 90d, all, custom
      timezone = 'UTC',
      startDate: customStartDate,
      endDate: customEndDate
    } = req.query;

    // Generate cache key based on org, period, and widgetId
    const cacheKey = generateCacheKey('analytics-metrics', {
      orgId: currentOrgId || 'none',
      widgetId: widgetId || 'none',
      period,
      customStartDate: customStartDate || 'none',
      customEndDate: customEndDate || 'none',
      isPlatformAdmin: isPlatformAdmin ? 'true' : 'false'
    });

    // Check for manual refresh parameter
    const shouldRefresh = req.query.refresh === 'true';

    // Check cache (60 second TTL for analytics metrics) - skip if refresh requested
    if (!shouldRefresh) {
      const cached = getCache(cacheKey);
      if (cached) {
        console.log('📦 Cache hit for analytics-metrics');
        return res.status(200).json(cached);
      }
    } else {
      console.log('🔄 Manual refresh requested for analytics-metrics');
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

    // First, get widgets for current organization
    let widgetQuery = admin
      .from('widgets')
      .select('id, name, created_at, updated_at')
      .eq('is_demo_mode', false);

    // Filter by organization unless platform admin viewing all
    if (currentOrgId && UUID_RE.test(currentOrgId)) {
      widgetQuery = widgetQuery.eq('organization_id', currentOrgId);
    }

    const { data: widgetRows, error: widgetErr } = await widgetQuery;
    if (widgetErr) throw widgetErr;

    const orgWidgets = fromRows(widgetRows);
    console.log('📊 Found widgets for organization:', orgWidgets.map(w => ({ id: w._id, name: w.name })));

    // If no widgets, return empty analytics
    if (orgWidgets.length === 0) {
      console.log('📊 No widgets found for organization, returning empty analytics');
      return res.status(200).json({
        period,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        metrics: {
          totalConversations: 0,
          activeConversations: 0,
          completedConversations: 0,
          avgResponseTime: 0,
          avgConversationLength: 0,
          totalMessages: 0,
          avgSatisfaction: null,
          hourlyDistribution: Array(24).fill(0).map((_, hour) => ({ hour: `${hour}:00`, count: 0 })),
          dailyTrends: []
        },
        widgetMetrics: null,
        dataPoints: 0
      });
    }

    // Widget uuids for this organization
    const widgetIds = orgWidgets.map(w => w.id);

    // Build analytics query for widgets in current organization
    let analyticsQuery = admin.from('analytics').select('*');

    // Filter by specific widget if requested
    if (widgetId && widgetId !== 'all') {
      // Verify widget belongs to organization
      const widgetBelongsToOrg = orgWidgets.some(w => w.id === widgetId);
      if (!widgetBelongsToOrg) {
        return res.status(403).json({ error: 'Widget does not belong to your organization' });
      }
      analyticsQuery = analyticsQuery.eq('widget_id', widgetId);
    } else {
      analyticsQuery = analyticsQuery.in('widget_id', widgetIds);
    }

    // Add date filter
    if (startDate) {
      analyticsQuery = analyticsQuery.gte('date', toDateStr(startDate));
      if (period === 'custom' && endDate) {
        analyticsQuery = analyticsQuery.lte('date', toDateStr(endDate));
      }
    }

    // Get analytics data for the period
    const { data: analyticsRows, error: analyticsErr } = await analyticsQuery
      .order('date', { ascending: false })
      .limit(10000);
    if (analyticsErr) throw analyticsErr;

    const analyticsData = fromRows(analyticsRows);
    console.log('📊 Analytics query:', { widgetId, period, startDate, analyticsCount: analyticsData.length });

    // Calculate aggregated metrics
    const metrics = calculateAggregatedMetrics(analyticsData, period);

    // Get widget-specific metrics if widgetId provided
    let widgetMetrics = null;
    if (widgetId && widgetId !== 'all') {
      widgetMetrics = await getWidgetMetrics(widgetId, startDate);
    }

    // Get individual widget analytics for overview
    const widgetsWithAnalytics = await Promise.all(orgWidgets.map(async (widget) => {
      let widgetAnalyticsQuery = admin
        .from('analytics')
        .select('metrics')
        .eq('widget_id', widget.id);
      if (startDate) {
        widgetAnalyticsQuery = widgetAnalyticsQuery.gte('date', toDateStr(startDate));
        if (period === 'custom' && endDate) {
          widgetAnalyticsQuery = widgetAnalyticsQuery.lte('date', toDateStr(endDate));
        }
      }

      const { data: widgetAnalyticsRows } = await widgetAnalyticsQuery;
      const widgetAnalyticsData = fromRows(widgetAnalyticsRows);
      const totalConversations = widgetAnalyticsData.reduce((sum, data) => sum + (data.metrics?.conversations || 0), 0);
      const totalMessages = widgetAnalyticsData.reduce((sum, data) => sum + (data.metrics?.messages || 0), 0);
      const totalResponseTime = widgetAnalyticsData.reduce((sum, data) => sum + (data.metrics?.responseTime || 0), 0);
      const avgResponseTime = widgetAnalyticsData.length > 0 ? totalResponseTime / widgetAnalyticsData.length : 0;
      const uniqueUsers = widgetAnalyticsData.reduce((sum, data) => sum + (data.metrics?.uniqueUsers || 0), 0);

      return {
        _id: widget.id,
        name: widget.name,
        stats: {
          conversations: totalConversations,
          messages: totalMessages,
          responseTime: avgResponseTime,
          uniqueUsers: uniqueUsers
        }
      };
    }));

    const response = {
      period,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      metrics,
      widgetMetrics,
      widgetsWithAnalytics,
      dataPoints: analyticsData.length
    };

    // Cache the response for 60 seconds
    setCache(cacheKey, response, 60);
    console.log('📦 Cached analytics-metrics response');

    return res.status(200).json(response);

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
  const uniqueUsers = analyticsData.reduce((sum, data) => sum + (data.metrics?.uniqueUsers || 0), 0);

  const avgResponseTime = analyticsData.length > 0 ? totalResponseTime / analyticsData.length : 0;
  const avgConversationLength = totalConversations > 0 ? totalMessages / totalConversations : 0;
  const avgSatisfaction = analyticsData.length > 0 ? totalSatisfaction / analyticsData.length : null;

  console.log('📈 Aggregated metrics calculation:', {
    dataPoints: analyticsData.length,
    totalConversations,
    totalMessages,
    uniqueUsers: uniqueUsers,
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
    uniqueUsers: uniqueUsers,
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

async function getWidgetMetrics(widgetId, startDate) {
  const { data: widget } = await admin
    .from('widgets')
    .select('name, created_at, updated_at')
    .eq('id', widgetId)
    .maybeSingle();

  if (!widget) {
    return null;
  }

  // Get analytics data for this widget
  let query = admin.from('analytics').select('metrics').eq('widget_id', widgetId);
  if (startDate) {
    query = query.gte('date', toDateStr(startDate));
  }

  const { data: rows } = await query;
  const analyticsData = fromRows(rows);
  const totalConversations = analyticsData.reduce((sum, data) => sum + (data.metrics?.conversations || 0), 0);
  const totalMessages = analyticsData.reduce((sum, data) => sum + (data.metrics?.messages || 0), 0);
  const totalResponseTime = analyticsData.reduce((sum, data) => sum + (data.metrics?.avgResponseTime || 0), 0);
  const avgResponseTime = analyticsData.length > 0 ? totalResponseTime / analyticsData.length : 0;
  const uniqueUsers = analyticsData.reduce((sum, data) => sum + (data.metrics?.uniqueUsers || 0), 0);

  return {
    widgetId: widgetId,
    widgetName: widget.name,
    createdAt: widget.created_at,
    lastUpdated: widget.updated_at,
    totalConversations,
    totalMessages,
    responseTime: avgResponseTime,
    uniqueUsers: uniqueUsers,
    analyticsDataPoints: analyticsData.length
  };
}

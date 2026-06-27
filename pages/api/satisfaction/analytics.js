import { admin } from '../../../lib/supabase/admin';
import { fromRows } from '../../../lib/supabase/transform';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    // Resolve the widget embed id / uuid to the widget uuid (FK in analytics)
    const widgetUuid = await resolveWidgetUuid(widgetId);
    if (!widgetUuid) {
      return res.status(404).json({ error: 'Widget not found' });
    }

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

    const startKey = startDate.toISOString().split('T')[0];
    const endKey = endDate.toISOString().split('T')[0];

    // Get satisfaction analytics for the time range
    const { data: analyticsRows, error: analyticsErr } = await admin
      .from('satisfaction_analytics')
      .select('*')
      .eq('widget_id', widgetUuid)
      .gte('date', startKey)
      .lte('date', endKey)
      .order('date', { ascending: true });
    if (analyticsErr) throw analyticsErr;

    const analytics = fromRows(analyticsRows);

    // Aggregate the data
    const aggregated = aggregateSatisfactionData(analytics);

    // Get conversation-level satisfaction data for additional insights
    const { data: convRows } = await admin
      .from('conversations')
      .select('id, satisfaction')
      .eq('widget_id', widgetUuid)
      .not('satisfaction', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1000);

    const recentRatings = (convRows || [])
      .map(c => c.satisfaction ? { id: c.id, ...c.satisfaction } : null)
      .filter(s => s && s.rating != null && s.submittedAt)
      .filter(s => {
        const t = new Date(s.submittedAt);
        return t >= startDate && t <= endDate;
      })
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .slice(0, 100)
      .map(s => ({
        rating: s.rating,
        feedback: s.feedback,
        submittedAt: s.submittedAt,
        conversationId: s.id
      }));

    // Calculate trends
    const trends = calculateTrends(analytics, timeRange);

    res.status(200).json({
      success: true,
      data: {
        ...aggregated,
        trends,
        recentRatings
      }
    });

  } catch (error) {
    console.error('Satisfaction analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch satisfaction analytics' });
  }
}

async function resolveWidgetUuid(widgetId) {
  let { data } = await admin.from('widgets').select('id').eq('legacy_id', String(widgetId)).maybeSingle();
  if (!data && UUID_RE.test(widgetId)) {
    ({ data } = await admin.from('widgets').select('id').eq('id', widgetId).maybeSingle());
  }
  return data?.id || null;
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
    const dateKey = String(record.date).split('T')[0];
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

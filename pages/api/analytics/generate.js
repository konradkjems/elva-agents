import { admin } from '../../../lib/supabase/admin';
import { fromRows } from '../../../lib/supabase/transform';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all conversations (paginated to bypass the per-request row cap)
    const allConversations = [];
    const batchSize = 1000;
    let offset = 0;
    while (true) {
      const { data, error } = await admin
        .from('conversations')
        .select('widget_id, start_time, message_count, messages, satisfaction')
        .range(offset, offset + batchSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      allConversations.push(...fromRows(data));
      if (data.length < batchSize) break;
      offset += batchSize;
    }

    console.log(`📊 Found ${allConversations.length} conversations to process`);

    if (allConversations.length === 0) {
      return res.status(200).json({
        message: 'No conversations found',
        analyticsGenerated: 0
      });
    }

    // Group conversations by widgetId and date
    const groupedData = {};

    allConversations.forEach(conv => {
      const widgetId = conv.widgetId;

      // Skip conversations not tied to a real widget uuid
      if (!widgetId || !UUID_RE.test(widgetId)) {
        return;
      }

      const date = new Date(conv.startTime);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!groupedData[widgetId]) {
        groupedData[widgetId] = {};
      }

      if (!groupedData[widgetId][dateKey]) {
        groupedData[widgetId][dateKey] = {
          conversations: 0,
          messages: 0,
          totalResponseTime: 0,
          responseTimeCount: 0,
          satisfactionSum: 0,
          satisfactionCount: 0,
          hourly: Array(24).fill(0)
        };
      }

      const dayData = groupedData[widgetId][dateKey];
      dayData.conversations++;
      dayData.messages += conv.messageCount || 0;

      // Calculate response time from messages
      if (conv.messages) {
        conv.messages.forEach(msg => {
          if (msg.responseTime) {
            dayData.totalResponseTime += msg.responseTime;
            dayData.responseTimeCount++;
          }
        });
      }

      // Add satisfaction if available
      if (conv.satisfaction !== null && conv.satisfaction !== undefined) {
        dayData.satisfactionSum += conv.satisfaction;
        dayData.satisfactionCount++;
      }

      // Add to hourly distribution
      const hour = date.getHours();
      dayData.hourly[hour]++;
    });

    // Generate analytics documents
    let analyticsGenerated = 0;

    for (const [widgetId, widgetData] of Object.entries(groupedData)) {
      for (const [dateKey, dayData] of Object.entries(widgetData)) {
        const avgResponseTime = dayData.responseTimeCount > 0
          ? dayData.totalResponseTime / dayData.responseTimeCount
          : 0;

        const avgSatisfaction = dayData.satisfactionCount > 0
          ? dayData.satisfactionSum / dayData.satisfactionCount
          : null;

        // Calculate actual unique users for this widget on this date
        const dayStart = new Date(dateKey);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        const { data: sessionRows } = await admin
          .from('conversations')
          .select('session_id')
          .eq('widget_id', widgetId)
          .gte('created_at', dayStart.toISOString())
          .lt('created_at', dayEnd.toISOString());
        const uniqueUsers = [...new Set((sessionRows || []).map(r => r.session_id).filter(Boolean))];

        const analyticsDoc = {
          widget_id: widgetId,
          date: dateKey,
          metrics: {
            conversations: dayData.conversations,
            messages: dayData.messages,
            uniqueUsers: uniqueUsers.length, // Use actual count
            responseRate: 100, // Simplified
            avgResponseTime: Math.round(avgResponseTime),
            satisfaction: avgSatisfaction ? Math.round(avgSatisfaction * 10) / 10 : null
          },
          hourly: dayData.hourly.reduce((acc, count, hour) => {
            acc[hour.toString()] = count;
            return acc;
          }, {})
        };

        // Insert or update analytics document (unique on widget_id + date)
        const { error: upsertErr } = await admin
          .from('analytics')
          .upsert(analyticsDoc, { onConflict: 'widget_id,date' });
        if (upsertErr) throw upsertErr;

        analyticsGenerated++;
      }
    }

    console.log(`✅ Generated ${analyticsGenerated} analytics documents`);

    return res.status(200).json({
      message: 'Analytics data generated successfully',
      conversationsProcessed: allConversations.length,
      analyticsGenerated: analyticsGenerated
    });

  } catch (error) {
    console.error('Analytics generation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

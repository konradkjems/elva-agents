import { admin } from '../../../../../lib/supabase/admin';
import { fromRows } from '../../../../../lib/supabase/transform';
import { withAdmin } from '../../../../../lib/auth';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { widgetId } = req.query;
    const {
      period = 'all',
      search = '',
      limit = 100,
      offset = 0
    } = req.query;

    // The URL param may be the public/embed id (legacy_id) or the uuid.
    // Resolve to the widget uuid so we can filter conversations by widget_id.
    let { data: widgetRow } = await admin
      .from('widgets')
      .select('id')
      .eq('legacy_id', widgetId)
      .maybeSingle();
    if (!widgetRow && UUID_RE.test(widgetId)) {
      ({ data: widgetRow } = await admin
        .from('widgets')
        .select('id')
        .eq('id', widgetId)
        .maybeSingle());
    }

    if (!widgetRow) {
      console.log(`📞 Widget not found for id ${widgetId}`);
      return res.status(200).json([]);
    }

    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);

    // Build conversations query scoped to the widget uuid
    let query = admin
      .from('conversations')
      .select('*')
      .eq('widget_id', widgetRow.id);

    // Add date filtering — match either created_at or start_time
    if (period !== 'all') {
      const now = new Date();
      let startDate;

      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      if (startDate) {
        const iso = startDate.toISOString();
        query = query.or(`created_at.gte.${iso},start_time.gte.${iso}`);
      }
    }

    query = query
      .order('start_time', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    console.log('📞 Conversations query:', { widgetId, widgetUuid: widgetRow.id, period, search });

    const { data, error } = await query;
    if (error) throw error;

    let allConversations = fromRows(data);

    // Search filtering on JSONB message content (applied in JS — Postgres jsonb
    // arrays aren't directly substring-searchable via PostgREST)
    if (search) {
      const needle = String(search).toLowerCase();
      allConversations = allConversations.filter(conv =>
        Array.isArray(conv.messages) &&
        conv.messages.some(msg => (msg.content || '').toLowerCase().includes(needle))
      );
    }

    console.log(`📞 Found ${allConversations.length} conversations for widget ${widgetId}`);

    // Filter to only include conversations with assistant messages and messageCount > 0
    const validConversations = allConversations.filter(conv => {
      // Must have at least one message
      if (!conv.messageCount || conv.messageCount === 0) return false;

      // Must have at least one assistant message (handled by OpenAI)
      if (!conv.messages || !Array.isArray(conv.messages)) return false;
      const hasAssistantMessage = conv.messages.some(msg => msg.type === 'assistant');
      return hasAssistantMessage;
    });

    console.log(`📞 Filtered to ${validConversations.length} valid conversations (with assistant messages)`);

    // Transform data for frontend
    // messageCount should only count assistant messages
    const transformedConversations = validConversations.map(conv => {
      const assistantMessageCount = conv.messages?.filter(msg => msg.type === 'assistant').length || 0;

      return {
        _id: conv._id,
        widgetId: conv.widgetId,
        sessionId: conv.sessionId,
        startTime: conv.startTime,
        endTime: conv.endTime,
        messageCount: assistantMessageCount, // Only count assistant messages
        satisfaction: conv.satisfaction,
        messages: conv.messages || [],
        metadata: {
          country: conv.metadata?.country,
          referrer: conv.metadata?.referrer,
          userAgent: conv.metadata?.userAgent,
          ip: conv.metadata?.ip
        }
      };
    });

    return res.status(200).json(transformedConversations);

  } catch (error) {
    console.error('Error fetching conversations:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withAdmin(handler);

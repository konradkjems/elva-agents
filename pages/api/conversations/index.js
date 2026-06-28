import { admin } from '../../../lib/supabase/admin';
import { fromRows, fromRow, camelToSnake } from '../../../lib/supabase/transform';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  try {
    switch (req.method) {
      case 'GET':
        return await getConversations(req, res);
      case 'POST':
        return await createConversation(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Conversations API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getConversations(req, res) {
  const {
    widgetId,
    page = 1,
    limit = 20,
    startDate,
    endDate,
    sortBy = 'startTime',
    sortOrder = 'desc'
  } = req.query;

  try {
    // Request the total count alongside the page of rows
    let query = admin.from('conversations').select('*', { count: 'exact' });

    if (widgetId) {
      // widget_id is the uuid FK; the embed identifier lives on widget_legacy_id
      if (UUID_RE.test(widgetId)) {
        query = query.eq('widget_id', widgetId);
      } else {
        query = query.eq('widget_legacy_id', widgetId);
      }
    }

    if (startDate) query = query.gte('start_time', new Date(startDate).toISOString());
    if (endDate) query = query.lte('start_time', new Date(endDate).toISOString());

    // Sort (map the camelCase sort field to its snake_case column)
    const sortColumn = camelToSnake(sortBy);
    query = query.order(sortColumn, { ascending: sortOrder !== 'desc' });

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    query = query.range(skip, skip + limitNum - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    const conversationList = fromRows(data);
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limitNum);

    return res.status(200).json({
      conversations: conversationList,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    return res.status(500).json({ error: 'Failed to fetch conversations' });
  }
}

async function createConversation(req, res) {
  const {
    widgetId,
    sessionId,
    userId,
    metadata = {}
  } = req.body;

  if (!widgetId || !sessionId) {
    return res.status(400).json({
      error: 'widgetId and sessionId are required'
    });
  }

  try {
    // Resolve the widget uuid for the FK. The embed id is kept on
    // widget_legacy_id regardless.
    let widgetUuid = UUID_RE.test(widgetId) ? widgetId : null;
    if (!widgetUuid) {
      const { data: w } = await admin
        .from('widgets')
        .select('id')
        .eq('legacy_id', widgetId)
        .maybeSingle();
      if (w) widgetUuid = w.id;
    }

    const row = {
      widget_id: widgetUuid,
      widget_legacy_id: String(widgetId),
      session_id: sessionId,
      user_id: userId || null,
      start_time: new Date().toISOString(),
      end_time: null,
      message_count: 0,
      messages: [],
      satisfaction: null,
      tags: [],
      metadata: {
        userAgent: req.headers['user-agent'] || '',
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress || '',
        country: metadata.country || null,
        referrer: metadata.referrer || null,
        ...metadata
      }
    };

    const { data: inserted, error } = await admin
      .from('conversations')
      .insert(row)
      .select('*')
      .single();
    if (error) throw error;

    return res.status(201).json({
      success: true,
      conversationId: inserted.id,
      conversation: fromRow(inserted)
    });

  } catch (error) {
    console.error('Error creating conversation:', error);
    return res.status(500).json({ error: 'Failed to create conversation' });
  }
}

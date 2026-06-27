/**
 * Audit Logs API
 *
 * GET /api/admin/audit-logs - View audit trail of GDPR actions
 *
 * GDPR Accountability requirement (Article 5(2))
 */

import { getToken } from 'next-auth/jwt';
import { admin } from '../../../lib/supabase/admin';
import { fromRows } from '../../../lib/supabase/transform';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Query parameters
    const {
      page = '1',
      limit = '50',
      action,
      userId,
      startDate,
      endDate
    } = req.query;

    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    // Build query with filters
    let query = admin
      .from('audit_log')
      .select('*', { count: 'exact' });

    if (action) {
      query = query.eq('action', action);
    }

    if (userId && UUID_RE.test(userId)) {
      query = query.eq('user_id', userId);
    }

    if (startDate) {
      query = query.gte('timestamp', new Date(startDate).toISOString());
    }
    if (endDate) {
      query = query.lte('timestamp', new Date(endDate).toISOString());
    }

    query = query.order('timestamp', { ascending: false }).range(from, to);

    const { data: rows, count, error } = await query;
    if (error) throw error;

    const logs = fromRows(rows);
    const total = count || 0;

    // Get unique actions for filter dropdown
    const { data: actionRows } = await admin
      .from('audit_log')
      .select('action');
    const actions = [...new Set((actionRows || []).map(r => r.action).filter(Boolean))];

    return res.status(200).json({
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      actions, // For dropdown filter
      filters: {
        action,
        userId,
        startDate,
        endDate
      }
    });

  } catch (error) {
    console.error('❌ Error fetching audit logs:', error);
    return res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
}

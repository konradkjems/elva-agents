/**
 * Audit Logs API
 * 
 * GET /api/admin/audit-logs - View audit trail of GDPR actions
 * 
 * GDPR Accountability requirement (Article 5(2))
 */

import { getToken } from 'next-auth/jwt';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const client = await clientPromise;
    const db = client.db('elva-agents');

    // Query parameters
    const { 
      page = '1', 
      limit = '50', 
      action, 
      userId,
      startDate,
      endDate 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const filter = {};
    
    if (action) {
      filter.action = action;
    }
    
    if (userId) {
      filter.userId = new ObjectId(userId);
    }
    
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate);
      }
    }

    // Get audit logs
    const logs = await db.collection('audit_log')
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    // Get total count
    const total = await db.collection('audit_log').countDocuments(filter);

    // Get unique actions for filter
    const actions = await db.collection('audit_log').distinct('action');

    return res.status(200).json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
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


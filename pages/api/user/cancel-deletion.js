/**
 * Cancel Account Deletion API
 * GDPR compliance - allow users to cancel deletion during grace period
 * 
 * POST /api/user/cancel-deletion - Restore account from pending deletion
 */

import { getSession } from 'next-auth/react';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });
    
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = new ObjectId(session.user.id);
    const client = await clientPromise;
    const db = client.db('elva-agents');

    // Restore account
    const result = await db.collection('users').updateOne(
      { _id: userId, status: 'pending_deletion' },
      {
        $set: {
          status: 'active'
        },
        $unset: {
          deletionScheduledAt: '',
          deletionDate: '',
          deletionReason: ''
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'No pending deletion found' });
    }

    // Log the cancellation
    await db.collection('audit_log').insertOne({
      userId: userId,
      action: 'account_deletion_cancelled',
      timestamp: new Date()
    });

    console.log(`✅ Account deletion cancelled for user ${userId}`);

    return res.status(200).json({ message: 'Account deletion cancelled successfully' });

  } catch (error) {
    console.error('❌ Cancel deletion error:', error);
    return res.status(500).json({ error: 'Failed to cancel deletion' });
  }
}


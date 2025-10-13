/**
 * User Account Deletion API
 * GDPR Article 17 (Right to Erasure / Right to be Forgotten)
 * 
 * POST /api/user/delete-account - Request account deletion with 30-day grace period
 */

import { getSession } from 'next-auth/react';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { verifyPassword } from '../../../lib/password';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });
    
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { confirmPassword, reason } = req.body;

    if (!confirmPassword) {
      return res.status(400).json({ error: 'Password confirmation required' });
    }

    const userId = new ObjectId(session.user.id);
    const client = await clientPromise;
    const db = client.db('elva-agents');

    // 1. Get user and verify password
    const user = await db.collection('users').findOne({ _id: userId });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify password (using bcrypt from Sprint 1)
    const isValidPassword = await verifyPassword(confirmPassword, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // 2. Mark for deletion (grace period of 30 days)
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

    await db.collection('users').updateOne(
      { _id: userId },
      {
        $set: {
          status: 'pending_deletion',
          deletionScheduledAt: new Date(),
          deletionDate: deletionDate,
          deletionReason: reason || 'User requested',
        }
      }
    );

    // 3. Log the deletion request (GDPR audit requirement)
    await db.collection('audit_log').insertOne({
      userId: userId,
      action: 'account_deletion_requested',
      timestamp: new Date(),
      metadata: {
        reason: reason,
        deletionDate: deletionDate,
        gracePeriodDays: 30
      }
    });

    console.log(`⚠️ Account deletion requested for user ${user.email}, scheduled for ${deletionDate.toISOString()}`);

    // 4. Send confirmation email (optional, depends on email setup)
    // TODO: Add email notification in future sprint
    // await sendAccountDeletionEmail({ email: user.email, name: user.name, deletionDate });

    return res.status(200).json({
      message: 'Account marked for deletion',
      deletionDate: deletionDate,
      gracePeriodDays: 30,
      note: 'You can cancel this request within 30 days by logging in again'
    });

  } catch (error) {
    console.error('❌ Account deletion error:', error);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
}


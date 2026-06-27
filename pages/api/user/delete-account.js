/**
 * User Account Deletion API
 * GDPR Article 17 (Right to Erasure / Right to be Forgotten)
 *
 * POST /api/user/delete-account - Request account deletion with 30-day grace period
 */

import { getSessionContext } from '../../../lib/supabase/session';
import { admin } from '../../../lib/supabase/admin';
import { verifyPassword } from '../../../lib/password';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSessionContext(req, res);

    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { confirmPassword, reason } = req.body;

    if (!confirmPassword) {
      return res.status(400).json({ error: 'Password confirmation required' });
    }

    const userId = session.user.id;
    if (!UUID_RE.test(userId)) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 1. Get user and verify password
    const { data: user } = await admin
      .from('users')
      .select('id, email, password_hash')
      .eq('id', userId)
      .maybeSingle();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify password (using bcrypt from Sprint 1)
    const isValidPassword = await verifyPassword(confirmPassword, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // 2. Mark for deletion (grace period of 30 days)
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

    const { error: updErr } = await admin
      .from('users')
      .update({
        status: 'pending_deletion',
        deletion_scheduled_at: new Date().toISOString(),
        deletion_date: deletionDate.toISOString(),
        deletion_reason: reason || 'User requested'
      })
      .eq('id', userId);
    if (updErr) throw updErr;

    // 3. Log the deletion request (GDPR audit requirement)
    await admin.from('audit_log').insert({
      action: 'account_deletion_requested',
      user_id: userId,
      metadata: {
        reason: reason,
        deletionDate: deletionDate.toISOString(),
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

/**
 * Cancel Account Deletion API
 * GDPR compliance - allow users to cancel deletion during grace period
 *
 * POST /api/user/cancel-deletion - Restore account from pending deletion
 */

import { getSessionContext } from '../../../lib/supabase/session';
import { admin } from '../../../lib/supabase/admin';

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

    const userId = session.user.id;
    if (!UUID_RE.test(userId)) {
      return res.status(404).json({ error: 'No pending deletion found' });
    }

    // Restore account (only if currently pending deletion)
    const { data: restored, error: updErr } = await admin
      .from('users')
      .update({
        status: 'active',
        deletion_scheduled_at: null,
        deletion_date: null,
        deletion_reason: null
      })
      .eq('id', userId)
      .eq('status', 'pending_deletion')
      .select('id');
    if (updErr) throw updErr;

    if (!restored || restored.length === 0) {
      return res.status(404).json({ error: 'No pending deletion found' });
    }

    // Log the cancellation
    await admin.from('audit_log').insert({
      action: 'account_deletion_cancelled',
      user_id: userId
    });

    console.log(`✅ Account deletion cancelled for user ${userId}`);

    return res.status(200).json({ message: 'Account deletion cancelled successfully' });

  } catch (error) {
    console.error('❌ Cancel deletion error:', error);
    return res.status(500).json({ error: 'Failed to cancel deletion' });
  }
}

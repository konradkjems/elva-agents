/**
 * Single Invitation Management API
 *
 * DELETE /api/organizations/[id]/invitations/[invitationId] - Cancel invitation
 * POST /api/organizations/[id]/invitations/[invitationId]/resend - Resend invitation
 */
import { admin } from '../../../../../lib/supabase/admin';
import { getSessionContext } from '../../../../../lib/supabase/session';
import { fromRow } from '../../../../../lib/supabase/transform';
import { getUserTeamRole } from '../../../../../lib/roleCheck';

// Helper to check if user is platform admin
async function isPlatformAdmin(userId) {
  const { data: user } = await admin
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  return user && user.role === 'platform_admin';
}

export default async function handler(req, res) {
  try {
    // Check authentication
    const session = await getSessionContext(req, res);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = session.user.id;
    const { id: orgId, invitationId } = req.query;

    if (!orgId) {
      return res.status(400).json({ error: 'Invalid organization ID' });
    }

    if (!invitationId) {
      return res.status(400).json({ error: 'Invalid invitation ID' });
    }

    // Get organization
    const { data: organization } = await admin
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .is('deleted_at', null)
      .maybeSingle();

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check permissions
    const userRole = await getUserTeamRole(userId, orgId);
    const isAdmin = await isPlatformAdmin(userId);

    if (!userRole && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get invitation
    const { data: invitationRow } = await admin
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (!invitationRow) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    const invitation = fromRow(invitationRow);

    // ========================================
    // DELETE - Cancel Invitation
    // ========================================
    if (req.method === 'DELETE') {
      // Check permissions - must be owner/admin or platform admin
      if (!isAdmin && !['owner', 'admin'].includes(userRole)) {
        return res.status(403).json({ error: 'Only owners and admins can cancel invitations' });
      }

      // Can only cancel pending invitations
      if (invitation.status !== 'pending') {
        return res.status(400).json({ error: 'Only pending invitations can be cancelled' });
      }

      await admin
        .from('invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      return res.status(200).json({ message: 'Invitation cancelled successfully' });
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Invitation management API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

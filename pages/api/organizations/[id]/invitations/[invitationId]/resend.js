/**
 * Resend Invitation API
 *
 * POST /api/organizations/[id]/invitations/[invitationId]/resend - Resend invitation email
 */
import { admin } from '../../../../../../lib/supabase/admin';
import { getSessionContext } from '../../../../../../lib/supabase/session';
import { fromRow } from '../../../../../../lib/supabase/transform';
import { getUserTeamRole } from '../../../../../../lib/roleCheck';
import crypto from 'crypto';
import { sendInvitationEmail } from '../../../../../../lib/email';

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    // Check permissions - must be owner/admin or platform admin
    if (!isAdmin && !['owner', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Only owners and admins can resend invitations' });
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

    // Can only resend pending invitations
    if (invitation.status !== 'pending') {
      return res.status(400).json({
        error: 'Only pending invitations can be resent',
        status: invitation.status
      });
    }

    // Generate new token and extend expiration
    const newToken = crypto.randomBytes(32).toString('hex');
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    await admin
      .from('invitations')
      .update({
        token: newToken,
        expires_at: newExpiresAt.toISOString()
      })
      .eq('id', invitationId);

    // Send invitation email with new token
    try {
      await sendInvitationEmail({
        email: invitation.email,
        organizationName: organization.name,
        inviterName: session.user.name,
        token: newToken,
        role: invitation.role
      });
      console.log('✅ Invitation email resent to', invitation.email);
    } catch (emailError) {
      console.error('⚠️  Failed to send invitation email:', emailError);
      // Continue anyway - invitation is updated even if email fails
    }

    return res.status(200).json({
      message: 'Invitation resent successfully',
      expiresAt: newExpiresAt
    });

  } catch (error) {
    console.error('Resend invitation API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

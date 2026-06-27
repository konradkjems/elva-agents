/**
 * Organization Invitations API
 *
 * POST /api/organizations/[id]/invitations - Send invitation
 * GET /api/organizations/[id]/invitations - List invitations (implemented in [id]/index.js)
 * DELETE /api/organizations/[id]/invitations/[invitationId] - Cancel invitation
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { admin } from '../../../../lib/supabase/admin';
import { fromRow } from '../../../../lib/supabase/transform';
import { getUserTeamRole } from '../../../../lib/roleCheck';
import crypto from 'crypto';
import { sendInvitationEmail } from '../../../../lib/email';

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
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = session.user.id;
    const { id: orgId } = req.query;

    if (!orgId) {
      return res.status(400).json({ error: 'Invalid organization ID' });
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

    // ========================================
    // POST - Send Invitation
    // ========================================
    if (req.method === 'POST') {
      // Check permissions - must be owner/admin or platform admin
      if (!isAdmin && !['owner', 'admin'].includes(userRole)) {
        return res.status(403).json({ error: 'Only owners and admins can invite members' });
      }

      const { email, role } = req.body;

      // Validate email
      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email is required' });
      }

      // Validate role
      const validRoles = ['owner', 'admin', 'member', 'viewer'];
      if (!role || !validRoles.includes(role)) {
        return res.status(400).json({ error: 'Valid role is required (owner, admin, member, or viewer)' });
      }

      // Normalize email
      const normalizedEmail = email.toLowerCase().trim();

      // Check if user is already a member
      const { data: existingUser } = await admin
        .from('users')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existingUser) {
        const { data: existingMember } = await admin
          .from('team_members')
          .select('id')
          .eq('organization_id', orgId)
          .eq('user_id', existingUser.id)
          .in('status', ['active', 'invited'])
          .maybeSingle();

        if (existingMember) {
          return res.status(409).json({
            error: 'User is already a member of this organization'
          });
        }
      }

      // Check for pending invitation
      const { data: existingInvitation } = await admin
        .from('invitations')
        .select('id')
        .eq('organization_id', orgId)
        .eq('email', normalizedEmail)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (existingInvitation) {
        return res.status(409).json({
          error: 'An invitation has already been sent to this email'
        });
      }

      // Generate invitation token
      const token = crypto.randomBytes(32).toString('hex');

      // Create invitation
      const { data: invitationRow, error: invErr } = await admin
        .from('invitations')
        .insert({
          organization_id: orgId,
          email: normalizedEmail,
          role,
          token,
          invited_by: userId,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        })
        .select('*')
        .single();
      if (invErr) throw invErr;

      const invitation = fromRow(invitationRow);

      // Send invitation email
      try {
        await sendInvitationEmail({
          email: normalizedEmail,
          organizationName: organization.name,
          inviterName: session.user.name,
          token,
          role
        });
        console.log('✅ Invitation email sent to', normalizedEmail);
      } catch (emailError) {
        console.error('⚠️  Failed to send invitation email:', emailError);
        // Continue anyway - invitation is created even if email fails
      }

      // Get inviter details for response
      const { data: inviterRow } = await admin
        .from('users')
        .select('id, name, email')
        .eq('id', userId)
        .maybeSingle();
      const inviter = fromRow(inviterRow);

      return res.status(201).json({
        invitation: {
          _id: invitation._id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt,
          invitedBy: {
            _id: inviter._id,
            name: inviter.name,
            email: inviter.email
          }
        },
        message: 'Invitation sent successfully'
      });
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Invitations API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

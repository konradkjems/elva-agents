/**
 * Public Invitation API
 *
 * GET /api/invitations/[token] - Get invitation details
 * POST /api/invitations/[token]/accept - Accept invitation
 * POST /api/invitations/[token]/decline - Decline invitation
 */
import { admin } from '../../../lib/supabase/admin';
import { getSessionContext } from '../../../lib/supabase/session';
import { fromRow } from '../../../lib/supabase/transform';

export default async function handler(req, res) {
  try {
    const { token, action } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Invalid invitation token' });
    }

    // Get invitation
    const { data: invitationRow } = await admin
      .from('invitations')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (!invitationRow) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    const invitation = fromRow(invitationRow);

    // ========================================
    // GET - Get Invitation Details
    // ========================================
    if (req.method === 'GET') {
      // Check if invitation is still valid
      if (invitation.status !== 'pending') {
        return res.status(400).json({
          error: 'This invitation is no longer valid',
          status: invitation.status
        });
      }

      if (new Date(invitation.expiresAt) < new Date()) {
        // Mark as expired
        await admin
          .from('invitations')
          .update({ status: 'expired' })
          .eq('id', invitation.id);

        return res.status(400).json({
          error: 'This invitation has expired',
          status: 'expired'
        });
      }

      // Get organization details
      const { data: organizationRow } = await admin
        .from('organizations')
        .select('*')
        .eq('id', invitation.organizationId)
        .maybeSingle();

      if (!organizationRow) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      const organization = fromRow(organizationRow);

      // Get inviter details
      const { data: inviterRow } = await admin
        .from('users')
        .select('*')
        .eq('id', invitation.invitedBy)
        .maybeSingle();
      const inviter = fromRow(inviterRow);

      return res.status(200).json({
        invitation: {
          _id: invitation._id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt
        },
        organization: {
          _id: organization._id,
          name: organization.name,
          logo: organization.logo,
          plan: organization.plan
        },
        inviter: {
          name: inviter?.name || 'Team Admin',
          email: inviter?.email
        }
      });
    }

    // ========================================
    // POST - Accept or Decline Invitation
    // ========================================
    if (req.method === 'POST') {
      // Check authentication
      const session = await getSessionContext(req, res);
      if (!session) {
        return res.status(401).json({ error: 'You must be logged in to accept invitations' });
      }

      const userEmail = session.user.email.toLowerCase().trim();
      const invitationEmail = invitation.email.toLowerCase().trim();

      // Verify email matches
      if (userEmail !== invitationEmail) {
        return res.status(403).json({
          error: 'This invitation was sent to a different email address',
          invitationEmail: invitation.email,
          yourEmail: session.user.email
        });
      }

      // Check if invitation is still valid
      if (invitation.status !== 'pending') {
        return res.status(400).json({
          error: 'This invitation is no longer valid',
          status: invitation.status
        });
      }

      if (new Date(invitation.expiresAt) < new Date()) {
        await admin
          .from('invitations')
          .update({ status: 'expired' })
          .eq('id', invitation.id);

        return res.status(400).json({
          error: 'This invitation has expired'
        });
      }

      const userId = session.user.id;

      // Handle decline
      if (action === 'decline') {
        await admin
          .from('invitations')
          .update({ status: 'declined' })
          .eq('id', invitation.id);

        return res.status(200).json({
          message: 'Invitation declined'
        });
      }

      // Handle accept
      if (action === 'accept') {
        // Check if user is already a member
        const { data: existingMember } = await admin
          .from('team_members')
          .select('id')
          .eq('organization_id', invitation.organizationId)
          .eq('user_id', userId)
          .eq('status', 'active')
          .maybeSingle();

        if (existingMember) {
          // Mark invitation as accepted anyway
          await admin
            .from('invitations')
            .update({
              status: 'accepted',
              accepted_at: new Date().toISOString(),
              accepted_by: userId
            })
            .eq('id', invitation.id);

          return res.status(200).json({
            message: 'You are already a member of this organization',
            organization: {
              _id: invitation.organizationId,
              alreadyMember: true
            }
          });
        }

        // Define permissions based on role
        const permissions = {
          owner: {
            widgets: { create: true, read: true, update: true, delete: true },
            demos: { create: false, read: true, update: false, delete: false },
            team: { invite: true, manage: true, remove: true },
            settings: { view: true, edit: true }
          },
          admin: {
            widgets: { create: true, read: true, update: true, delete: true },
            demos: { create: false, read: true, update: false, delete: false },
            team: { invite: true, manage: true, remove: false },
            settings: { view: true, edit: false }
          },
          member: {
            widgets: { create: true, read: true, update: true, delete: false },
            demos: { create: false, read: true, update: false, delete: false },
            team: { invite: false, manage: false, remove: false },
            settings: { view: true, edit: false }
          },
          viewer: {
            widgets: { create: false, read: true, update: false, delete: false },
            demos: { create: false, read: true, update: false, delete: false },
            team: { invite: false, manage: false, remove: false },
            settings: { view: true, edit: false }
          }
        };

        // Create team member
        await admin.from('team_members').insert({
          organization_id: invitation.organizationId,
          user_id: userId,
          role: invitation.role,
          permissions: permissions[invitation.role] || permissions.member,
          status: 'active',
          joined_at: new Date().toISOString()
        });

        // Mark invitation as accepted
        await admin
          .from('invitations')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
            accepted_by: userId
          })
          .eq('id', invitation.id);

        // Set as current organization if user has no current org
        const { data: user } = await admin
          .from('users')
          .select('current_organization_id')
          .eq('id', userId)
          .maybeSingle();
        if (user && !user.current_organization_id) {
          await admin
            .from('users')
            .update({ current_organization_id: invitation.organizationId })
            .eq('id', userId);
        }

        return res.status(200).json({
          message: 'Invitation accepted successfully',
          organization: {
            _id: invitation.organizationId,
            role: invitation.role
          }
        });
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Public invitation API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

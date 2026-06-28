/**
 * Team Member Management API
 *
 * PUT /api/organizations/[id]/members/[memberId] - Update member role
 * DELETE /api/organizations/[id]/members/[memberId] - Remove member
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
    const { id: orgId, memberId } = req.query;

    if (!orgId) {
      return res.status(400).json({ error: 'Invalid organization ID' });
    }

    if (!memberId) {
      return res.status(400).json({ error: 'Invalid member ID' });
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

    // Get the member being managed
    const { data: memberRow } = await admin
      .from('team_members')
      .select('*')
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (!memberRow) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const member = fromRow(memberRow);

    // Prevent managing the owner
    if (member.role === 'owner' && !isAdmin) {
      return res.status(403).json({ error: 'Cannot manage the organization owner' });
    }

    // Prevent users from managing themselves
    if (member.userId === userId) {
      return res.status(403).json({ error: 'Cannot manage your own membership' });
    }

    // ========================================
    // PUT - Update Member Role
    // ========================================
    if (req.method === 'PUT') {
      // Check permissions - must be owner/admin or platform admin
      if (!isAdmin && !['owner', 'admin'].includes(userRole)) {
        return res.status(403).json({ error: 'Only owners and admins can change member roles' });
      }

      const { role } = req.body;

      // Validate role
      const validRoles = ['owner', 'admin', 'member', 'viewer'];
      if (!role || !validRoles.includes(role)) {
        return res.status(400).json({ error: 'Valid role is required (owner, admin, member, or viewer)' });
      }

      // Only current owner or platform admin can assign owner role
      if (role === 'owner' && userRole !== 'owner' && !isAdmin) {
        return res.status(403).json({ error: 'Only the current owner can transfer ownership' });
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

      // Update member role
      await admin
        .from('team_members')
        .update({ role, permissions: permissions[role] })
        .eq('id', memberId);

      // If transferring ownership, downgrade current owner to admin
      if (role === 'owner') {
        await admin
          .from('team_members')
          .update({ role: 'admin', permissions: permissions.admin })
          .eq('organization_id', orgId)
          .eq('role', 'owner')
          .neq('id', memberId);

        // Update organization owner
        await admin
          .from('organizations')
          .update({ owner_id: member.userId })
          .eq('id', orgId);
      }

      return res.status(200).json({
        message: 'Member role updated successfully',
        role
      });
    }

    // ========================================
    // DELETE - Remove Member
    // ========================================
    if (req.method === 'DELETE') {
      // Check permissions - must be owner/admin or platform admin
      if (!isAdmin && !['owner', 'admin'].includes(userRole)) {
        return res.status(403).json({ error: 'Only owners and admins can remove members' });
      }

      // Cannot remove if they're the only member
      const { count: memberCount } = await admin
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'active');

      if ((memberCount || 0) <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last member of the organization' });
      }

      // Remove member (soft delete by changing status)
      await admin
        .from('team_members')
        .update({ status: 'removed' })
        .eq('id', memberId);

      // If this was their current organization, clear it
      await admin
        .from('users')
        .update({ current_organization_id: null })
        .eq('id', member.userId)
        .eq('current_organization_id', orgId);

      return res.status(200).json({ message: 'Member removed successfully' });
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Member management API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

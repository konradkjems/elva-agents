/**
 * Team Member Management API
 * 
 * PUT /api/organizations/[id]/members/[memberId] - Update member role
 * DELETE /api/organizations/[id]/members/[memberId] - Remove member
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import clientPromise from '../../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

// Helper to check user's role in organization
async function getUserRole(db, userId, orgId) {
  const membership = await db.collection('team_members').findOne({
    organizationId: new ObjectId(orgId),
    userId: new ObjectId(userId),
    status: 'active'
  });
  return membership ? membership.role : null;
}

// Helper to check if user is platform admin
async function isPlatformAdmin(db, userId) {
  const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
  return user && user.platformRole === 'platform_admin';
}

export default async function handler(req, res) {
  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const client = await clientPromise;
    const db = client.db('elva-agents');
    const userId = new ObjectId(session.user.id);
    const { id: orgId, memberId } = req.query;

    if (!orgId || !ObjectId.isValid(orgId)) {
      return res.status(400).json({ error: 'Invalid organization ID' });
    }

    if (!memberId || !ObjectId.isValid(memberId)) {
      return res.status(400).json({ error: 'Invalid member ID' });
    }

    // Get organization
    const organization = await db.collection('organizations').findOne({
      _id: new ObjectId(orgId),
      deletedAt: { $exists: false }
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check permissions
    const userRole = await getUserRole(db, userId, orgId);
    const isAdmin = await isPlatformAdmin(db, userId);

    if (!userRole && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get the member being managed
    const member = await db.collection('team_members').findOne({
      _id: new ObjectId(memberId),
      organizationId: new ObjectId(orgId)
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Prevent managing the owner
    if (member.role === 'owner' && !isAdmin) {
      return res.status(403).json({ error: 'Cannot manage the organization owner' });
    }

    // Prevent users from managing themselves
    if (member.userId.toString() === userId.toString()) {
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
      await db.collection('team_members').updateOne(
        { _id: new ObjectId(memberId) },
        {
          $set: {
            role,
            permissions: permissions[role],
            updatedAt: new Date()
          }
        }
      );

      // If transferring ownership, downgrade current owner to admin
      if (role === 'owner') {
        await db.collection('team_members').updateOne(
          { 
            organizationId: new ObjectId(orgId),
            role: 'owner',
            _id: { $ne: new ObjectId(memberId) }
          },
          {
            $set: {
              role: 'admin',
              permissions: permissions.admin,
              updatedAt: new Date()
            }
          }
        );

        // Update organization owner
        await db.collection('organizations').updateOne(
          { _id: new ObjectId(orgId) },
          {
            $set: {
              ownerId: member.userId,
              updatedAt: new Date()
            }
          }
        );
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
      const memberCount = await db.collection('team_members').countDocuments({
        organizationId: new ObjectId(orgId),
        status: 'active'
      });

      if (memberCount <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last member of the organization' });
      }

      // Remove member (soft delete by changing status)
      await db.collection('team_members').updateOne(
        { _id: new ObjectId(memberId) },
        {
          $set: {
            status: 'removed',
            removedAt: new Date(),
            removedBy: userId,
            updatedAt: new Date()
          }
        }
      );

      // If this was their current organization, clear it
      await db.collection('users').updateOne(
        { 
          _id: member.userId,
          currentOrganizationId: new ObjectId(orgId)
        },
        {
          $unset: { currentOrganizationId: "" }
        }
      );

      return res.status(200).json({ message: 'Member removed successfully' });
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Member management API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


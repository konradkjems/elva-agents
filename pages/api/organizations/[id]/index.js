/**
 * Single Organization API
 * 
 * GET /api/organizations/[id] - Get organization details
 * PUT /api/organizations/[id] - Update organization
 * DELETE /api/organizations/[id] - Delete organization (soft)
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import clientPromise from '../../../../lib/mongodb';
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
    // Using elva-agents database for multi-tenancy
    const db = client.db('elva-agents');
    const userId = new ObjectId(session.user.id);
    const { id: orgId } = req.query;

    if (!orgId || !ObjectId.isValid(orgId)) {
      return res.status(400).json({ error: 'Invalid organization ID' });
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

    // ========================================
    // GET - Get organization details
    // ========================================
    if (req.method === 'GET') {
      // Get team members
      const members = await db
        .collection('team_members')
        .aggregate([
          {
            $match: {
              organizationId: new ObjectId(orgId),
              status: { $in: ['active', 'invited'] }
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'userId',
              foreignField: '_id',
              as: 'user'
            }
          },
          {
            $unwind: '$user'
          },
          {
            $project: {
              _id: 1,
              role: 1,
              status: 1,
              joinedAt: 1,
              invitedAt: 1,
              createdAt: 1,
              user: {
                _id: 1,
                name: 1,
                email: 1,
                image: 1
              }
            }
          },
          { $sort: { createdAt: 1 } }
        ])
        .toArray();

      // Get widget count
      const widgetCount = await db.collection('widgets').countDocuments({
        organizationId: new ObjectId(orgId),
        isDemoMode: { $ne: true }
      });

      // Get conversation count
      const conversationCount = await db.collection('conversations').countDocuments({
        organizationId: new ObjectId(orgId)
      });

      // Get pending invitations
      const invitations = await db.collection('invitations').find({
        organizationId: new ObjectId(orgId),
        status: 'pending',
        expiresAt: { $gt: new Date() }
      }).toArray();

      return res.status(200).json({
        organization: {
          ...organization,
          role: userRole || 'platform_admin',
          stats: {
            members: members.length,
            widgets: widgetCount,
            conversations: conversationCount,
            pendingInvitations: invitations.length
          }
        },
        members,
        invitations
      });
    }

    // ========================================
    // PUT - Update organization
    // ========================================
    if (req.method === 'PUT') {
      // Check permissions - must be owner/admin or platform admin
      if (!isAdmin && !['owner', 'admin'].includes(userRole)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const { name, logo, primaryColor, domain, settings } = req.body;

      const updates = {};
      if (name !== undefined) updates.name = name.trim();
      if (logo !== undefined) updates.logo = logo;
      if (primaryColor !== undefined) updates.primaryColor = primaryColor;
      if (domain !== undefined) updates.domain = domain;
      if (settings !== undefined) {
        // Merge settings
        updates.settings = { ...organization.settings, ...settings };
      }
      updates.updatedAt = new Date();

      await db.collection('organizations').updateOne(
        { _id: new ObjectId(orgId) },
        { $set: updates }
      );

      const updatedOrg = await db.collection('organizations').findOne({
        _id: new ObjectId(orgId)
      });

      return res.status(200).json({ organization: updatedOrg });
    }

    // ========================================
    // DELETE - Soft delete organization
    // ========================================
    if (req.method === 'DELETE') {
      // Check permissions - must be owner or platform admin
      if (!isAdmin && userRole !== 'owner') {
        return res.status(403).json({ error: 'Only the owner can delete the organization' });
      }

      // Soft delete (set deletedAt)
      await db.collection('organizations').updateOne(
        { _id: new ObjectId(orgId) },
        {
          $set: {
            deletedAt: new Date(),
            updatedAt: new Date()
          }
        }
      );

      // Mark all team members as removed
      await db.collection('team_members').updateMany(
        { organizationId: new ObjectId(orgId) },
        {
          $set: {
            status: 'removed',
            updatedAt: new Date()
          }
        }
      );

      // Cancel all pending invitations
      await db.collection('invitations').updateMany(
        { organizationId: new ObjectId(orgId), status: 'pending' },
        {
          $set: {
            status: 'cancelled',
            updatedAt: new Date()
          }
        }
      );

      return res.status(200).json({ message: 'Organization deleted successfully' });
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Organization API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


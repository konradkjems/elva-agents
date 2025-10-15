/**
 * Single Invitation Management API
 * 
 * DELETE /api/organizations/[id]/invitations/[invitationId] - Cancel invitation
 * POST /api/organizations/[id]/invitations/[invitationId]/resend - Resend invitation
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import clientPromise from '../../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';

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
  return user && user.role === 'platform_admin';
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
    const { id: orgId, invitationId } = req.query;

    if (!orgId || !ObjectId.isValid(orgId)) {
      return res.status(400).json({ error: 'Invalid organization ID' });
    }

    if (!invitationId || !ObjectId.isValid(invitationId)) {
      return res.status(400).json({ error: 'Invalid invitation ID' });
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

    // Get invitation
    const invitation = await db.collection('invitations').findOne({
      _id: new ObjectId(invitationId),
      organizationId: new ObjectId(orgId)
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

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

      await db.collection('invitations').updateOne(
        { _id: new ObjectId(invitationId) },
        {
          $set: {
            status: 'cancelled',
            cancelledBy: userId,
            cancelledAt: new Date(),
            updatedAt: new Date()
          }
        }
      );

      return res.status(200).json({ message: 'Invitation cancelled successfully' });
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Invitation management API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


/**
 * Resend Invitation API
 * 
 * POST /api/organizations/[id]/invitations/[invitationId]/resend - Resend invitation email
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/[...nextauth]';
import clientPromise from '../../../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';
import { sendInvitationEmail } from '../../../../../../lib/email';

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    // Check permissions - must be owner/admin or platform admin
    if (!isAdmin && !['owner', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Only owners and admins can resend invitations' });
    }

    // Get invitation
    const invitation = await db.collection('invitations').findOne({
      _id: new ObjectId(invitationId),
      organizationId: new ObjectId(orgId)
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

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

    await db.collection('invitations').updateOne(
      { _id: new ObjectId(invitationId) },
      {
        $set: {
          token: newToken,
          expiresAt: newExpiresAt,
          resentAt: new Date(),
          resentBy: userId,
          updatedAt: new Date()
        },
        $inc: { resentCount: 1 }
      }
    );

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


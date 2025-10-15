/**
 * Organization Invitations API
 * 
 * POST /api/organizations/[id]/invitations - Send invitation
 * GET /api/organizations/[id]/invitations - List invitations (implemented in [id]/index.js)
 * DELETE /api/organizations/[id]/invitations/[invitationId] - Cancel invitation
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import clientPromise from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';
import { sendInvitationEmail } from '../../../../lib/email';

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
      const existingUser = await db.collection('users').findOne({ 
        email: normalizedEmail 
      });

      if (existingUser) {
        const existingMember = await db.collection('team_members').findOne({
          organizationId: new ObjectId(orgId),
          userId: existingUser._id,
          status: { $in: ['active', 'invited'] }
        });

        if (existingMember) {
          return res.status(409).json({ 
            error: 'User is already a member of this organization' 
          });
        }
      }

      // Check for pending invitation
      const existingInvitation = await db.collection('invitations').findOne({
        organizationId: new ObjectId(orgId),
        email: normalizedEmail,
        status: 'pending',
        expiresAt: { $gt: new Date() }
      });

      if (existingInvitation) {
        return res.status(409).json({ 
          error: 'An invitation has already been sent to this email' 
        });
      }

      // Generate invitation token
      const token = crypto.randomBytes(32).toString('hex');

      // Create invitation
      const invitation = {
        organizationId: new ObjectId(orgId),
        email: normalizedEmail,
        role,
        token,
        invitedBy: userId,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('invitations').insertOne(invitation);

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
      const inviter = await db.collection('users').findOne({ _id: userId });

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


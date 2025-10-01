/**
 * Public Invitation API
 * 
 * GET /api/invitations/[token] - Get invitation details
 * POST /api/invitations/[token]/accept - Accept invitation
 * POST /api/invitations/[token]/decline - Decline invitation
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db('elva-agents');
    const { token, action } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Invalid invitation token' });
    }

    // Get invitation
    const invitation = await db.collection('invitations').findOne({ token });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

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
        await db.collection('invitations').updateOne(
          { _id: invitation._id },
          { 
            $set: { 
              status: 'expired',
              updatedAt: new Date()
            }
          }
        );

        return res.status(400).json({ 
          error: 'This invitation has expired',
          status: 'expired'
        });
      }

      // Get organization details
      const organization = await db.collection('organizations').findOne({
        _id: invitation.organizationId
      });

      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      // Get inviter details
      const inviter = await db.collection('users').findOne({
        _id: invitation.invitedBy
      });

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
      const session = await getServerSession(req, res, authOptions);
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
        await db.collection('invitations').updateOne(
          { _id: invitation._id },
          { 
            $set: { 
              status: 'expired',
              updatedAt: new Date()
            }
          }
        );

        return res.status(400).json({ 
          error: 'This invitation has expired'
        });
      }

      const userId = new ObjectId(session.user.id);

      // Handle decline
      if (action === 'decline') {
        await db.collection('invitations').updateOne(
          { _id: invitation._id },
          {
            $set: {
              status: 'declined',
              declinedAt: new Date(),
              updatedAt: new Date()
            }
          }
        );

        return res.status(200).json({ 
          message: 'Invitation declined' 
        });
      }

      // Handle accept
      if (action === 'accept') {
        // Check if user is already a member
        const existingMember = await db.collection('team_members').findOne({
          organizationId: invitation.organizationId,
          userId,
          status: 'active'
        });

        if (existingMember) {
          // Mark invitation as accepted anyway
          await db.collection('invitations').updateOne(
            { _id: invitation._id },
            {
              $set: {
                status: 'accepted',
                acceptedAt: new Date(),
                updatedAt: new Date()
              }
            }
          );

          return res.status(200).json({ 
            message: 'You are already a member of this organization',
            organization: {
              _id: invitation.organizationId.toString(),
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
        const teamMember = {
          organizationId: invitation.organizationId,
          userId,
          role: invitation.role,
          permissions: permissions[invitation.role] || permissions.member,
          status: 'active',
          joinedAt: new Date(),
          invitationId: invitation._id,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await db.collection('team_members').insertOne(teamMember);

        // Mark invitation as accepted
        await db.collection('invitations').updateOne(
          { _id: invitation._id },
          {
            $set: {
              status: 'accepted',
              acceptedAt: new Date(),
              updatedAt: new Date()
            }
          }
        );

        // Set as current organization if user has no current org
        const user = await db.collection('users').findOne({ _id: userId });
        if (!user.currentOrganizationId) {
          await db.collection('users').updateOne(
            { _id: userId },
            { $set: { currentOrganizationId: invitation.organizationId } }
          );
        }

        return res.status(200).json({
          message: 'Invitation accepted successfully',
          organization: {
            _id: invitation.organizationId.toString(),
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


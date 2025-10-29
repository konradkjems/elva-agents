/**
 * Organizations API
 * 
 * GET /api/organizations - List user's organizations
 * POST /api/organizations - Create new organization
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

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

    // ========================================
    // GET - List user's organizations
    // ========================================
    if (req.method === 'GET') {
      // Get all organizations where user is a member
      const memberships = await db
        .collection('team_members')
        .find({
          userId,
          status: { $in: ['active', 'invited'] }
        })
        .toArray();

      const orgIds = memberships.map(m => m.organizationId);

      // Get organization details
      const organizations = await db
        .collection('organizations')
        .find({
          _id: { $in: orgIds },
          deletedAt: { $exists: false }
        })
        .toArray();

      // Combine with membership data
      const orgsWithRole = organizations.map(org => {
        const membership = memberships.find(
          m => m.organizationId.toString() === org._id.toString()
        );
        return {
          ...org,
          role: membership.role,
          memberStatus: membership.status,
          joinedAt: membership.joinedAt
        };
      });

      // Sort by: current org first, then by name
      const currentOrgId = session.user.currentOrganizationId;
      orgsWithRole.sort((a, b) => {
        if (a._id.toString() === currentOrgId) return -1;
        if (b._id.toString() === currentOrgId) return 1;
        return a.name.localeCompare(b.name);
      });

      return res.status(200).json({
        organizations: orgsWithRole,
        currentOrganizationId: currentOrgId
      });
    }

    // ========================================
    // POST - Create new organization
    // ========================================
    if (req.method === 'POST') {
      const { name, slug, logo, primaryColor, plan } = req.body;

      // Validation
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Organization name is required' });
      }

      // Check if user has admin/owner role in their current organization
      const currentOrgId = session.user.currentOrganizationId;
      if (currentOrgId) {
        const userMembership = await db
          .collection('team_members')
          .findOne({
            userId,
            organizationId: new ObjectId(currentOrgId),
            status: 'active'
          });

        if (!userMembership || !['admin', 'owner'].includes(userMembership.role)) {
          return res.status(403).json({ 
            error: 'Only organization administrators and owners can create new organizations' 
          });
        }
      }

      // Generate slug if not provided
      let orgSlug = slug || name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Ensure slug is unique
      let finalSlug = orgSlug;
      let counter = 1;
      while (await db.collection('organizations').findOne({ slug: finalSlug })) {
        finalSlug = `${orgSlug}-${counter}`;
        counter++;
      }

      // Create organization
      const selectedPlan = plan || 'free';
      
      // Helper function to get conversation limits
      const getConversationLimit = (plan) => {
        switch(plan) {
          case 'pro': return 750;
          case 'growth': return 300;
          case 'basic': return 100;
          case 'free': return 100;
          default: return 100;
        }
      };
      
      const newOrg = {
        name: name.trim(),
        slug: finalSlug,
        ownerId: userId,
        plan: selectedPlan,
        limits: {
          maxWidgets: selectedPlan === 'pro' ? 50 : selectedPlan === 'growth' ? 25 : selectedPlan === 'basic' ? 10 : 10,
          maxTeamMembers: selectedPlan === 'pro' ? 30 : selectedPlan === 'growth' ? 15 : selectedPlan === 'basic' ? 5 : 5,
          maxConversations: selectedPlan === 'pro' ? 100000 : selectedPlan === 'growth' ? 50000 : selectedPlan === 'basic' ? 10000 : 10000,
          maxDemos: 0 // Regular users can't create demos
        },
        usage: {
          conversations: {
            current: 0,
            limit: getConversationLimit(selectedPlan),
            lastReset: new Date(),
            overage: 0,
            notificationsSent: []
          }
        },
        subscriptionStatus: selectedPlan === 'free' ? 'trial' : 'active',
        settings: {
          allowDemoCreation: false,
          requireEmailVerification: false,
          allowGoogleAuth: true
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Only set trialEndsAt if on free plan
      if (selectedPlan === 'free') {
        newOrg.trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      }

      const orgResult = await db.collection('organizations').insertOne(newOrg);

      // Create team member entry (owner)
      const teamMember = {
        organizationId: orgResult.insertedId,
        userId,
        role: 'owner',
        permissions: {
          widgets: { create: true, read: true, update: true, delete: true },
          demos: { create: false, read: true, update: false, delete: false },
          team: { invite: true, manage: true, remove: true },
          settings: { view: true, edit: true }
        },
        status: 'active',
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('team_members').insertOne(teamMember);

      // Set the newly created organization as current
      try {
        const user = await db.collection('users').findOne({ _id: userId });
        if (user) {
          // Always switch to the newly created organization
          await db.collection('users').updateOne(
            { _id: userId },
            { $set: { currentOrganizationId: orgResult.insertedId } }
          );
        } else {
          console.warn(`User with ID ${userId} not found when creating organization`);
        }
      } catch (userUpdateError) {
        console.error('Error updating user current organization:', userUpdateError);
        // Continue anyway - organization is created successfully
      }

      // Get the created organization with _id
      const createdOrg = await db.collection('organizations').findOne({ _id: orgResult.insertedId });

      return res.status(201).json({
        organization: {
          ...createdOrg,
          role: 'owner',
          memberStatus: 'active',
          joinedAt: teamMember.joinedAt
        }
      });
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Organizations API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


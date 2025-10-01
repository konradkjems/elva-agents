/**
 * Switch Organization Context API
 * 
 * POST /api/organizations/[id]/switch - Switch user's current organization
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import clientPromise from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

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
    // Using elva-agents database for multi-tenancy
    const db = client.db('elva-agents');
    const userId = new ObjectId(session.user.id);
    const { id: orgId } = req.query;

    if (!orgId || !ObjectId.isValid(orgId)) {
      return res.status(400).json({ error: 'Invalid organization ID' });
    }

    // Check if user is a member of this organization or is platform admin
    const membership = await db.collection('team_members').findOne({
      organizationId: new ObjectId(orgId),
      userId,
      status: 'active'
    });

    const user = await db.collection('users').findOne({ _id: userId });
    const isPlatformAdmin = user && user.platformRole === 'platform_admin';

    if (!membership && !isPlatformAdmin) {
      return res.status(403).json({ error: 'You are not a member of this organization' });
    }

    // Check if organization exists and is not deleted
    const organization = await db.collection('organizations').findOne({
      _id: new ObjectId(orgId),
      deletedAt: { $exists: false }
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Update user's current organization
    await db.collection('users').updateOne(
      { _id: userId },
      {
        $set: {
          currentOrganizationId: new ObjectId(orgId),
          updatedAt: new Date()
        }
      }
    );

    return res.status(200).json({
      message: 'Organization switched successfully',
      organizationId: orgId,
      organizationName: organization.name,
      role: membership ? membership.role : 'platform_admin'
    });

  } catch (error) {
    console.error('Switch organization API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


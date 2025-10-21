import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import clientPromise from '../../../../lib/mongodb.js';
import { ObjectId } from 'mongodb';
import { getUsageStats } from '../../../../lib/quota.js';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const client = await clientPromise;
    const db = client.db('elva-agents');
    const { id: orgId } = req.query;

    // Validate organization ID
    if (!ObjectId.isValid(orgId)) {
      return res.status(400).json({ error: 'Invalid organization ID' });
    }

    // Check if user belongs to this organization
    const userId = new ObjectId(session.user.id);
    const isPlatformAdmin = session.user.platformRole === 'platform_admin';

    if (!isPlatformAdmin) {
      const membership = await db.collection('team_members').findOne({
        organizationId: new ObjectId(orgId),
        userId: userId,
        status: 'active'
      });

      if (!membership) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get usage statistics
    const stats = await getUsageStats(new ObjectId(orgId));

    return res.status(200).json(stats);

  } catch (error) {
    console.error('❌ Error fetching usage stats:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}


import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import clientPromise from '../../../../../lib/mongodb.js';
import { ObjectId } from 'mongodb';
import { manualResetQuota, getUsageStats } from '../../../../../lib/quota.js';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user and check platform admin role
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is platform admin
    if (session.user.platformRole !== 'platform_admin') {
      return res.status(403).json({ error: 'Forbidden: Platform admin access required' });
    }

    const client = await clientPromise;
    const db = client.db('elva-agents');
    const { id: orgId } = req.query;

    // Validate organization ID
    if (!ObjectId.isValid(orgId)) {
      return res.status(400).json({ error: 'Invalid organization ID' });
    }

    // Check if organization exists
    const organization = await db.collection('organizations').findOne({
      _id: new ObjectId(orgId)
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Reset the quota
    const resetBy = new ObjectId(session.user.id);
    await manualResetQuota(new ObjectId(orgId), resetBy);

    // Get updated usage stats
    const stats = await getUsageStats(new ObjectId(orgId));

    console.log(`✅ Platform admin ${session.user.email} reset quota for ${organization.name}`);

    return res.status(200).json({
      success: true,
      message: 'Quota reset successfully',
      usage: stats,
      organization: {
        id: organization._id,
        name: organization.name,
        plan: organization.plan
      }
    });

  } catch (error) {
    console.error('❌ Error resetting quota:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}


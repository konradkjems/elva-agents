import clientPromise from '../../../../../lib/mongodb';
import { withAdmin } from '../../../../../lib/auth';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';

export default async function handler(req, res) {
  // Set CORS headers for public demo access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const client = await clientPromise;
  const db = client.db('elva-agents'); // Use new database
  const { demoId } = req.query;

  if (req.method === 'GET') {
    // GET is public - anyone can view usage data (no authentication required)
    try {
      const demo = await db.collection('demos').findOne({ _id: demoId });
      if (!demo) {
        return res.status(404).json({ message: 'Demo not found' });
      }

      const usage = demo.demoSettings?.usageLimits?.currentUsage || {
        interactions: 0,
        views: 0
      };

      const limits = demo.demoSettings?.usageLimits || {};
      const isLimitReached = {
        interactions: usage.interactions >= (limits.maxInteractions || 0),
        views: usage.views >= (limits.maxViews || 0)
      };

      return res.status(200).json({
        currentUsage: usage,
        limits: {
          maxInteractions: limits.maxInteractions || 0,
          maxViews: limits.maxViews || 0,
          expiresAt: limits.expiresAt
        },
        isLimitReached,
        isExpired: limits.expiresAt ? new Date(limits.expiresAt) < new Date() : false
      });
    } catch (error) {
      console.error('Error fetching demo usage:', error);
      return res.status(500).json({ message: 'Failed to fetch demo usage' });
    }
  }

  if (req.method === 'POST') {
    // POST for tracking views/interactions (public access)
    try {
      const { type } = req.body; // 'view' or 'interaction'
      
      if (!type || !['view', 'interaction'].includes(type)) {
        return res.status(400).json({ message: 'Invalid tracking type' });
      }

      // Increment the appropriate counter
      const updateField = type === 'view' 
        ? 'demoSettings.usageLimits.currentUsage.views'
        : 'demoSettings.usageLimits.currentUsage.interactions';

      const result = await db.collection('demos').updateOne(
        { _id: demoId },
        { 
          $inc: { [updateField]: 1 },
          $set: { updatedAt: new Date() }
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: 'Demo not found' });
      }

      // Return updated usage data
      const updatedDemo = await db.collection('demos').findOne({ _id: demoId });
      const usage = updatedDemo.demoSettings?.usageLimits?.currentUsage || {
        interactions: 0,
        views: 0
      };

      return res.status(200).json({
        message: `${type} tracked successfully`,
        currentUsage: usage
      });
    } catch (error) {
      console.error('Error tracking usage:', error);
      return res.status(500).json({ message: 'Failed to track usage' });
    }
  }

  // PUT requires authentication (reset counters)
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // IMPORTANT: Only platform admins can reset usage counters
  if (session.user?.role !== 'platform_admin') {
    return res.status(403).json({ 
      error: 'Access denied. Usage management is only available to platform administrators.' 
    });
  }

  if (req.method === 'PUT') {
    try {
      // Reset usage counters
      const result = await db.collection('demos').updateOne(
        { _id: demoId },
        { 
          $set: { 
            'demoSettings.usageLimits.currentUsage.interactions': 0,
            'demoSettings.usageLimits.currentUsage.views': 0,
            updatedAt: new Date()
          }
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: 'Demo not found' });
      }

      return res.status(200).json({ message: 'Usage counters reset successfully' });
    } catch (error) {
      console.error('Error resetting demo usage:', error);
      return res.status(500).json({ message: 'Failed to reset usage counters' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}




import clientPromise from '../../../../../lib/mongodb';
import { withAdmin } from '../../../../../lib/auth';

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db('chatwidgets');
  const { demoId } = req.query;

  if (req.method === 'GET') {
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




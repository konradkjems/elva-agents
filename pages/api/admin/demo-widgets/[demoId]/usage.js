import clientPromise from '../../../../../lib/mongodb';

export default async function handler(req, res) {
  const { demoId } = req.query;

  if (!demoId) {
    return res.status(400).json({ message: 'Demo ID is required' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('elva-agents');

    if (req.method === 'GET') {
      // Get demo usage statistics
      const demo = await db.collection('widgets').findOne({ 
        _id: demoId,
        isDemoMode: true 
      });

      if (!demo || !demo.demoSettings) {
        return res.status(404).json({ message: 'Demo widget not found' });
      }

      const usage = {
        currentUsage: demo.demoSettings.usageLimits?.currentUsage || { interactions: 0, views: 0 },
        limits: demo.demoSettings.usageLimits || {},
        isExpired: demo.demoSettings.usageLimits?.expiresAt ? 
          new Date(demo.demoSettings.usageLimits.expiresAt) < new Date() : false,
        isLimitReached: {
          interactions: (demo.demoSettings.usageLimits?.currentUsage?.interactions || 0) >= 
                       (demo.demoSettings.usageLimits?.maxInteractions || 0),
          views: (demo.demoSettings.usageLimits?.currentUsage?.views || 0) >= 
                 (demo.demoSettings.usageLimits?.maxViews || 0)
        }
      };

      return res.status(200).json(usage);
    }

    if (req.method === 'POST') {
      // Increment usage counter
      const { type } = req.body; // 'view' or 'interaction'
      
      if (!type || !['view', 'interaction'].includes(type)) {
        return res.status(400).json({ message: 'Usage type must be "view" or "interaction"' });
      }

      const demo = await db.collection('widgets').findOne({ 
        _id: demoId,
        isDemoMode: true 
      });

      if (!demo || !demo.demoSettings) {
        return res.status(404).json({ message: 'Demo widget not found' });
      }

      // Check if demo is expired
      const isExpired = demo.demoSettings.usageLimits?.expiresAt ? 
        new Date(demo.demoSettings.usageLimits.expiresAt) < new Date() : false;

      if (isExpired) {
        return res.status(410).json({ message: 'Demo has expired' });
      }

      // Check current usage
      const currentUsage = demo.demoSettings.usageLimits?.currentUsage || { interactions: 0, views: 0 };
      
      if (type === 'view') {
        if (currentUsage.views >= (demo.demoSettings.usageLimits?.maxViews || 0)) {
          return res.status(429).json({ message: 'Maximum views reached' });
        }
      } else if (type === 'interaction') {
        if (currentUsage.interactions >= (demo.demoSettings.usageLimits?.maxInteractions || 0)) {
          return res.status(429).json({ message: 'Maximum interactions reached' });
        }
      }

      // Increment usage counter
      const updateField = type === 'view' ? 
        'demoSettings.usageLimits.currentUsage.views' : 
        'demoSettings.usageLimits.currentUsage.interactions';

      const result = await db.collection('widgets').updateOne(
        { _id: demoId, isDemoMode: true },
        { 
          $inc: { [updateField]: 1 },
          $set: { updatedAt: new Date() }
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: 'Demo widget not found' });
      }

      return res.status(200).json({ 
        message: `${type} recorded successfully`,
        currentUsage: {
          ...currentUsage,
          [type === 'view' ? 'views' : 'interactions']: 
            currentUsage[type === 'view' ? 'views' : 'interactions'] + 1
        }
      });
    }

    if (req.method === 'PUT') {
      // Reset usage counters (admin only)
      const result = await db.collection('widgets').updateOne(
        { _id: demoId, isDemoMode: true },
        { 
          $set: { 
            'demoSettings.usageLimits.currentUsage.interactions': 0,
            'demoSettings.usageLimits.currentUsage.views': 0,
            updatedAt: new Date()
          }
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: 'Demo widget not found' });
      }

      return res.status(200).json({ 
        message: 'Usage counters reset successfully' 
      });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Demo usage API error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
}

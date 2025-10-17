import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import redis from '../../../../lib/redis';

export default async function handler(req, res) {
  // Only allow DELETE method
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is platform admin
    if (session.user.role !== 'platform_admin') {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    const { url, all } = req.query;

    // Clear all product cache
    if (all === 'true') {
      try {
        // Get all keys matching the pattern
        const keys = await redis.keys('product:*');
        
        if (keys.length === 0) {
          return res.status(200).json({
            success: true,
            message: 'No cached products found',
            cleared: 0
          });
        }

        // Delete all matching keys
        await redis.del(...keys);
        
        console.log('🗑️ Cleared all product cache:', keys.length, 'entries');
        
        return res.status(200).json({
          success: true,
          message: `Cleared all product cache`,
          cleared: keys.length
        });
      } catch (error) {
        console.error('Error clearing all cache:', error);
        return res.status(500).json({
          error: 'Failed to clear cache',
          details: error.message
        });
      }
    }

    // Clear specific product cache
    if (url) {
      const cacheKey = `product:${url}`;
      
      try {
        const result = await redis.del(cacheKey);
        
        if (result === 0) {
          return res.status(404).json({
            success: false,
            message: 'Product not found in cache',
            url: url
          });
        }
        
        console.log('🗑️ Cleared cache for:', url);
        
        return res.status(200).json({
          success: true,
          message: 'Product cache cleared',
          url: url
        });
      } catch (error) {
        console.error('Error clearing cache for URL:', error);
        return res.status(500).json({
          error: 'Failed to clear cache',
          details: error.message
        });
      }
    }

    // No valid parameters provided
    return res.status(400).json({
      error: 'Bad request',
      message: 'Either "url" or "all=true" parameter is required'
    });

  } catch (error) {
    console.error('Error in cache clear endpoint:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}


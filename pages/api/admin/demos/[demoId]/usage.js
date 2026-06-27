import { admin } from '../../../../../lib/supabase/admin';
import { withAdmin } from '../../../../../lib/auth';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The demoId received in the URL is the demo's custom string legacy_id. Fall
// back to the uuid id when the param looks like a uuid.
async function findDemoRow(demoId) {
  let { data } = await admin.from('demos').select('*').eq('legacy_id', demoId).maybeSingle();
  if (!data && UUID_RE.test(demoId)) {
    ({ data } = await admin.from('demos').select('*').eq('id', demoId).maybeSingle());
  }
  return data || null;
}

export default async function handler(req, res) {
  // Set CORS headers for public demo access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { demoId } = req.query;

  if (req.method === 'GET') {
    // GET is public - anyone can view usage data (no authentication required)
    try {
      const demo = await findDemoRow(demoId);
      if (!demo) {
        return res.status(404).json({ message: 'Demo not found' });
      }

      const usage = demo.demo_settings?.usageLimits?.currentUsage || {
        interactions: 0,
        views: 0
      };

      const limits = demo.demo_settings?.usageLimits || {};
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

      const demo = await findDemoRow(demoId);
      if (!demo) {
        return res.status(404).json({ message: 'Demo not found' });
      }

      // Mutate the JSONB demo_settings object and write it back whole
      const demoSettings = demo.demo_settings || {};
      demoSettings.usageLimits = demoSettings.usageLimits || {};
      demoSettings.usageLimits.currentUsage = demoSettings.usageLimits.currentUsage || {
        interactions: 0,
        views: 0
      };

      const usageKey = type === 'view' ? 'views' : 'interactions';
      demoSettings.usageLimits.currentUsage[usageKey] =
        (demoSettings.usageLimits.currentUsage[usageKey] || 0) + 1;

      const { error } = await admin
        .from('demos')
        .update({ demo_settings: demoSettings })
        .eq('id', demo.id);
      if (error) throw error;

      return res.status(200).json({
        message: `${type} tracked successfully`,
        currentUsage: demoSettings.usageLimits.currentUsage
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
      const demo = await findDemoRow(demoId);
      if (!demo) {
        return res.status(404).json({ message: 'Demo not found' });
      }

      // Reset usage counters in the JSONB demo_settings object
      const demoSettings = demo.demo_settings || {};
      demoSettings.usageLimits = demoSettings.usageLimits || {};
      demoSettings.usageLimits.currentUsage = {
        interactions: 0,
        views: 0
      };

      const { error } = await admin
        .from('demos')
        .update({ demo_settings: demoSettings })
        .eq('id', demo.id);
      if (error) throw error;

      return res.status(200).json({ message: 'Usage counters reset successfully' });
    } catch (error) {
      console.error('Error resetting demo usage:', error);
      return res.status(500).json({ message: 'Failed to reset usage counters' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

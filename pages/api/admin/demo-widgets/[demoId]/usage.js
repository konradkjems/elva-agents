import { admin } from '../../../../../lib/supabase/admin';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Demo widgets live in the widgets table (is_demo_mode = true). The demoId in
// the URL is the widget's custom string legacy_id; fall back to the uuid id.
async function findDemoWidgetRow(demoId) {
  let { data } = await admin
    .from('widgets')
    .select('*')
    .eq('legacy_id', demoId)
    .eq('is_demo_mode', true)
    .maybeSingle();
  if (!data && UUID_RE.test(demoId)) {
    ({ data } = await admin
      .from('widgets')
      .select('*')
      .eq('id', demoId)
      .eq('is_demo_mode', true)
      .maybeSingle());
  }
  return data || null;
}

export default async function handler(req, res) {
  const { demoId } = req.query;

  if (!demoId) {
    return res.status(400).json({ message: 'Demo ID is required' });
  }

  try {
    if (req.method === 'GET') {
      // Get demo usage statistics
      const demo = await findDemoWidgetRow(demoId);

      if (!demo || !demo.demo_settings) {
        return res.status(404).json({ message: 'Demo widget not found' });
      }

      const usage = {
        currentUsage: demo.demo_settings.usageLimits?.currentUsage || { interactions: 0, views: 0 },
        limits: demo.demo_settings.usageLimits || {},
        isExpired: demo.demo_settings.usageLimits?.expiresAt ?
          new Date(demo.demo_settings.usageLimits.expiresAt) < new Date() : false,
        isLimitReached: {
          interactions: (demo.demo_settings.usageLimits?.currentUsage?.interactions || 0) >=
                       (demo.demo_settings.usageLimits?.maxInteractions || 0),
          views: (demo.demo_settings.usageLimits?.currentUsage?.views || 0) >=
                 (demo.demo_settings.usageLimits?.maxViews || 0)
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

      const demo = await findDemoWidgetRow(demoId);

      if (!demo || !demo.demo_settings) {
        return res.status(404).json({ message: 'Demo widget not found' });
      }

      // Check if demo is expired
      const isExpired = demo.demo_settings.usageLimits?.expiresAt ?
        new Date(demo.demo_settings.usageLimits.expiresAt) < new Date() : false;

      if (isExpired) {
        return res.status(410).json({ message: 'Demo has expired' });
      }

      // Check current usage
      const currentUsage = demo.demo_settings.usageLimits?.currentUsage || { interactions: 0, views: 0 };

      if (type === 'view') {
        if (currentUsage.views >= (demo.demo_settings.usageLimits?.maxViews || 0)) {
          return res.status(429).json({ message: 'Maximum views reached' });
        }
      } else if (type === 'interaction') {
        if (currentUsage.interactions >= (demo.demo_settings.usageLimits?.maxInteractions || 0)) {
          return res.status(429).json({ message: 'Maximum interactions reached' });
        }
      }

      // Increment usage counter in the JSONB demo_settings object and write back
      const demoSettings = demo.demo_settings;
      demoSettings.usageLimits = demoSettings.usageLimits || {};
      demoSettings.usageLimits.currentUsage = demoSettings.usageLimits.currentUsage || { interactions: 0, views: 0 };

      const usageKey = type === 'view' ? 'views' : 'interactions';
      demoSettings.usageLimits.currentUsage[usageKey] =
        (demoSettings.usageLimits.currentUsage[usageKey] || 0) + 1;

      const { error } = await admin
        .from('widgets')
        .update({ demo_settings: demoSettings })
        .eq('id', demo.id)
        .eq('is_demo_mode', true);
      if (error) throw error;

      return res.status(200).json({
        message: `${type} recorded successfully`,
        currentUsage: demoSettings.usageLimits.currentUsage
      });
    }

    if (req.method === 'PUT') {
      // Reset usage counters (admin only)
      const demo = await findDemoWidgetRow(demoId);

      if (!demo || !demo.demo_settings) {
        return res.status(404).json({ message: 'Demo widget not found' });
      }

      const demoSettings = demo.demo_settings;
      demoSettings.usageLimits = demoSettings.usageLimits || {};
      demoSettings.usageLimits.currentUsage = {
        interactions: 0,
        views: 0
      };

      const { error } = await admin
        .from('widgets')
        .update({ demo_settings: demoSettings })
        .eq('id', demo.id)
        .eq('is_demo_mode', true);
      if (error) throw error;

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

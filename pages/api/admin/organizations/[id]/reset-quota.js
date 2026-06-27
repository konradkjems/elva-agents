import { admin } from '../../../../../lib/supabase/admin';
import { getSessionContext } from '../../../../../lib/supabase/session';
import { manualResetQuota, getUsageStats } from '../../../../../lib/quota.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user and check platform admin role
    const session = await getSessionContext(req, res);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is platform admin
    if (session.user.platformRole !== 'platform_admin') {
      return res.status(403).json({ error: 'Forbidden: Platform admin access required' });
    }

    const { id: orgId } = req.query;

    // Validate organization ID
    if (!UUID_RE.test(orgId)) {
      return res.status(400).json({ error: 'Invalid organization ID' });
    }

    // Check if organization exists
    const { data: organization } = await admin
      .from('organizations')
      .select('id, name, plan')
      .eq('id', orgId)
      .maybeSingle();

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Reset the quota
    const resetBy = session.user.id;
    await manualResetQuota(orgId, resetBy);

    // Get updated usage stats
    const stats = await getUsageStats(orgId);

    console.log(`✅ Platform admin ${session.user.email} reset quota for ${organization.name}`);

    return res.status(200).json({
      success: true,
      message: 'Quota reset successfully',
      usage: stats,
      organization: {
        id: organization.id,
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

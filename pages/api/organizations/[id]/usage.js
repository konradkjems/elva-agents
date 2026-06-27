import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { admin } from '../../../../lib/supabase/admin';
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

    const { id: orgId } = req.query;

    if (!orgId) {
      return res.status(400).json({ error: 'Invalid organization ID' });
    }

    // Check if user belongs to this organization
    const isPlatformAdmin = session.user.platformRole === 'platform_admin';

    if (!isPlatformAdmin) {
      const { data: membership } = await admin
        .from('team_members')
        .select('id')
        .eq('organization_id', orgId)
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!membership) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get usage statistics
    const stats = await getUsageStats(orgId);

    return res.status(200).json(stats);

  } catch (error) {
    console.error('❌ Error fetching usage stats:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}

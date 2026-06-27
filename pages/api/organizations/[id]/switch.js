/**
 * Switch Organization Context API
 *
 * POST /api/organizations/[id]/switch - Switch user's current organization
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { admin } from '../../../../lib/supabase/admin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = session.user.id;
    const { id: orgId } = req.query;

    if (!orgId) {
      return res.status(400).json({ error: 'Invalid organization ID' });
    }

    // Check if user is a member of this organization or is platform admin
    const { data: membership } = await admin
      .from('team_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    const { data: user } = await admin
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    const isPlatformAdmin = user && user.role === 'platform_admin';

    if (!membership && !isPlatformAdmin) {
      return res.status(403).json({ error: 'You are not a member of this organization' });
    }

    // Check if organization exists and is not deleted
    const { data: organization } = await admin
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .is('deleted_at', null)
      .maybeSingle();

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Update user's current organization
    const { error: updateErr } = await admin
      .from('users')
      .update({ current_organization_id: orgId })
      .eq('id', userId);
    if (updateErr) throw updateErr;

    return res.status(200).json({
      message: 'Organization switched successfully',
      organizationId: orgId,
      organizationName: organization.name,
      role: membership ? membership.role : 'platform_admin'
    });

  } catch (error) {
    console.error('Switch organization API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

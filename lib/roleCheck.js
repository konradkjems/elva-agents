import { getServerSession } from 'next-auth/next';
import { authOptions } from '../pages/api/auth/[...nextauth]';
import { admin } from './supabase/admin';

export async function getUserTeamRole(userId, organizationId) {
  if (!userId || !organizationId) return null;

  const { data, error } = await admin
    .from('team_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error('❌ getUserTeamRole error:', error.message);
    return null;
  }

  return data?.role || null;
}

export async function requireRole(req, res, allowedRoles) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return { authorized: false, error: 'Not authenticated' };
  }

  const teamRole = await getUserTeamRole(
    session.user.id,
    session.user.currentOrganizationId
  );

  const isPlatformAdmin = session.user.role === 'platform_admin';

  if (!isPlatformAdmin && !allowedRoles.includes(teamRole)) {
    return { authorized: false, error: 'Insufficient permissions' };
  }

  return { authorized: true, teamRole, session };
}

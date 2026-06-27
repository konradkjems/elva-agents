/**
 * Phase 2 session context — the drop-in replacement for NextAuth's
 * `getServerSession(req, res, authOptions)` in API routes / getServerSideProps.
 *
 * Returns the SAME shape the codebase already reads off the NextAuth session:
 *
 *   { user: { id, email, name, image, role, provider,
 *             currentOrganizationId, teamRole, permissions } }
 *
 * or `null` when there is no valid session. Because auth.users.id === public
 * .users.id (same uuid from Phase 1), `session.user.id` is unchanged, so every
 * existing `session.user.X` access keeps working — only the import + call line
 * change at each site:
 *
 *   - const session = await getServerSession(req, res, authOptions)
 *   + const session = await getSessionContext(req, res)
 *
 * Auth is validated against Supabase (GoTrue) using the request-scoped anon
 * client + cookies. Profile/role/org are loaded with the service-role `admin`
 * client because RLS denies the anon role on application tables. This mirrors
 * what NextAuth's jwt() callback already did (a DB read per request); a Supabase
 * Custom Access Token Hook can later move these claims into the JWT to drop the
 * per-request read.
 */

import { createServerSupabase } from './server';
import { admin } from './admin';

export async function getSessionContext(req, res) {
  let supabase;
  try {
    supabase = createServerSupabase(req, res);
  } catch (e) {
    // Misconfigured env — treat as unauthenticated rather than throwing 500s.
    console.error('getSessionContext: client init failed:', e.message);
    return null;
  }

  const { data: { user } = {}, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  // Load the application profile (role + current org) with the service-role key.
  const { data: profile } = await admin
    .from('users')
    .select('id, email, name, image, role, provider, current_organization_id, status')
    .eq('id', user.id)
    .maybeSingle();

  // A valid Supabase token with no (or inactive) public.users row is not a usable
  // app session.
  if (!profile || profile.status === 'inactive' || profile.status === 'deleted') {
    return null;
  }

  let teamRole = null;
  let permissions = null;
  if (profile.current_organization_id) {
    const { data: member } = await admin
      .from('team_members')
      .select('role, permissions')
      .eq('user_id', profile.id)
      .eq('organization_id', profile.current_organization_id)
      .eq('status', 'active')
      .maybeSingle();
    if (member) {
      teamRole = member.role;
      permissions = member.permissions;
    }
  }

  return {
    user: {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      image: profile.image,
      role: profile.role,
      provider: profile.provider,
      currentOrganizationId: profile.current_organization_id || undefined,
      teamRole,
      permissions,
    },
  };
}

export default getSessionContext;

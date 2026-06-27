import { admin } from '../../lib/supabase/admin';
import { getSessionContext } from '../../lib/supabase/session';
import { fromRow, fromRows } from '../../lib/supabase/transform';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  const session = await getSessionContext(req, res);

  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!UUID_RE.test(session.user.id)) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  // Get user from database
  const { data: userRow } = await admin
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();
  const user = userRow ? fromRow(userRow) : null;

  // Get user's team memberships
  const { data: membershipRows } = await admin
    .from('team_members')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('status', 'active');
  const memberships = fromRows(membershipRows);

  // Get organizations
  const orgIds = memberships.map(m => m.organizationId).filter(Boolean);
  let organizations = [];
  if (orgIds.length > 0) {
    const { data: orgRows } = await admin
      .from('organizations')
      .select('*')
      .in('id', orgIds);
    organizations = fromRows(orgRows);
  }

  return res.json({
    session: {
      user: session.user,
      expires: session.expires
    },
    databaseUser: {
      _id: user?._id,
      email: user?.email,
      name: user?.name,
      role: user?.role,
      currentOrganizationId: user?.currentOrganizationId,
      status: user?.status
    },
    memberships: memberships.map(m => ({
      _id: m._id,
      organizationId: m.organizationId,
      role: m.role,
      status: m.status
    })),
    organizations: organizations.map(o => ({
      _id: o._id,
      name: o.name,
      slug: o.slug
    }))
  });
}

import { admin } from '../../../../lib/supabase/admin';
import { fromRow, toSnake } from '../../../../lib/supabase/transform';
import { withAdmin } from '../../../../lib/auth';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

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

// Demos expose their legacy_id as the public `_id`.
function serializeDemo(row) {
  const demo = fromRow(row);
  if (demo && demo.legacyId) demo._id = demo.legacyId;
  return demo;
}

export default async function handler(req, res) {
  // Set CORS headers for public demo access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { demoId } = req.query;

  if (req.method === 'GET') {
    // GET is public - anyone can view demos (no authentication required)
    // This allows sharing demo links with clients
    try {
      const demo = await findDemoRow(demoId);
      if (!demo) {
        return res.status(404).json({ message: 'Demo not found' });
      }
      return res.status(200).json(serializeDemo(demo));
    } catch (error) {
      console.error('Error fetching demo:', error);
      return res.status(500).json({ message: 'Failed to fetch demo' });
    }
  }

  // PUT and DELETE require authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // IMPORTANT: Only platform admins OR organization admin/owner can modify/delete demos
  const isPlatformAdmin = session.user?.role === 'platform_admin';
  const currentOrgId = session.user?.currentOrganizationId;

  if (!isPlatformAdmin && currentOrgId) {
    // Check if user has admin/owner role in their organization
    const { data: teamMember } = await admin
      .from('team_members')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('organization_id', currentOrgId)
      .maybeSingle();

    if (!teamMember || !['admin', 'owner'].includes(teamMember.role)) {
      return res.status(403).json({
        error: 'Access denied. Demo management requires platform admin or organization admin/owner role.'
      });
    }
  } else if (!isPlatformAdmin) {
    return res.status(403).json({
      error: 'Access denied. Demo management requires platform admin or organization admin/owner role.'
    });
  }

  // Look up the demo once (used for org-scoping and the update/delete target)
  const demoRow = await findDemoRow(demoId);

  // Verify the demo belongs to user's organization
  if (currentOrgId && demoRow && demoRow.organization_id && demoRow.organization_id !== currentOrgId) {
    return res.status(403).json({
      error: 'Access denied. This demo belongs to a different organization.'
    });
  }

  if (req.method === 'PUT') {
    try {
      if (!demoRow) {
        return res.status(404).json({ message: 'Demo not found' });
      }

      const patch = toSnake(req.body);
      // Never write immutable / trigger-managed columns
      delete patch.id;
      delete patch.created_at;
      delete patch.updated_at;

      const { error } = await admin
        .from('demos')
        .update(patch)
        .eq('id', demoRow.id);
      if (error) throw error;

      return res.status(200).json({ message: 'Demo updated successfully' });
    } catch (error) {
      console.error('Error updating demo:', error);
      return res.status(500).json({ message: 'Failed to update demo' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      if (!demoRow) {
        return res.status(404).json({ message: 'Demo not found' });
      }

      const { error } = await admin.from('demos').delete().eq('id', demoRow.id);
      if (error) throw error;

      return res.status(200).json({ message: 'Demo deleted successfully' });
    } catch (error) {
      console.error('Error deleting demo:', error);
      return res.status(500).json({ message: 'Failed to delete demo' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

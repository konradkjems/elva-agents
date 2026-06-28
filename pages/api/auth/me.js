/**
 * Returns the current session context for client components (the Supabase-Auth
 * replacement for NextAuth's /api/auth/session). Shape matches what the app
 * already reads off the session:
 *
 *   200 { user: { id, email, name, image, role, provider,
 *                 currentOrganizationId, teamRole, permissions } }
 *   401 { user: null }
 *
 * Backed by getSessionContext(), which validates the Supabase cookie session
 * and loads the profile/role with the service-role client.
 */

import { getSessionContext } from '../../../lib/supabase/session';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSessionContext(req, res);
    if (!session) {
      return res.status(401).json({ user: null });
    }
    return res.status(200).json(session);
  } catch (error) {
    console.error('auth/me error:', error);
    return res.status(500).json({ user: null });
  }
}

/**
 * Resolve a widget by its URL id param (embed legacy_id OR uuid PK) and enforce
 * org isolation — shared by the knowledge-base endpoints. Mirrors the
 * findWidgetRowById + org-check logic in pages/api/admin/widgets/[id].js, but kept
 * under lib/ so it isn't picked up as an API route.
 */

import { admin } from '../supabase/admin';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * @returns {Promise<{ notFound?: true, forbidden?: true, widget?: object }>}
 *   On success `widget` is the raw snake_case row (use widget.id as the FK).
 */
export async function resolveWidgetForOrg(id, session) {
  let { data } = await admin.from('widgets').select('*').eq('legacy_id', id).maybeSingle();
  if (!data && UUID_RE.test(id)) {
    ({ data } = await admin.from('widgets').select('*').eq('id', id).maybeSingle());
  }
  if (!data) return { notFound: true };

  const isPlatformAdmin = session.user?.role === 'platform_admin';
  const currentOrgId = session.user?.currentOrganizationId;
  if (!isPlatformAdmin && data.organization_id !== currentOrgId) {
    return { forbidden: true };
  }
  return { widget: data };
}

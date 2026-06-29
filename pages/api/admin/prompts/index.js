import { admin } from '@/lib/supabase/admin';
import { getSessionContext } from '@/lib/supabase/session';
import { fromRow, fromRows } from '@/lib/supabase/transform';
import { requireRole } from '@/lib/roleCheck';
import { isValidModel, DEFAULT_MODEL } from '@/lib/ai/models';

/**
 * In-platform prompts collection.
 *   GET  — list prompts for the current organization (optional ?widgetId= filter)
 *   POST — create a prompt + its initial version (v1) and point current at it
 */
async function handler(req, res) {
  const session = await getSessionContext(req, res);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const currentOrgId = session.user?.currentOrganizationId;
  const isPlatformAdmin = session.user?.role === 'platform_admin';

  if (req.method === 'GET') {
    try {
      let query = admin.from('prompts').select('*').order('updated_at', { ascending: false });
      if (currentOrgId) query = query.eq('organization_id', currentOrgId);
      if (req.query.widgetId) query = query.eq('widget_id', req.query.widgetId);

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(fromRows(data));
    } catch (error) {
      console.error('GET /api/admin/prompts error:', error);
      return res.status(500).json({ error: 'Failed to list prompts' });
    }
  }

  if (req.method === 'POST') {
    const roleCheck = await requireRole(req, res, ['owner', 'admin', 'editor']);
    if (!roleCheck.authorized) return res.status(403).json({ error: roleCheck.error });

    if (!currentOrgId) return res.status(400).json({ error: 'No organization selected' });

    const body = req.body || {};
    const name = (body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'name is required' });

    const systemPrompt = body.systemPrompt || '';
    const provider = body.provider || DEFAULT_MODEL.provider;
    const model = body.model || DEFAULT_MODEL.model;
    if (!isValidModel(provider, model)) {
      return res.status(400).json({ error: `Unknown model ${provider}/${model}` });
    }

    try {
      // 1) Insert the prompt shell.
      const { data: prompt, error: pErr } = await admin
        .from('prompts')
        .insert({
          organization_id: currentOrgId,
          widget_id: body.widgetId || null,
          name,
          description: body.description || null,
          created_by: session.user.id,
        })
        .select('*')
        .single();
      if (pErr) throw pErr;

      // 2) Insert version 1.
      const { data: version, error: vErr } = await admin
        .from('prompt_versions')
        .insert({
          prompt_id: prompt.id,
          version: 1,
          system_prompt: systemPrompt,
          provider,
          model,
          temperature: body.temperature ?? null,
          max_tokens: body.maxTokens ?? null,
          config: body.config || {},
          created_by: session.user.id,
        })
        .select('*')
        .single();
      if (vErr) throw vErr;

      // 3) Point the prompt at its current version.
      const { data: updated, error: uErr } = await admin
        .from('prompts')
        .update({ current_version_id: version.id })
        .eq('id', prompt.id)
        .select('*')
        .single();
      if (uErr) throw uErr;

      return res.status(201).json({ ...fromRow(updated), currentVersion: fromRow(version) });
    } catch (error) {
      console.error('POST /api/admin/prompts error:', error);
      return res.status(500).json({ error: 'Failed to create prompt' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}

export default handler;

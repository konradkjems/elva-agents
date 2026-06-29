import { admin } from '@/lib/supabase/admin';
import { getSessionContext } from '@/lib/supabase/session';
import { fromRow, fromRows } from '@/lib/supabase/transform';
import { requireRole } from '@/lib/roleCheck';
import { isValidModel } from '@/lib/ai/models';

/**
 * Versions of a single in-platform prompt.
 *   GET  — list versions (newest first)
 *   POST — "save as new version" (max(version)+1, immutable); becomes current
 *          unless body.setCurrent === false
 */
async function loadScopedPrompt(id, session) {
  const { data, error } = await admin.from('prompts').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return { notFound: true };

  const isPlatformAdmin = session.user?.role === 'platform_admin';
  const currentOrgId = session.user?.currentOrganizationId;
  if (!isPlatformAdmin && data.organization_id !== currentOrgId) {
    return { forbidden: true };
  }
  return { prompt: data };
}

async function handler(req, res) {
  const session = await getSessionContext(req, res);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;

  let scoped;
  try {
    scoped = await loadScopedPrompt(id, session);
  } catch (error) {
    console.error('prompts/[id]/versions lookup error:', error);
    return res.status(500).json({ error: 'Failed to load prompt' });
  }
  if (scoped.notFound) return res.status(404).json({ error: 'Prompt not found' });
  if (scoped.forbidden) return res.status(403).json({ error: 'Access denied' });
  const prompt = scoped.prompt;

  if (req.method === 'GET') {
    try {
      const { data, error } = await admin
        .from('prompt_versions')
        .select('*')
        .eq('prompt_id', prompt.id)
        .order('version', { ascending: false });
      if (error) throw error;
      return res.status(200).json(fromRows(data));
    } catch (error) {
      console.error('GET versions error:', error);
      return res.status(500).json({ error: 'Failed to list versions' });
    }
  }

  if (req.method === 'POST') {
    const roleCheck = await requireRole(req, res, ['owner', 'admin', 'editor']);
    if (!roleCheck.authorized) return res.status(403).json({ error: roleCheck.error });

    const body = req.body || {};
    const provider = body.provider;
    const model = body.model;
    if (!isValidModel(provider, model)) {
      return res.status(400).json({ error: `Unknown model ${provider}/${model}` });
    }

    try {
      // Next version number = current max + 1.
      const { data: maxRow, error: maxErr } = await admin
        .from('prompt_versions')
        .select('version')
        .eq('prompt_id', prompt.id)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (maxErr) throw maxErr;
      const nextVersion = (maxRow?.version || 0) + 1;

      const { data: version, error: vErr } = await admin
        .from('prompt_versions')
        .insert({
          prompt_id: prompt.id,
          version: nextVersion,
          system_prompt: body.systemPrompt || '',
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

      if (body.setCurrent !== false) {
        const { error: uErr } = await admin
          .from('prompts')
          .update({ current_version_id: version.id })
          .eq('id', prompt.id);
        if (uErr) throw uErr;
      }

      return res.status(201).json(fromRow(version));
    } catch (error) {
      console.error('POST versions error:', error);
      return res.status(500).json({ error: 'Failed to create version' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}

export default handler;

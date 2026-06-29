import { admin } from '@/lib/supabase/admin';
import { getSessionContext } from '@/lib/supabase/session';
import { fromRow } from '@/lib/supabase/transform';
import { requireRole } from '@/lib/roleCheck';

/**
 * A single in-platform prompt.
 *   GET    — prompt + its current version
 *   PUT    — rename/describe, OR roll back by repointing current_version_id
 *   DELETE — remove the prompt (versions cascade; widgets.prompt_id → null)
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
    console.error('prompts/[id] lookup error:', error);
    return res.status(500).json({ error: 'Failed to load prompt' });
  }
  if (scoped.notFound) return res.status(404).json({ error: 'Prompt not found' });
  if (scoped.forbidden) return res.status(403).json({ error: 'Access denied' });
  const prompt = scoped.prompt;

  if (req.method === 'GET') {
    try {
      let currentVersion = null;
      if (prompt.current_version_id) {
        const { data } = await admin
          .from('prompt_versions')
          .select('*')
          .eq('id', prompt.current_version_id)
          .maybeSingle();
        currentVersion = data ? fromRow(data) : null;
      }
      return res.status(200).json({ ...fromRow(prompt), currentVersion });
    } catch (error) {
      console.error('GET /api/admin/prompts/[id] error:', error);
      return res.status(500).json({ error: 'Failed to load prompt' });
    }
  }

  if (req.method === 'PUT') {
    const roleCheck = await requireRole(req, res, ['owner', 'admin', 'editor']);
    if (!roleCheck.authorized) return res.status(403).json({ error: roleCheck.error });

    const body = req.body || {};
    try {
      const patch = {};

      // Rollback: repoint current_version_id to an existing version of THIS prompt.
      if (body.currentVersionId || body.rollbackToVersion != null) {
        let target;
        if (body.currentVersionId) {
          const { data } = await admin
            .from('prompt_versions')
            .select('id, prompt_id')
            .eq('id', body.currentVersionId)
            .maybeSingle();
          target = data;
        } else {
          const { data } = await admin
            .from('prompt_versions')
            .select('id, prompt_id')
            .eq('prompt_id', prompt.id)
            .eq('version', Number(body.rollbackToVersion))
            .maybeSingle();
          target = data;
        }
        if (!target || target.prompt_id !== prompt.id) {
          return res.status(400).json({ error: 'Version does not belong to this prompt' });
        }
        patch.current_version_id = target.id;
      }

      if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim();
      if (typeof body.description === 'string') patch.description = body.description;

      if (Object.keys(patch).length === 0) {
        return res.status(400).json({ error: 'Nothing to update' });
      }

      const { data: updated, error } = await admin
        .from('prompts')
        .update(patch)
        .eq('id', prompt.id)
        .select('*')
        .single();
      if (error) throw error;
      return res.status(200).json(fromRow(updated));
    } catch (error) {
      console.error('PUT /api/admin/prompts/[id] error:', error);
      return res.status(500).json({ error: 'Failed to update prompt' });
    }
  }

  if (req.method === 'DELETE') {
    const roleCheck = await requireRole(req, res, ['owner', 'admin']);
    if (!roleCheck.authorized) return res.status(403).json({ error: roleCheck.error });
    try {
      const { error } = await admin.from('prompts').delete().eq('id', prompt.id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('DELETE /api/admin/prompts/[id] error:', error);
      return res.status(500).json({ error: 'Failed to delete prompt' });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  return res.status(405).json({ error: 'Method not allowed' });
}

export default handler;

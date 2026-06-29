import { getSessionContext } from '@/lib/supabase/session';
import { requireRole } from '@/lib/roleCheck';
import { apiLimiter, runMiddleware } from '@/lib/rate-limit';
import { resolveWidgetForOrg } from '@/lib/rag/access';
import { processKnowledgeQueue } from '@/lib/rag/worker';

// Manual "indeksér nu" — runs one ingestion pass scoped to this widget. Also how
// the editor drives crawl/embedding progress forward without waiting for the cron.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await runMiddleware(req, res, apiLimiter);
  } catch {
    return res.status(429).json({ error: 'Too many requests, please slow down' });
  }

  const session = await getSessionContext(req, res);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  const scoped = await resolveWidgetForOrg(id, session);
  if (scoped.notFound) return res.status(404).json({ error: 'Widget not found' });
  if (scoped.forbidden) return res.status(403).json({ error: 'Access denied' });

  const roleCheck = await requireRole(req, res, ['owner', 'admin', 'editor']);
  if (!roleCheck.authorized) return res.status(403).json({ error: roleCheck.error });

  try {
    const summary = await processKnowledgeQueue({ widgetId: scoped.widget.id });
    return res.status(200).json({ success: true, summary });
  } catch (error) {
    console.error('knowledge reprocess error:', error);
    return res.status(500).json({ error: error.message || 'Indeksering mislykkedes' });
  }
}

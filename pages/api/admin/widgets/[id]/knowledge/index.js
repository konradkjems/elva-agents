import { admin } from '@/lib/supabase/admin';
import { getSessionContext } from '@/lib/supabase/session';
import { fromRow, fromRows } from '@/lib/supabase/transform';
import { requireRole } from '@/lib/roleCheck';
import { apiLimiter, runMiddleware } from '@/lib/rate-limit';
import { resolveWidgetForOrg } from '@/lib/rag/access';
import { startSiteCrawl } from '@/lib/crawl/firecrawl';
import { processKnowledgeQueue } from '@/lib/rag/worker';

// Starting a crawl + a best-effort worker pass can run long; raise above the 30s cap.
export const config = { maxDuration: 60 };

// Knowledge-base sources for a widget.
//   GET  — list documents (status + chunk_count) for the widget
//   POST — add a source: { type: 'website', url } | { type: 'text', title, content }
//          (file uploads go through ./upload). Returns the created document (draft);
//          ingestion is then driven by a best-effort worker pass + cron safety-net.

const DOC_FIELDS = 'id, source_type, title, source_url, status, chunk_count, error, metadata, created_at, updated_at';

// Same input hygiene as generate-from-website: http(s) only, reject internal hosts.
function isSafeUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (!['http:', 'https:'].includes(u.protocol)) return false;
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host === '::1') return false;
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return false;
  if (host.startsWith('fc') || host.startsWith('fd')) return false; // IPv6 ULA
  return true;
}

export default async function handler(req, res) {
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
  const widget = scoped.widget;

  if (req.method === 'GET') {
    try {
      const { data, error } = await admin
        .from('documents')
        .select(DOC_FIELDS)
        .eq('widget_id', widget.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(fromRows(data));
    } catch (error) {
      console.error('GET knowledge error:', error);
      return res.status(500).json({ error: 'Failed to list knowledge sources' });
    }
  }

  if (req.method === 'POST') {
    const roleCheck = await requireRole(req, res, ['owner', 'admin', 'editor']);
    if (!roleCheck.authorized) return res.status(403).json({ error: roleCheck.error });

    const body = req.body || {};
    const type = body.type;

    try {
      let insert;

      if (type === 'website') {
        const url = (body.url || '').trim();
        if (!url || !isSafeUrl(url)) return res.status(400).json({ error: 'Ugyldig URL' });
        if (!process.env.FIRECRAWL_API_KEY) {
          return res.status(500).json({ error: 'Firecrawl er ikke konfigureret (FIRECRAWL_API_KEY mangler)' });
        }
        const { jobId } = await startSiteCrawl(url, { limit: body.limit });
        insert = {
          organization_id: widget.organization_id,
          widget_id: widget.id,
          source_type: 'website',
          title: body.title?.trim() || url,
          source_url: url,
          status: 'crawling',
          firecrawl_job_id: jobId,
        };
      } else if (type === 'text') {
        const content = (body.content || '').trim();
        if (!content) return res.status(400).json({ error: 'Tekstindhold mangler' });
        insert = {
          organization_id: widget.organization_id,
          widget_id: widget.id,
          source_type: 'text',
          title: body.title?.trim() || 'Tekst',
          status: 'pending',
          raw_content: content,
        };
      } else {
        return res.status(400).json({ error: 'Ukendt kildetype' });
      }

      const { data: doc, error } = await admin.from('documents').insert(insert).select(DOC_FIELDS).single();
      if (error) throw error;

      // Best-effort immediate indexing (bounded). Small text sources go straight to
      // ready; website crawls just get their status checked. Never blocks the response
      // beyond the budget, and never fails the request.
      try {
        await processKnowledgeQueue({ widgetId: widget.id, timeBudgetMs: 12000 });
      } catch (e) {
        console.error('post-create worker pass failed:', e?.message);
      }

      // Re-read so the returned status reflects the worker pass.
      const { data: fresh } = await admin.from('documents').select(DOC_FIELDS).eq('id', doc.id).maybeSingle();
      return res.status(201).json(fromRow(fresh || doc));
    } catch (error) {
      console.error('POST knowledge error:', error);
      return res.status(502).json({ error: error.message || 'Kunne ikke tilføje kilde' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}

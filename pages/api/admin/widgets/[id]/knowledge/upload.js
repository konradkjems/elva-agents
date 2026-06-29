import fs from 'fs';
import formidable from 'formidable';
import { admin } from '@/lib/supabase/admin';
import { getSessionContext } from '@/lib/supabase/session';
import { fromRow } from '@/lib/supabase/transform';
import { requireRole } from '@/lib/roleCheck';
import { apiLimiter, runMiddleware } from '@/lib/rate-limit';
import { resolveWidgetForOrg } from '@/lib/rag/access';
import { extractFileText, isSupportedFile, MAX_FILE_BYTES } from '@/lib/rag/files';
import { processKnowledgeQueue } from '@/lib/rag/worker';

// File upload as a knowledge source. Extracts text (pdf/docx/txt/md), stores it as
// a 'file' document, then runs a best-effort worker pass to chunk + embed it.
export const config = { api: { bodyParser: false } };

const DOC_FIELDS = 'id, source_type, title, source_url, status, chunk_count, error, metadata, created_at, updated_at';

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
  const widget = scoped.widget;

  const roleCheck = await requireRole(req, res, ['owner', 'admin', 'editor']);
  if (!roleCheck.authorized) return res.status(403).json({ error: roleCheck.error });

  let files;
  try {
    const form = formidable({ maxFileSize: MAX_FILE_BYTES, maxFiles: 1 });
    let fields;
    [fields, files] = await form.parse(req);

    const file = files.file?.[0];
    if (!file) return res.status(400).json({ error: 'Ingen fil uploadet' });

    const filename = file.originalFilename || 'fil';
    const mime = file.mimetype || '';
    if (!isSupportedFile(mime, filename)) {
      return res.status(400).json({ error: 'Filtype understøttes ikke (PDF, DOCX, TXT, MD)' });
    }

    const buffer = fs.readFileSync(file.filepath);
    const text = await extractFileText(buffer, mime, filename);
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Kunne ikke udtrække tekst fra filen' });
    }

    const title = fields.title?.[0]?.trim() || filename;
    const { data: doc, error } = await admin
      .from('documents')
      .insert({
        organization_id: widget.organization_id,
        widget_id: widget.id,
        source_type: 'file',
        title,
        status: 'pending',
        raw_content: text,
        metadata: { fileName: filename, mime, size: file.size || buffer.length },
      })
      .select(DOC_FIELDS)
      .single();
    if (error) throw error;

    try {
      await processKnowledgeQueue({ widgetId: widget.id, timeBudgetMs: 15000 });
    } catch (e) {
      console.error('post-upload worker pass failed:', e?.message);
    }

    const { data: fresh } = await admin.from('documents').select(DOC_FIELDS).eq('id', doc.id).maybeSingle();
    return res.status(201).json(fromRow(fresh || doc));
  } catch (error) {
    console.error('knowledge upload error:', error);
    return res.status(500).json({ error: error.message || 'Upload mislykkedes' });
  } finally {
    try {
      if (files?.file?.[0]?.filepath) fs.unlinkSync(files.file[0].filepath);
    } catch {
      /* ignore cleanup errors */
    }
  }
}

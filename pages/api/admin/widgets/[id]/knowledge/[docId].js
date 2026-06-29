import { admin } from '@/lib/supabase/admin';
import { getSessionContext } from '@/lib/supabase/session';
import { fromRow, fromRows } from '@/lib/supabase/transform';
import { requireRole } from '@/lib/roleCheck';
import { resolveWidgetForOrg } from '@/lib/rag/access';

// A single knowledge document.
//   GET    — detail
//   DELETE — remove the source (chunks cascade via FK)
const DOC_FIELDS = 'id, source_type, title, source_url, status, chunk_count, error, metadata, created_at, updated_at';

export default async function handler(req, res) {
  const session = await getSessionContext(req, res);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const { id, docId } = req.query;
  const scoped = await resolveWidgetForOrg(id, session);
  if (scoped.notFound) return res.status(404).json({ error: 'Widget not found' });
  if (scoped.forbidden) return res.status(403).json({ error: 'Access denied' });
  const widget = scoped.widget;

  // Verify the document belongs to this widget before doing anything.
  const { data: doc, error: loadErr } = await admin
    .from('documents')
    .select(DOC_FIELDS + ', widget_id')
    .eq('id', docId)
    .maybeSingle();
  if (loadErr) {
    console.error('knowledge doc lookup error:', loadErr);
    return res.status(500).json({ error: 'Failed to load document' });
  }
  if (!doc || doc.widget_id !== widget.id) return res.status(404).json({ error: 'Document not found' });

  if (req.method === 'GET') {
    const result = fromRow(doc);
    // ?chunks=1 — include the stored excerpts so the editor can show exactly what
    // was indexed for this source (content the bot retrieves from).
    if (req.query.chunks) {
      const { data: chunks, error: chunkErr } = await admin
        .from('document_chunks')
        .select('id, chunk_index, content, token_count')
        .eq('document_id', docId)
        .order('chunk_index', { ascending: true });
      if (chunkErr) {
        console.error('knowledge chunk fetch error:', chunkErr);
        return res.status(500).json({ error: 'Failed to load chunks' });
      }
      result.chunks = fromRows(chunks);
    }
    return res.status(200).json(result);
  }

  if (req.method === 'DELETE') {
    const roleCheck = await requireRole(req, res, ['owner', 'admin', 'editor']);
    if (!roleCheck.authorized) return res.status(403).json({ error: roleCheck.error });
    try {
      const { error } = await admin.from('documents').delete().eq('id', docId);
      if (error) throw error;
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('DELETE knowledge doc error:', error);
      return res.status(500).json({ error: 'Failed to delete document' });
    }
  }

  res.setHeader('Allow', ['GET', 'DELETE']);
  return res.status(405).json({ error: 'Method not allowed' });
}

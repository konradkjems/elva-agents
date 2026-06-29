/**
 * RAG ingestion worker — resumable, idempotent, time-budgeted.
 *
 * Shared by the on-demand triggers (source creation + "indeksér nu" button) and
 * the cron safety-net (pages/api/cron/process-knowledge.js). Because Vercel routes
 * are capped at 30s, every pass is bounded by a time budget and picks up where the
 * last one left off — documents move pending|crawling → processing → ready and
 * chunks are embedded in batches.
 *
 * All DB access goes through the service-role client (bypasses RLS).
 */

import { admin } from '../supabase/admin';
import { fetchCrawlResult } from '../crawl/firecrawl';
import { chunkText, estimateTokens } from './chunk';
import { embedChunks, toVectorLiteral } from './embed';

const EMBED_BATCH = 96; // chunks embedded per AI Gateway call
const CHUNK_INSERT_BATCH = 500; // rows per insert
const DEFAULT_BUDGET_MS = 22000; // stay well under the 30s route cap

/**
 * Run one ingestion pass.
 * @param {{ widgetId?: string|null, timeBudgetMs?: number }} opts
 *   widgetId scopes the pass to a single widget (on-demand); omit for the cron sweep.
 */
export async function processKnowledgeQueue({ widgetId = null, timeBudgetMs = DEFAULT_BUDGET_MS } = {}) {
  const start = Date.now();
  const overBudget = () => Date.now() - start > timeBudgetMs;
  const summary = {
    crawlsAdvanced: 0,
    documentsChunked: 0,
    chunksEmbedded: 0,
    documentsReady: 0,
    errors: [],
  };

  await advanceCrawls({ widgetId, overBudget, summary });
  if (!overBudget()) await chunkPending({ widgetId, overBudget, summary });
  if (!overBudget()) await embedPending({ widgetId, overBudget, summary });
  if (!overBudget()) await finalizeReady({ widgetId, summary });

  return summary;
}

// ── 1) Advance running website crawls ──────────────────────────────────────
async function advanceCrawls({ widgetId, overBudget, summary }) {
  let q = admin
    .from('documents')
    .select('*')
    .eq('status', 'crawling')
    .eq('source_type', 'website')
    .limit(10);
  if (widgetId) q = q.eq('widget_id', widgetId);

  const { data: docs, error } = await q;
  if (error) {
    summary.errors.push(`crawls query: ${error.message}`);
    return;
  }

  for (const doc of docs || []) {
    if (overBudget()) return;
    if (!doc.firecrawl_job_id) {
      await failDocument(doc.id, 'Missing crawl job id');
      continue;
    }
    try {
      const result = await fetchCrawlResult(doc.firecrawl_job_id);
      if (result.status === 'failed' || result.status === 'cancelled') {
        await failDocument(doc.id, `crawl ${result.status}`);
        continue;
      }
      if (result.status !== 'completed') continue; // still scraping — re-check next pass

      const chunkRows = pagesToChunkRows(doc, result.pages);
      if (!chunkRows.length) {
        await failDocument(doc.id, 'Crawl returned no usable content');
        continue;
      }
      // Idempotent: clear any chunks from a prior interrupted pass before reinserting.
      await admin.from('document_chunks').delete().eq('document_id', doc.id);
      await insertChunkRows(chunkRows);
      await admin
        .from('documents')
        .update({
          status: 'processing',
          metadata: { ...(doc.metadata || {}), pageCount: result.pages.length },
        })
        .eq('id', doc.id);
      summary.crawlsAdvanced++;
    } catch (e) {
      summary.errors.push(`crawl ${doc.id}: ${e.message}`);
      await failDocument(doc.id, e.message);
    }
  }
}

// ── 2) Chunk pending text/file documents ───────────────────────────────────
async function chunkPending({ widgetId, overBudget, summary }) {
  let q = admin
    .from('documents')
    .select('*')
    .eq('status', 'pending')
    .in('source_type', ['text', 'file'])
    .limit(20);
  if (widgetId) q = q.eq('widget_id', widgetId);

  const { data: docs, error } = await q;
  if (error) {
    summary.errors.push(`pending query: ${error.message}`);
    return;
  }

  for (const doc of docs || []) {
    if (overBudget()) return;
    try {
      const pieces = chunkText(doc.raw_content || '');
      if (!pieces.length) {
        await failDocument(doc.id, 'No extractable content');
        continue;
      }
      const rows = pieces.map((p) => ({
        document_id: doc.id,
        widget_id: doc.widget_id,
        organization_id: doc.organization_id,
        chunk_index: p.index,
        content: p.content,
        token_count: estimateTokens(p.content),
        metadata: { title: doc.title || null },
      }));
      await admin.from('document_chunks').delete().eq('document_id', doc.id);
      await insertChunkRows(rows);
      await admin.from('documents').update({ status: 'processing' }).eq('id', doc.id);
      summary.documentsChunked++;
    } catch (e) {
      summary.errors.push(`chunk ${doc.id}: ${e.message}`);
      await failDocument(doc.id, e.message);
    }
  }
}

// ── 3) Embed chunks awaiting an embedding ──────────────────────────────────
async function embedPending({ widgetId, overBudget, summary }) {
  while (!overBudget()) {
    let q = admin
      .from('document_chunks')
      .select('id, content')
      .is('embedding', null)
      .limit(EMBED_BATCH);
    if (widgetId) q = q.eq('widget_id', widgetId);

    const { data: chunks, error } = await q;
    if (error) {
      summary.errors.push(`embed query: ${error.message}`);
      return;
    }
    if (!chunks || chunks.length === 0) return;

    let vectors;
    try {
      vectors = await embedChunks(chunks.map((c) => c.content));
    } catch (e) {
      summary.errors.push(`embed batch: ${e.message}`);
      return; // leave chunks null; a later pass retries
    }

    // Persist embeddings (bounded concurrency to avoid hammering the pool).
    for (let i = 0; i < chunks.length; i += 25) {
      const slice = chunks.slice(i, i + 25);
      await Promise.all(
        slice.map((c, j) =>
          admin
            .from('document_chunks')
            .update({ embedding: toVectorLiteral(vectors[i + j]) })
            .eq('id', c.id)
            .then(({ error: upErr }) => {
              if (upErr) summary.errors.push(`embed update ${c.id}: ${upErr.message}`);
            })
        )
      );
    }
    summary.chunksEmbedded += chunks.length;
  }
}

// ── 4) Mark fully-embedded documents ready ─────────────────────────────────
async function finalizeReady({ widgetId, summary }) {
  let q = admin.from('documents').select('id, widget_id').eq('status', 'processing').limit(50);
  if (widgetId) q = q.eq('widget_id', widgetId);

  const { data: docs, error } = await q;
  if (error) {
    summary.errors.push(`finalize query: ${error.message}`);
    return;
  }

  for (const doc of docs || []) {
    const { count: pending, error: pErr } = await admin
      .from('document_chunks')
      .select('id', { count: 'exact', head: true })
      .eq('document_id', doc.id)
      .is('embedding', null);
    if (pErr) {
      summary.errors.push(`finalize count ${doc.id}: ${pErr.message}`);
      continue;
    }
    if (pending && pending > 0) continue; // still embedding

    const { count: total } = await admin
      .from('document_chunks')
      .select('id', { count: 'exact', head: true })
      .eq('document_id', doc.id);

    await admin
      .from('documents')
      .update({ status: 'ready', chunk_count: total || 0, error: null })
      .eq('id', doc.id);
    summary.documentsReady++;
    await maybeEnableKnowledgeBase(doc.widget_id);
  }
}

// ── helpers ────────────────────────────────────────────────────────────────
function pagesToChunkRows(doc, pages) {
  const rows = [];
  let idx = 0;
  for (const page of pages || []) {
    for (const piece of chunkText(page.markdown)) {
      rows.push({
        document_id: doc.id,
        widget_id: doc.widget_id,
        organization_id: doc.organization_id,
        chunk_index: idx++,
        content: piece.content,
        token_count: estimateTokens(piece.content),
        metadata: { sourceUrl: page.url || doc.source_url || null, pageTitle: page.title || null },
      });
    }
  }
  return rows;
}

async function insertChunkRows(rows) {
  for (let i = 0; i < rows.length; i += CHUNK_INSERT_BATCH) {
    const { error } = await admin.from('document_chunks').insert(rows.slice(i, i + CHUNK_INSERT_BATCH));
    if (error) throw new Error(error.message);
  }
}

async function failDocument(id, message) {
  await admin
    .from('documents')
    .update({ status: 'failed', error: String(message || 'Unknown error').slice(0, 500) })
    .eq('id', id);
}

// Auto-enable the widget's knowledge base the first time a source becomes ready,
// unless the owner has explicitly toggled it off.
async function maybeEnableKnowledgeBase(widgetId) {
  const { data: widget } = await admin
    .from('widgets')
    .select('knowledge_base')
    .eq('id', widgetId)
    .maybeSingle();
  const kb = widget?.knowledge_base || {};
  if (kb.enabled === undefined || kb.enabled === null) {
    await admin
      .from('widgets')
      .update({ knowledge_base: { ...kb, enabled: true, topK: kb.topK ?? 5 } })
      .eq('id', widgetId);
  }
}

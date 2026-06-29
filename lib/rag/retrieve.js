/**
 * Query-time retrieval for the RAG knowledge base.
 *
 * Embeds the user's question, runs the match_document_chunks cosine-similarity RPC
 * scoped to a single widget, and formats the top chunks into a context block that
 * gets prepended to the system prompt (respond-stream.js / respond-v2.js).
 *
 * NEVER throws — any failure returns empty context so chat is never broken by RAG.
 */

import { admin } from '../supabase/admin';
import { embedQuery, toVectorLiteral } from './embed';

const DEFAULT_TOP_K = 5;
const MAX_TOP_K = 12;
const DEFAULT_MIN_SIMILARITY = 0.0;
const MAX_CONTEXT_CHARS = 6000;

/**
 * @param {{ widgetId: string, query: string, topK?: number, minSimilarity?: number }} opts
 *   widgetId MUST be the widget uuid (document_chunks.widget_id), not the embed id.
 * @returns {Promise<{ contextText: string, sources: string[] }>}
 */
export async function retrieveContext({ widgetId, query, topK = DEFAULT_TOP_K, minSimilarity = DEFAULT_MIN_SIMILARITY }) {
  const empty = { contextText: '', sources: [] };
  try {
    if (!widgetId || !query || !String(query).trim()) return empty;

    const vec = await embedQuery(String(query).trim());
    const { data, error } = await admin.rpc('match_document_chunks', {
      p_widget_id: widgetId,
      p_query_embedding: toVectorLiteral(vec),
      p_match_count: Math.min(Math.max(1, Number(topK) || DEFAULT_TOP_K), MAX_TOP_K),
      p_min_similarity: minSimilarity,
    });
    if (error || !Array.isArray(data) || data.length === 0) return empty;

    const parts = [];
    const sources = [];
    let used = 0;
    for (const row of data) {
      const piece = (row.content || '').trim();
      if (!piece) continue;
      if (used + piece.length > MAX_CONTEXT_CHARS) break;
      used += piece.length;
      parts.push(piece);
      const src = row.metadata?.sourceUrl || row.metadata?.title || null;
      if (src && !sources.includes(src)) sources.push(src);
    }
    if (!parts.length) return empty;

    const contextText =
      'Brug følgende uddrag fra virksomhedens vidensbase til at besvare brugerens spørgsmål. ' +
      'Hold dig til informationen i uddragene; hvis svaret ikke fremgår, så sig det ærligt frem for at gætte.\n\n' +
      '## Vidensbase\n' +
      parts.map((p, i) => `[${i + 1}] ${p}`).join('\n\n');

    return { contextText, sources };
  } catch {
    return empty;
  }
}

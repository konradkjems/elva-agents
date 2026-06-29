/**
 * Embedding helpers for the RAG knowledge base.
 *
 * Thin wrappers around the Vercel AI SDK's embed/embedMany, addressing the model
 * by a bare "provider/model" string routed through the AI Gateway — the same
 * pattern lib/ai/engine.js uses for chat. EMBEDDING_MODEL is the single source of
 * truth and must match the pgvector column width (migration 0010, vector(1536)).
 */

import { embed, embedMany } from 'ai';
import { EMBEDDING_MODEL } from '../ai/models';

/** Embed a batch of chunk texts. Returns an array of vectors (same order). */
export async function embedChunks(texts) {
  if (!texts || texts.length === 0) return [];
  const { embeddings } = await embedMany({ model: EMBEDDING_MODEL, values: texts });
  return embeddings;
}

/** Embed a single query string. Returns one vector. */
export async function embedQuery(text) {
  const { embedding } = await embed({ model: EMBEDDING_MODEL, value: text });
  return embedding;
}

/**
 * pgvector text literal — '[0.1,0.2,…]'. PostgREST passes vector columns/args as
 * strings, so we serialize explicitly (both for inserts and RPC args) rather than
 * relying on JS-array coercion.
 */
export function toVectorLiteral(vec) {
  return `[${Array.from(vec).join(',')}]`;
}

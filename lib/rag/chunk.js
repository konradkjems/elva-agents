/**
 * Text chunking for RAG ingestion.
 *
 * Greedily packs paragraph/heading blocks into ~maxChars windows (≈800 tokens at
 * 4 chars/token), hard-splitting any single block that's too large. Each chunk
 * after the first is prefixed with a short tail of the previous chunk so context
 * isn't lost at the boundary.
 */

const DEFAULT_MAX_CHARS = 3200; // ~800 tokens
const DEFAULT_OVERLAP = 400; // ~100 tokens

/**
 * @returns {{ content: string, index: number }[]}
 */
export function chunkText(text, { maxChars = DEFAULT_MAX_CHARS, overlap = DEFAULT_OVERLAP } = {}) {
  const clean = (text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!clean) return [];

  const blocks = clean
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  // Pack blocks greedily into ~maxChars windows.
  const raw = [];
  let buf = '';
  for (const block of blocks) {
    if (block.length > maxChars) {
      if (buf) {
        raw.push(buf);
        buf = '';
      }
      for (let i = 0; i < block.length; i += maxChars) {
        raw.push(block.slice(i, i + maxChars));
      }
      continue;
    }
    if (buf && buf.length + block.length + 2 > maxChars) {
      raw.push(buf);
      buf = '';
    }
    buf = buf ? `${buf}\n\n${block}` : block;
  }
  if (buf) raw.push(buf);

  // Prefix each chunk (except the first) with an overlap tail of the previous one.
  const withOverlap = raw.map((content, i) => {
    if (i === 0 || overlap <= 0) return content;
    const tail = raw[i - 1].slice(-overlap);
    return `${tail}\n\n${content}`;
  });

  return withOverlap
    .map((content) => content.trim())
    .filter(Boolean)
    .map((content, index) => ({ content, index }));
}

/** Rough token estimate (4 chars/token) for storing token_count without a tokenizer. */
export function estimateTokens(text) {
  return Math.ceil((text || '').length / 4);
}

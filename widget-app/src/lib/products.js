/**
 * Product-card extraction from assistant replies. Same three syntaxes the
 * v1 widget understood:
 *   [PRODUCTS] <json array | object> [/PRODUCTS]
 *   [PRODUCT:url="…"|image="…"|name="…"|price="…"]
 *   markdown links to cotonshoppen.dk product pages (metadata fetched)
 */

const BLOCK_RE = /\[PRODUCTS\]([\s\S]*?)\[\/PRODUCTS\]/gi;
const TAG_RE = /\[PRODUCT:\s*([^\]]+)\]/gi;
// Customer-specific (v1 parity): Cottonshoppen product links become cards.
const COTON_LINK_RE = /\[([^\]]+)\]\((https?:\/\/(?:www\.)?cotonshoppen\.dk\/[^)\s]+)\)/gi;
const COTON_CITATION_RE = /\s*\(\[?cotonshoppen\.dk\]?\([^)]+\)\)|\s*\(cotonshoppen\.dk\)/gi;
const BRAND_PREFIX_RE = /^ECottonshoppen Ai-Kundeservice\s*/;

const normUrl = (u) => String(u || '').split(/[?#]/)[0].replace(/\/+$/, '');

function readAttrs(s) {
  const out = {};
  for (const part of s.split('|')) {
    const m = /^\s*(\w+)\s*=\s*"?([^"]*)"?\s*$/.exec(part);
    if (m) out[m[1].toLowerCase()] = m[2];
  }
  return out;
}

function toProduct(p) {
  if (!p || typeof p !== 'object' || !p.url) return null;
  return {
    url: String(p.url),
    image: p.image || p.imageUrl || null,
    name: p.name || p.title || null,
    price: p.price != null && p.price !== '' ? String(p.price) : null,
  };
}

/** During streaming: hide an unfinished [PRODUCTS] block or [PRODUCT: tag. */
export function hidePartialProducts(text) {
  let out = String(text || '').replace(BLOCK_RE, '');
  const open = out.search(/\[PRODUCTS\]/i);
  if (open !== -1) out = out.slice(0, open);
  const tag = out.search(/\[PRODUCT:[^\]]*$/i);
  if (tag !== -1) out = out.slice(0, tag);
  return out.replace(TAG_RE, '');
}

export function stripBrandPrefix(text) {
  return String(text || '').replace(BRAND_PREFIX_RE, '');
}

export function parseProducts(text, { enabled = true } = {}) {
  let clean = stripBrandPrefix(text).replace(COTON_CITATION_RE, '');
  if (!enabled) return { text: clean, products: [] };
  const products = [];

  clean = clean.replace(BLOCK_RE, (_, body) => {
    try {
      const data = JSON.parse(body.trim());
      (Array.isArray(data) ? data : [data]).forEach((p) => {
        const prod = toProduct(p);
        if (prod) products.push(prod);
      });
    } catch {
      /* malformed block: drop it from the text anyway */
    }
    return '';
  });

  clean = clean.replace(TAG_RE, (_, attrs) => {
    const prod = toProduct(readAttrs(attrs));
    if (prod) products.push(prod);
    return '';
  });

  clean.replace(COTON_LINK_RE, (_, label, url) => {
    products.push({ url, name: label, image: null, price: null, needsMetadata: true });
    return _;
  });

  const seen = new Set();
  const unique = products.filter((p) => {
    const k = normUrl(p.url);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { text: clean.replace(/\n{3,}/g, '\n\n').trim(), products: unique };
}

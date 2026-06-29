/**
 * Firecrawl-backed site content gathering for "auto-create chatbot from website".
 *
 * Firecrawl fetches pages server-side (handles JS-rendered sites) and returns clean
 * markdown — serverless-safe (no headless browser in our bundle). This module maps
 * a site, picks a small prioritized page set, scrapes them in parallel, and returns
 * concatenated markdown for the LLM synthesis step (lib/ai/autocreate.js).
 *
 * The same client is intended for reuse by the RAG ingestion crawl (Phase B).
 */

import Firecrawl from '@mendable/firecrawl-js';

let client;
function getClient() {
  if (!client) {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) throw new Error('FIRECRAWL_API_KEY is not set');
    client = new Firecrawl({ apiKey });
  }
  return client;
}

// Pages most useful for understanding a business (multilingual: en + da).
const KEY_PAGE_RE = /(about|om-os|om|services|ydelser|solutions|løsninger|products|produkter|pricing|priser|kontakt|contact|faq)/i;
const MAX_CHARS = 28000; // token budget for the combined markdown

function prioritize(urls, homeUrl, maxPages) {
  const seen = new Set();
  const home = [];
  const key = [];
  const rest = [];
  for (const u of urls) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    if (u === homeUrl) home.push(u);
    else if (KEY_PAGE_RE.test(u)) key.push(u);
    else rest.push(u);
  }
  if (home.length === 0) home.unshift(homeUrl);
  return [...home, ...key, ...rest].slice(0, maxPages);
}

/**
 * Gather a small, prioritized set of pages from a site as markdown.
 * Returns { sourceUrl, title, pages: [{url, markdown}], combinedMarkdown, pagesCrawled }.
 * Throws if no content could be fetched.
 */
export async function gatherSiteContent(url, { maxPages = 5 } = {}) {
  const fc = getClient();
  const homeUrl = url;

  // 1) Map the site to discover URLs (one fast call). Fall back to homepage-only.
  let candidateUrls = [homeUrl];
  try {
    const mapped = await fc.map(url);
    const links = (mapped?.links || [])
      .map((l) => (typeof l === 'string' ? l : l?.url))
      .filter(Boolean);
    if (links.length) candidateUrls = prioritize([homeUrl, ...links], homeUrl, maxPages);
  } catch {
    candidateUrls = [homeUrl];
  }

  // 2) Scrape the selected pages in parallel (markdown, main content only).
  const results = await Promise.allSettled(
    candidateUrls.map((u) => fc.scrape(u, { formats: ['markdown'], onlyMainContent: true }))
  );

  const pages = [];
  let title = null;
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value?.markdown) {
      if (!title && r.value.metadata?.title) title = r.value.metadata.title;
      pages.push({ url: candidateUrls[i], markdown: r.value.markdown });
    }
  });

  if (pages.length === 0) {
    throw new Error('Kunne ikke hente indhold fra sitet');
  }

  // 3) Concatenate + truncate to the token budget.
  let combinedMarkdown = pages
    .map((p) => `# Side: ${p.url}\n\n${p.markdown}`)
    .join('\n\n---\n\n');
  if (combinedMarkdown.length > MAX_CHARS) {
    combinedMarkdown = combinedMarkdown.slice(0, MAX_CHARS);
  }

  return { sourceUrl: homeUrl, title, pages, combinedMarkdown, pagesCrawled: pages.length };
}

// ──────────────────────────────────────────────────────────────────────────
// Deep crawl for RAG ingestion (Phase B).
//
// Unlike gatherSiteContent (a small synchronous map+scrape for auto-create), the
// knowledge base needs many pages. That can exceed a 30s API route, so we use the
// async job API: startSiteCrawl() kicks off the job (returns fast), and the
// ingestion worker (lib/rag/worker.js) polls fetchCrawlResult() until completed.
// ──────────────────────────────────────────────────────────────────────────

const DEFAULT_CRAWL_LIMIT = 50;
const MAX_CRAWL_LIMIT = 100;

/** Start an async deep crawl. Returns { jobId }. Fits within a 30s API route. */
export async function startSiteCrawl(url, { limit = DEFAULT_CRAWL_LIMIT, maxDiscoveryDepth } = {}) {
  const fc = getClient();
  const opts = {
    limit: Math.min(Math.max(1, Number(limit) || DEFAULT_CRAWL_LIMIT), MAX_CRAWL_LIMIT),
    scrapeOptions: { formats: ['markdown'], onlyMainContent: true },
  };
  if (maxDiscoveryDepth != null) opts.maxDiscoveryDepth = maxDiscoveryDepth;
  const res = await fc.startCrawl(url, opts);
  const jobId = res?.id || res?.jobId;
  if (!jobId) throw new Error('Firecrawl startCrawl returned no job id');
  return { jobId };
}

/**
 * Poll a crawl job. getCrawlStatus auto-paginates (aggregates all pages) by default;
 * we bound the fetch time so a worker pass stays well under the 30s route limit.
 * Returns { status, pages: [{ url, title, markdown }], total, completed }.
 *   status: 'scraping' (in progress) | 'completed' | 'failed' | 'cancelled'
 */
export async function fetchCrawlResult(jobId, { maxWaitTime = 18 } = {}) {
  const fc = getClient();
  const job = await fc.getCrawlStatus(jobId, { maxWaitTime });
  const pages = (job?.data || [])
    .map((d) => ({
      url: d?.metadata?.sourceURL || d?.metadata?.url || d?.metadata?.ogUrl || null,
      title: d?.metadata?.title || null,
      markdown: d?.markdown || '',
    }))
    .filter((p) => p.markdown && p.markdown.trim());
  return {
    status: job?.status || 'scraping',
    pages,
    total: job?.total ?? null,
    completed: job?.completed ?? null,
  };
}

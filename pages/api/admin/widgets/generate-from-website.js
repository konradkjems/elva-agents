import { getSessionContext } from '@/lib/supabase/session';
import { requireRole } from '@/lib/roleCheck';
import { apiLimiter, runMiddleware } from '@/lib/rate-limit';
import { gatherSiteContent } from '@/lib/crawl/firecrawl';
import { generateChatbotConfig } from '@/lib/ai/autocreate';

// POST /api/admin/widgets/generate-from-website
// Crawls a URL (Firecrawl) and synthesizes a starter chatbot config (LLM).
// Returns a DRAFT only — writes nothing to the DB. The create flow pre-fills the
// form from this, the user reviews/edits, then creates the widget.

// Basic input hygiene. Firecrawl fetches server-side so SSRF risk to our infra is
// minimal, but we still reject non-http(s) and obvious internal hosts.
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

  const roleCheck = await requireRole(req, res, ['owner', 'admin', 'editor']);
  if (!roleCheck.authorized) return res.status(403).json({ error: roleCheck.error });

  if (!session.user?.currentOrganizationId) {
    return res.status(400).json({ error: 'No organization selected' });
  }

  const { url } = req.body || {};
  if (!url || !isSafeUrl(url)) {
    return res.status(400).json({ error: 'Ugyldig URL' });
  }

  if (!process.env.FIRECRAWL_API_KEY) {
    return res.status(500).json({ error: 'Firecrawl er ikke konfigureret (FIRECRAWL_API_KEY mangler)' });
  }

  try {
    const site = await gatherSiteContent(url, { maxPages: 5 });
    const config = await generateChatbotConfig({
      siteContent: site.combinedMarkdown,
      sourceUrl: site.sourceUrl,
    });
    return res.status(200).json({ config, sourceUrl: site.sourceUrl, pagesCrawled: site.pagesCrawled });
  } catch (error) {
    console.error('generate-from-website error:', error);
    return res.status(502).json({ error: error.message || 'Kunne ikke generere fra website' });
  }
}

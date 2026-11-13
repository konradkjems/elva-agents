import { loadWidgetRecord, getBlockState, buildWidgetConfig, buildLauncherConfig, configEtag } from '../../../lib/widget-config';
import { loaderRuntime } from '../../../lib/widget-loader-runtime';

/**
 * GET /api/widget-embed/[widgetId]
 *
 * The URL customers paste (`<script src=".../api/widget-embed/<id>">`). Since
 * v2 it returns a small loader: the launcher and teaser render on the host
 * page right away, and the chat itself runs in an iframe served from
 * /widget/index.html (source: widget-app/). See lib/widget-loader-runtime.js.
 */

function frameOrigin(req) {
  const configured = (process.env.NEXT_PUBLIC_WIDGET_ORIGIN || '').replace(/\/+$/, '');
  if (configured) return configured;
  const proto = (req.headers['x-forwarded-proto'] || '').split(',')[0] || (req.headers.host?.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${req.headers['x-forwarded-host'] || req.headers.host}`;
}

function jsError(res, status, message) {
  // A <script> tag can't read JSON errors; log to the host console instead.
  res.status(status).send(`console.warn(${JSON.stringify('[Elva] ' + message)});`);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  const { widgetId } = req.query;
  if (!widgetId) return jsError(res, 400, 'Widget ID is required');

  try {
    const widget = await loadWidgetRecord(widgetId);
    if (!widget) return jsError(res, 404, `Widget ${widgetId} not found`);

    const block = await getBlockState(widget);
    const etag = configEtag(widget, block);
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=30, must-revalidate');
    if (req.headers['if-none-match'] === etag) return res.status(304).end();

    const config = buildWidgetConfig(widget, widgetId, block);
    const origin = frameOrigin(req);
    const boot = {
      origin,
      frameUrl: `${origin}/widget/index.html?id=${encodeURIComponent(String(widgetId))}`,
      config: buildLauncherConfig(config),
    };
    // Escape "</" so the JSON can never close a surrounding <script>.
    const bootJson = JSON.stringify(boot).replace(/<\//g, '<\\/');
    return res.status(200).send(`/* Elva chat widget v2 */\n(${loaderRuntime.toString()})(${bootJson});\n`);
  } catch (error) {
    console.error('widget-embed error:', error);
    return jsError(res, 500, 'Widget failed to load');
  }
}

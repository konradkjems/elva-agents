import { loadWidgetRecord, getBlockState, buildWidgetConfig, configEtag } from '../../../lib/widget-config';

/**
 * GET /api/widget-config/[widgetId]
 * Public widget config for the iframe chat app (public/widget/index.html).
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { widgetId } = req.query;
  if (!widgetId) return res.status(400).json({ error: 'Widget ID is required' });

  try {
    const widget = await loadWidgetRecord(widgetId);
    if (!widget) return res.status(404).json({ error: 'Widget not found' });

    const block = await getBlockState(widget);
    const etag = configEtag(widget, block);
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=30, must-revalidate');
    if (req.headers['if-none-match'] === etag) return res.status(304).end();

    return res.status(200).json(buildWidgetConfig(widget, widgetId, block));
  } catch (error) {
    console.error('widget-config error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

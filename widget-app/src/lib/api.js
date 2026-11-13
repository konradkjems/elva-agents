/** Same-origin API client: the frame is served from the Elva platform. */

export class ApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function json(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export async function fetchConfig(widgetId) {
  const res = await fetch(`/api/widget-config/${encodeURIComponent(widgetId)}`, { credentials: 'omit' });
  if (!res.ok) throw new ApiError('config', { status: res.status, body: await json(res) });
  return res.json();
}

/**
 * POST /api/respond-stream. Calls onEvent for each `data:` JSON event:
 * conversation → delta* → done | error. Pre-stream failures (403 quota,
 * 429 rate limit, 4xx/5xx) throw ApiError with the server's JSON body.
 */
export async function streamReply({ widgetId, message, userId, conversationId, imageUrl, consentAnalytics, signal }, onEvent) {
  const res = await fetch('/api/respond-stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Elva-Consent-Analytics': consentAnalytics ? 'true' : 'false',
    },
    body: JSON.stringify({ widgetId, message, userId, conversationId: conversationId || null, ...(imageUrl ? { imageUrl } : {}) }),
    signal,
  });
  if (!res.ok || !res.body) {
    const body = await json(res);
    throw new ApiError(body.message || body.error || 'request failed', { status: res.status, body });
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).trimEnd();
      buffer = buffer.slice(idx + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data) continue;
      try {
        onEvent(JSON.parse(data));
      } catch {
        /* malformed line: skip */
      }
    }
  }
}

export async function uploadImage(widgetId, file) {
  const form = new FormData();
  form.append('image', file);
  form.append('widgetId', widgetId);
  const res = await fetch('/api/upload-image', { method: 'POST', body: form });
  const body = await json(res);
  if (!res.ok || !body.success) throw new ApiError(body.error || 'upload failed', { status: res.status, body });
  return body.url;
}

async function post(url, payload, headers = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });
  const body = await json(res);
  if (!res.ok) throw new ApiError(body.error || 'request failed', { status: res.status, body });
  return body;
}

export const submitRating = (p) => post('/api/satisfaction/rate', p);
export const submitSupport = (p) => post('/api/support-request/submit', p);
export const requestLiveChat = (p) => post('/api/live-chat/request', p);
export const sendLiveMessage = (p) => post('/api/live-chat/user-message', p);

export async function pollLiveChat(conversationId, lastMessageId) {
  const q = new URLSearchParams({ conversationId });
  if (lastMessageId) q.set('lastMessageId', lastMessageId);
  const res = await fetch(`/api/live-chat/poll?${q}`);
  const body = await json(res);
  if (!res.ok) throw new ApiError(body.error || 'poll failed', { status: res.status, body });
  return body;
}

export async function fetchProductMetadata(url) {
  try {
    return await post('/api/product-metadata', { url });
  } catch {
    return null;
  }
}

export const proxiedImage = (url) => (url ? `/api/image-proxy?url=${encodeURIComponent(url)}` : null);

/**
 * postMessage bridge to the host-page loader (lib/widget-loader-runtime.js).
 * The loader owns first-party storage; the frame reads a snapshot at init
 * and writes through it. Outside an iframe (direct visit, local dev) the
 * bridge falls back to this frame's own storage.
 */

const params = new URLSearchParams(window.location.search);
export const WIDGET_ID = params.get('id') || params.get('widgetId') || '';
export const IS_PREVIEW = params.get('preview') === '1';
export const EMBEDDED = window.parent !== window;

const listeners = new Map();
let hostOrigin = null;

function emit(type, payload) {
  (listeners.get(type) || []).forEach((fn) => fn(payload));
}

window.addEventListener('message', (e) => {
  if (!EMBEDDED || e.source !== window.parent) return;
  const d = e.data;
  if (!d || d.__elva !== 2 || d.widgetId !== WIDGET_ID) return;
  if (!hostOrigin) hostOrigin = e.origin;
  if (e.origin !== hostOrigin) return;
  emit(d.type, d.payload || {});
});

export function on(type, fn) {
  if (!listeners.has(type)) listeners.set(type, []);
  listeners.get(type).push(fn);
  return () => listeners.set(type, (listeners.get(type) || []).filter((f) => f !== fn));
}

export function send(type, payload = {}) {
  if (!EMBEDDED) return;
  // Before the host has spoken we don't know its origin; 'ready' is the only
  // message sent that early and carries nothing sensitive.
  window.parent.postMessage({ __elva: 2, widgetId: WIDGET_ID, type, payload }, hostOrigin || '*');
}

const KEYS = {
  history: `conversationHistory_${WIDGET_ID}`,
  userId: `chatUserId_${WIDGET_ID}`,
  session: `elva-session_${WIDGET_ID}`,
};

function localFallback(area) {
  try {
    return area === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

/** Storage that lives on the host page when embedded. */
export function createStore(snapshot) {
  const cache = {
    history: snapshot?.local?.history ?? null,
    userId: snapshot?.local?.userId ?? null,
    consent: snapshot?.local?.consent ?? null,
    session: snapshot?.session?.session ?? null,
  };
  if (!EMBEDDED) {
    const l = localFallback('local');
    const s = localFallback('session');
    cache.history = l?.getItem(KEYS.history) ?? null;
    cache.userId = l?.getItem(KEYS.userId) ?? null;
    cache.consent = l?.getItem(`elva-consent-${WIDGET_ID}`) ?? null;
    cache.session = s?.getItem(KEYS.session) ?? null;
  }
  const write = (name, area, value) => {
    cache[name] = value;
    if (IS_PREVIEW) return;
    if (EMBEDDED) {
      send('storage', { area, key: KEYS[name], value });
    } else {
      const st = localFallback(area);
      try {
        value == null ? st?.removeItem(KEYS[name]) : st?.setItem(KEYS[name], value);
      } catch {
        /* storage blocked */
      }
    }
  };
  const json = (v, fallback) => {
    try {
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  };
  return {
    consent: () => json(cache.consent, null),
    history: () => json(cache.history, []),
    setHistory: (list) => write('history', 'local', JSON.stringify(list)),
    userId: () => cache.userId,
    setUserId: (id) => write('userId', 'local', id),
    session: () => json(cache.session, null),
    setSession: (obj) => write('session', 'session', obj ? JSON.stringify(obj) : null),
  };
}

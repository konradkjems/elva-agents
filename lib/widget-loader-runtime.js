/**
 * Host-page loader for the Elva chat widget (v2).
 *
 * Served by GET /api/widget-embed/[widgetId] as
 *   (loaderRuntime.toString())(BOOT)
 * so this function must stay self-contained: no imports, no closures over
 * module scope, plain browser JS.
 *
 * What it owns on the customer's page (everything else lives in the iframe):
 *   - the launcher button + online dot + unread badge, in a shadow root so
 *     host CSS can't touch it and ours can't leak out
 *   - the teaser bubble
 *   - the iframe (public/widget/index.html): preload, size, position,
 *     open/close motion, mobile fullscreen that follows the visual viewport
 *   - first-party storage for the frame (history, user id, consent, session),
 *     under the same localStorage keys the v1 widget used, so returning
 *     visitors keep their history
 *   - window.ElvaChat.open/close/toggle, plus window.hidePopup for v1 compat
 */
export function loaderRuntime(BOOT) {
  'use strict';
  var C = BOOT.config;
  var ID = String(C.widgetId);
  var ORIGIN = BOOT.origin;
  var registry = (window.__elvaWidgets = window.__elvaWidgets || {});
  if (registry[ID] && registry[ID].alive()) return;
  if (C.status && C.status !== 'active') return;

  var KEYS = {
    history: 'conversationHistory_' + ID,
    userId: 'chatUserId_' + ID,
    consent: 'elva-consent-' + ID,
    session: 'elva-session_' + ID,
    open: 'elva-open_' + ID,
    teaser: 'elva-teaser_' + ID,
  };
  var ALLOWED_LOCAL = [KEYS.history, KEYS.userId];
  var ALLOWED_SESSION = [KEYS.session];

  function safe(fn, fallback) {
    try { return fn(); } catch (e) { return fallback; }
  }
  var local = {
    get: function (k) { return safe(function () { return window.localStorage.getItem(k); }, null); },
    set: function (k, v) { safe(function () { v == null ? window.localStorage.removeItem(k) : window.localStorage.setItem(k, v); }); },
  };
  var session = {
    get: function (k) { return safe(function () { return window.sessionStorage.getItem(k); }, null); },
    set: function (k, v) { safe(function () { v == null ? window.sessionStorage.removeItem(k) : window.sessionStorage.setItem(k, v); }); },
  };

  var reduceMotion = safe(function () { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }, false);

  function isMobile() {
    var w = window.innerWidth || document.documentElement.clientWidth;
    return w <= 640;
  }

  function pageLang() {
    var l = (document.documentElement && document.documentElement.lang) || navigator.language || C.language || 'da';
    return String(l).toLowerCase().split('-')[0];
  }

  var DEFAULT_TEASER = {
    da: 'Hej! Har du brug for hjælp?',
    en: 'Hi! Need help?',
    de: 'Hallo! Brauchen Sie Hilfe?',
    sv: 'Hej! Behöver du hjälp?',
    no: 'Hei! Trenger du hjelp?',
  };
  var LABELS = {
    da: { open: 'Åbn chat', close: 'Luk chat', dismiss: 'Luk besked', unread: 'ulæste beskeder' },
    en: { open: 'Open chat', close: 'Close chat', dismiss: 'Dismiss message', unread: 'unread messages' },
    de: { open: 'Chat öffnen', close: 'Chat schließen', dismiss: 'Nachricht schließen', unread: 'ungelesene Nachrichten' },
    sv: { open: 'Öppna chatt', close: 'Stäng chatt', dismiss: 'Stäng meddelande', unread: 'olästa meddelanden' },
    no: { open: 'Åpne chat', close: 'Lukk chat', dismiss: 'Lukk melding', unread: 'uleste meldinger' },
  };

  function uiLang() {
    if (C.customLanguage) {
      var l = pageLang();
      if ((C.enabledLanguages || []).indexOf(l) !== -1 && LABELS[l]) return l;
    }
    return LABELS[C.language] ? C.language : 'da';
  }
  var LANG = uiLang();
  var L = LABELS[LANG];

  function teaserText() {
    if (C.customLanguage && C.languagePacks && C.languagePacks[LANG] && C.languagePacks[LANG].popupMessage) {
      return C.languagePacks[LANG].popupMessage;
    }
    return C.popupMessage || DEFAULT_TEASER[LANG] || DEFAULT_TEASER.da;
  }
  function plain(html) {
    var d = document.createElement('div');
    d.innerHTML = String(html || '');
    return (d.textContent || '').trim();
  }

  // Readable foreground on the customer's colour.
  function onColor(hex) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(h, 16);
    if (isNaN(n) || h.length !== 6) return '#fff';
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    var lum = function (c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    var Y = 0.2126 * lum(r) + 0.7152 * lum(g) + 0.0722 * lum(b);
    return Y > 0.45 ? '#111418' : '#ffffff';
  }

  var placement = C.placement || 'bottom-right';
  var isRight = placement.indexOf('right') !== -1;
  var isTop = placement.indexOf('top') === 0;
  var size = C.launcherSize || 56;
  var GAP = 20; // distance from the viewport edge
  var color = C.color || '#4f46e5';
  var fg = onColor(color);
  var bg = C.useGradient
    ? 'linear-gradient(145deg,' + color + ' 0%,' + (C.secondaryColor || color) + ' 100%)'
    : color;

  var state = {
    open: false,
    frameReady: false,
    frame: null,
    unread: 0,
    teaserTimer: null,
    lastFocus: null,
  };

  // ---------------------------------------------------------------- launcher
  var host = document.createElement('div');
  host.setAttribute('data-elva-widget', ID);
  host.setAttribute('data-widget', 'chat-button');
  host.style.cssText =
    'position:fixed;z-index:2147483000;' +
    (isTop ? 'top:' : 'bottom:') + GAP + 'px;' +
    (isRight ? 'right:' : 'left:') + GAP + 'px;' +
    'width:' + size + 'px;height:' + size + 'px;';
  var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

  var ease = 'cubic-bezier(.16,1,.3,1)';
  var css =
    ':host{all:initial}' +
    '*{box-sizing:border-box}' +
    '.btn{all:unset;box-sizing:border-box;position:relative;display:grid;place-items:center;width:' + size + 'px;height:' + size + 'px;border-radius:999px;cursor:pointer;background:' + bg + ';color:' + fg + ';' +
    'box-shadow:0 1px 2px rgba(16,24,40,.12),0 8px 24px -6px rgba(16,24,40,.28);transition:transform .25s ' + ease + ',box-shadow .25s ' + ease + ';-webkit-tap-highlight-color:transparent}' +
    '.btn:hover{transform:translateY(-1px);box-shadow:0 2px 4px rgba(16,24,40,.12),0 14px 32px -8px rgba(16,24,40,.34)}' +
    '.btn:active{transform:scale(.96)}' +
    '.btn:focus-visible{outline:2px solid ' + color + ';outline-offset:3px}' +
    '.ico{position:absolute;inset:0;display:grid;place-items:center;transition:opacity .22s ' + ease + ',transform .3s ' + ease + '}' +
    '.ico svg{width:' + Math.round(size * 0.46) + 'px;height:' + Math.round(size * 0.46) + 'px}' +
    '.ico img{width:' + Math.round(size * 0.56) + 'px;height:' + Math.round(size * 0.56) + 'px;object-fit:contain;border-radius:6px}' +
    '.ico-close{opacity:0;transform:rotate(-45deg) scale(.7)}' +
    '.open .ico-chat{opacity:0;transform:rotate(45deg) scale(.7)}' +
    '.open .ico-close{opacity:1;transform:none}' +
    '.dot{position:absolute;' + (isTop ? 'bottom' : 'top') + ':1px;' + (isRight ? 'left' : 'right') + ':1px;width:12px;height:12px;border-radius:999px;background:' + (C.onlineIndicatorColor || '#3FD128') + ';box-shadow:0 0 0 2px #fff;transition:opacity .2s}' +
    '.badge{position:absolute;' + (isTop ? 'bottom' : 'top') + ':-4px;' + (isRight ? 'left' : 'right') + ':-4px;min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:#E5484D;color:#fff;font:600 11px/20px ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;text-align:center;box-shadow:0 0 0 2px #fff;display:none}' +
    '.has-unread .badge{display:block}.has-unread .dot{opacity:0}' +
    '.open .dot,.open .badge{opacity:0}' +
    '.teaser{position:absolute;' + (isTop ? 'top:' : 'bottom:') + (size + 12) + 'px;' + (isRight ? 'right:' : 'left:') + '0;width:max-content;max-width:min(280px,calc(100vw - ' + GAP * 2 + 'px));' +
    'display:flex;align-items:flex-start;gap:8px;padding:12px 8px 12px 14px;border-radius:16px;background:#fff;color:#111418;border:1px solid rgba(16,24,40,.08);' +
    'box-shadow:0 1px 2px rgba(16,24,40,.06),0 12px 28px -10px rgba(16,24,40,.22);font:400 14px/20px ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;' +
    'opacity:0;transform:translateY(' + (isTop ? '-' : '') + '6px) scale(.98);transform-origin:' + (isTop ? 'top ' : 'bottom ') + (isRight ? 'right' : 'left') + ';pointer-events:none;transition:opacity .3s ' + ease + ',transform .4s ' + ease + '}' +
    '.teaser.show{opacity:1;transform:none;pointer-events:auto}' +
    '.teaser-text{all:unset;cursor:pointer;flex:1;overflow-wrap:anywhere}' +
    '.teaser-x{all:unset;cursor:pointer;flex:none;display:grid;place-items:center;width:24px;height:24px;margin-top:-2px;border-radius:999px;color:#6B7280}' +
    '.teaser-x:hover{background:#F2F4F7;color:#111418}' +
    '.teaser-x:focus-visible,.teaser-text:focus-visible{outline:2px solid ' + color + ';outline-offset:2px;border-radius:6px}' +
    '.teaser-x svg{width:14px;height:14px}' +
    (reduceMotion ? '*{transition:none!important}' : '');

  var chatIcon = C.logoUrl
    ? '<img alt="" src="' + String(C.logoUrl).replace(/"/g, '&quot;') + '">'
    : '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.29117 20.8242L2 22L3.17581 16.7088C2.42544 15.3056 2 13.7025 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C10.2975 22 8.6944 21.5746 7.29117 20.8242ZM7.58075 18.711L8.23428 19.0605C9.38248 19.6745 10.6655 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 13.3345 4.32549 14.6175 4.93949 15.7657L5.28896 16.4192L4.63416 19.3658L7.58075 18.711Z"/></svg>';
  var closeIcon = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.9997 13.1714L16.9495 8.22168L18.3637 9.63589L11.9997 15.9999L5.63574 9.63589L7.04996 8.22168L11.9997 13.1714Z"/></svg>';
  var xIcon = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.04996 5.63672L11.9997 10.5865Z"/></svg>';
  if (isTop) closeIcon = closeIcon.replace('<path', '<path transform="rotate(180 12 12)"');

  root.innerHTML =
    '<style>' + css + '</style>' +
    '<div class="wrap">' +
    '<div class="teaser" role="status"><button class="teaser-text" type="button"></button><button class="teaser-x" type="button" aria-label="' + L.dismiss + '">' + xIcon + '</button></div>' +
    '<button class="btn" type="button" aria-label="' + L.open + '" aria-expanded="false" aria-haspopup="dialog">' +
    '<span class="ico ico-chat">' + chatIcon + '</span><span class="ico ico-close">' + closeIcon + '</span>' +
    '<span class="dot" aria-hidden="true"></span><span class="badge" aria-hidden="true"></span>' +
    '</button></div>';

  var wrap = root.querySelector('.wrap');
  var btn = root.querySelector('.btn');
  var teaser = root.querySelector('.teaser');
  var teaserBody = root.querySelector('.teaser-text');
  var badge = root.querySelector('.badge');
  var logoImg = root.querySelector('.ico-chat img');
  if (logoImg) {
    logoImg.addEventListener('error', function () {
      logoImg.parentNode.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.29117 20.8242L2 22L3.17581 16.7088C2.42544 15.3056 2 13.7025 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C10.2975 22 8.6944 21.5746 7.29117 20.8242Z"/></svg>';
    });
  }

  // ---------------------------------------------------------------- iframe
  var frameWrap = document.createElement('div');
  frameWrap.setAttribute('data-widget', 'chat-widget');
  frameWrap.setAttribute('data-elva-frame', ID);

  function radius() {
    return isMobile() ? 0 : Math.max(0, Math.min(C.radius == null ? 20 : C.radius, 40));
  }

  function layoutFrame() {
    var s = frameWrap.style;
    if (isMobile()) {
      var vv = window.visualViewport;
      var h = vv ? vv.height : window.innerHeight;
      var top = vv ? vv.offsetTop : 0;
      s.cssText =
        'position:fixed;z-index:2147483001;left:0;top:' + top + 'px;width:100%;height:' + h + 'px;border-radius:0;overflow:hidden;';
    } else {
      var vw = window.innerWidth, vh = window.innerHeight;
      var w = Math.min(C.width || 420, vw - GAP * 2);
      var reserved = GAP + size + 16; // launcher + breathing room
      var hgt = Math.max(Math.min(C.height || 680, vh - reserved - GAP), 360);
      s.cssText =
        'position:fixed;z-index:2147483001;' +
        (isTop ? 'top:' : 'bottom:') + reserved + 'px;' +
        (isRight ? 'right:' : 'left:') + GAP + 'px;' +
        'width:' + w + 'px;height:' + hgt + 'px;max-height:calc(100vh - ' + (reserved + GAP) + 'px);' +
        'border-radius:' + radius() + 'px;overflow:hidden;' +
        'box-shadow:' + (C.shadow || '0 1px 2px rgba(16,24,40,.06), 0 24px 64px -16px rgba(16,24,40,.30)') + ';' +
        (C.backdropBlur ? '-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);' : '') +
        'transform-origin:' + (isTop ? 'top ' : 'bottom ') + (isRight ? 'right' : 'left') + ';';
    }
    applyVisibility(false);
  }

  function applyVisibility(animate) {
    var s = frameWrap.style;
    var t = animate && !reduceMotion ? 'opacity .2s ' + ease + ', transform .32s ' + ease : 'none';
    s.transition = t;
    if (state.open) {
      s.opacity = '1';
      s.transform = 'none';
      s.visibility = 'visible';
      s.pointerEvents = 'auto';
    } else {
      s.opacity = '0';
      s.transform = isMobile() ? 'translateY(16px)' : 'translateY(' + (isTop ? '-' : '') + '8px) scale(.97)';
      s.pointerEvents = 'none';
      if (!animate) s.visibility = 'hidden';
    }
  }

  function ensureFrame() {
    if (state.frame) return state.frame;
    var f = document.createElement('iframe');
    f.src = BOOT.frameUrl;
    f.title = C.title || 'Chat';
    f.setAttribute('allow', 'microphone; clipboard-write');
    f.setAttribute('allowtransparency', 'true');
    f.style.cssText = 'display:block;width:100%;height:100%;border:0;background:transparent;color-scheme:normal;';
    frameWrap.appendChild(f);
    layoutFrame();
    document.body.appendChild(frameWrap);
    state.frame = f;
    return f;
  }

  function post(type, payload) {
    if (!state.frame || !state.frame.contentWindow) return;
    // Before 'ready' the frame is still about:blank; init carries the open state.
    if (!state.frameReady && type !== 'init') return;
    state.frame.contentWindow.postMessage({ __elva: 2, widgetId: ID, type: type, payload: payload || {} }, ORIGIN);
  }

  var htmlOverflow = null;
  function lockScroll(lock) {
    var el = document.documentElement;
    if (lock && isMobile()) {
      if (htmlOverflow === null) htmlOverflow = el.style.overflow;
      el.style.overflow = 'hidden';
    } else if (htmlOverflow !== null) {
      el.style.overflow = htmlOverflow;
      htmlOverflow = null;
    }
  }

  function setOpen(next, opts) {
    opts = opts || {};
    if (next === state.open) return;
    ensureFrame();
    state.open = next;
    if (next) {
      state.lastFocus = document.activeElement;
      hideTeaser(true);
      setUnread(0);
      layoutFrame();
      frameWrap.style.visibility = 'visible';
      // Two frames so the closed transform is committed before animating.
      requestAnimationFrame(function () { requestAnimationFrame(function () { applyVisibility(true); }); });
      host.style.display = isMobile() ? 'none' : '';
      if (!isMobile()) session.set(KEYS.open, '1');
      post('open', { focus: !opts.restore });
    } else {
      applyVisibility(true);
      host.style.display = '';
      session.set(KEYS.open, null);
      post('close');
      setTimeout(function () { if (!state.open) frameWrap.style.visibility = 'hidden'; }, reduceMotion ? 0 : 320);
      if (opts.returnFocus !== false) safe(function () { btn.focus({ preventScroll: true }); });
    }
    lockScroll(next);
    wrap.classList.toggle('open', next);
    btn.setAttribute('aria-expanded', String(next));
    btn.setAttribute('aria-label', next ? L.close : L.open);
  }

  function setUnread(n) {
    state.unread = n;
    wrap.classList.toggle('has-unread', n > 0);
    badge.textContent = n > 9 ? '9+' : String(n);
    btn.setAttribute('aria-label', (state.open ? L.close : L.open) + (n > 0 ? ' (' + n + ' ' + L.unread + ')' : ''));
  }

  // ---------------------------------------------------------------- teaser
  function showTeaser() {
    if (state.open || session.get(KEYS.teaser)) return;
    var text = plain(teaserText());
    if (!text) return;
    teaserBody.textContent = text;
    teaser.classList.add('show');
  }
  function hideTeaser(remember) {
    clearTimeout(state.teaserTimer);
    teaser.classList.remove('show');
    if (remember) session.set(KEYS.teaser, '1');
  }

  btn.addEventListener('click', function () { setOpen(!state.open); });
  btn.addEventListener('pointerenter', ensureFrame, { once: true });
  btn.addEventListener('focus', ensureFrame, { once: true });
  teaserBody.addEventListener('click', function () { setOpen(true); });
  root.querySelector('.teaser-x').addEventListener('click', function (e) { e.stopPropagation(); hideTeaser(true); });

  // ---------------------------------------------------------------- bridge
  function snapshot() {
    return {
      local: { history: local.get(KEYS.history), userId: local.get(KEYS.userId), consent: local.get(KEYS.consent) },
      session: { session: session.get(KEYS.session) },
    };
  }
  function pageInfo() {
    return {
      url: location.href,
      title: document.title,
      lang: pageLang(),
      referrer: document.referrer || null,
      isMobile: isMobile(),
    };
  }

  window.addEventListener('message', function (e) {
    if (!state.frame || e.source !== state.frame.contentWindow || e.origin !== ORIGIN) return;
    var d = e.data;
    if (!d || d.__elva !== 2 || d.widgetId !== ID) return;
    var p = d.payload || {};
    switch (d.type) {
      case 'ready':
        state.frameReady = true;
        post('init', { storage: snapshot(), page: pageInfo(), open: state.open });
        break;
      case 'close':
        setOpen(false);
        break;
      case 'storage':
        if (p.area === 'local' && ALLOWED_LOCAL.indexOf(p.key) !== -1) local.set(p.key, p.value);
        if (p.area === 'session' && ALLOWED_SESSION.indexOf(p.key) !== -1) session.set(p.key, p.value);
        break;
      case 'unread':
        if (!state.open) setUnread(Math.max(0, Number(p.count) || 0));
        break;
    }
  });

  var resizeRaf = 0;
  function onResize() {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(function () {
      if (!state.frame) return;
      layoutFrame();
      if (state.open) applyVisibility(false);
      host.style.display = state.open && isMobile() ? 'none' : '';
      post('viewport', { isMobile: isMobile() });
    });
  }
  window.addEventListener('resize', onResize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onResize);
    window.visualViewport.addEventListener('scroll', function () { if (state.open && isMobile()) onResize(); });
  }

  // ---------------------------------------------------------------- mount
  function mount() {
    if (!document.body) return setTimeout(mount, 30);
    document.body.appendChild(host);
    var restore = session.get(KEYS.open) === '1' && !isMobile();
    if (restore) {
      setOpen(true, { restore: true, returnFocus: false });
    } else {
      // Preload the chat app once the page is idle, so opening is instant.
      var idle = window.requestIdleCallback || function (cb) { return setTimeout(cb, 1200); };
      idle(function () { ensureFrame(); }, { timeout: 3000 });
      state.teaserTimer = setTimeout(showTeaser, C.popupDelay == null ? 2000 : C.popupDelay);
    }
  }

  registry[ID] = {
    alive: function () { return document.documentElement.contains(host); },
    open: function () { setOpen(true); },
    close: function () { setOpen(false); },
    toggle: function () { setOpen(!state.open); },
  };
  var api = (window.ElvaChat = window.ElvaChat || {});
  function pick(id) { return registry[id || Object.keys(registry)[0]]; }
  api.open = function (id) { var w = pick(id); if (w) w.open(); };
  api.close = function (id) { var w = pick(id); if (w) w.close(); };
  api.toggle = function (id) { var w = pick(id); if (w) w.toggle(); };
  window.hidePopup = function () { hideTeaser(true); };

  mount();
}

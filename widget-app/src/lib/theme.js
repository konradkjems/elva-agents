/**
 * Map the customer's widget colour onto BoardUI's accent-50…950 ramp, so
 * every accent token (primary buttons, focus rings, selection, links) and
 * our own accent surfaces follow it. 500 is the customer's exact colour.
 */

const STEPS = {
  50: ['#ffffff', 92],
  100: ['#ffffff', 84],
  200: ['#ffffff', 68],
  300: ['#ffffff', 48],
  400: ['#ffffff', 24],
  500: null,
  600: ['#000000', 14],
  700: ['#000000', 30],
  800: ['#000000', 46],
  900: ['#000000', 60],
  950: ['#000000', 74],
};

function parseHex(hex) {
  let h = String(hex || '').trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function luminance(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const lin = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
}

export function applyTheme(cfg) {
  const root = document.documentElement;
  const color = parseHex(cfg.theme?.buttonColor) ? cfg.theme.buttonColor : '#4f46e5';

  for (const [step, mix] of Object.entries(STEPS)) {
    const value = mix ? `color-mix(in oklab, ${color}, ${mix[0]} ${mix[1]}%)` : color;
    root.style.setProperty(`--color-accent-${step}`, value);
  }

  const light = luminance(color) > 0.45;
  root.style.setProperty('--elva-on-accent', light ? '#111418' : '#ffffff');
  root.toggleAttribute('data-light-accent', light);
  root.style.setProperty('--elva-online', cfg.theme?.onlineIndicatorColor || '#3FD128');

  // Visitor bubble: the customer's colour, or their gradient when enabled.
  const bubble = cfg.theme?.useGradient
    ? `linear-gradient(150deg, ${color}, ${cfg.theme.secondaryColor || `color-mix(in oklab, ${color}, #000 18%)`})`
    : color;
  root.style.setProperty('--elva-bubble', bubble);

  // Light / dark / auto. Auto follows the visitor's OS live.
  const mode = cfg.theme?.themeMode || 'light';
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const sync = () => root.classList.toggle('dark', mode === 'dark' || (mode === 'auto' && mq.matches));
  sync();
  if (mode === 'auto') mq.addEventListener?.('change', sync);

  if (cfg.theme?.backdropBlur) root.setAttribute('data-translucent', '');

  // Admin "Custom CSS": scoped to this frame, so it can't reach the host page.
  if (cfg.theme?.customCSS) {
    let tag = document.getElementById('elva-custom-css');
    if (!tag) {
      tag = document.createElement('style');
      tag.id = 'elva-custom-css';
      document.head.appendChild(tag);
    }
    tag.textContent = cfg.theme.customCSS;
  }

  root.lang = cfg.lang || 'da';
}

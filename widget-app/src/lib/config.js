import { LANGS, PACK, UI, LOCALES } from './i18n';

/**
 * Turn the raw /api/widget-config payload into what the UI reads:
 *   cfg.lang     — resolved language
 *   cfg.copy     — every configurable string, with language-aware defaults
 *   cfg.ui       — the fixed UI strings for that language
 */
export function resolveConfig(raw, page = {}) {
  const m = raw.messages || {};
  const base = LANGS.includes(raw.advanced?.language) ? raw.advanced.language : 'da';

  // Multi-language widgets keep per-language packs for the main copy, but the
  // support form, rating and footer texts exist once, in whatever language the
  // customer wrote them. Work out that language, and only use those
  // single-language texts when the visitor is shown that language; otherwise
  // the built-in translation keeps every label in one language.
  const packs = (m.customLanguage && m.languagePacks) || {};
  const contentLang = m.customLanguage ? detectContentLang(m, packs, base) : base;

  let lang = base;
  let pack = null;
  if (m.customLanguage) {
    const enabled = (m.enabledLanguages || LANGS).filter((l) => LANGS.includes(l));
    const detected = String(page.lang || '').toLowerCase().split('-')[0];
    if (enabled.includes(detected)) lang = detected;
    else if (enabled.includes(base) && packs[base]) lang = base;
    else lang = contentLang;
    // The pack wins; the language the base texts are written in falls back to them.
    pack = lang === contentLang ? null : packs[lang] || {};
  }
  const own = lang === contentLang;

  const defaults = PACK[lang];
  const pick = (key) => {
    const v = pack ? pack[key] : m[key];
    if (Array.isArray(defaults[key])) {
      const arr = Array.isArray(v) ? v.filter((s) => typeof s === 'string' && s.trim()) : [];
      return arr.length ? arr : defaults[key];
    }
    return typeof v === 'string' && v.trim() ? v : defaults[key];
  };

  const copy = {};
  for (const key of Object.keys(defaults)) copy[key] = pick(key);
  // bannerText and suggestions are opt-in: no generic default.
  copy.bannerText = pack ? pack.bannerText || null : m.bannerText || null;
  copy.suggestedResponses = pack
    ? (pack.suggestedResponses || []).filter((s) => typeof s === 'string' && s.trim())
    : (m.suggestedResponses || []).filter((s) => typeof s === 'string' && s.trim());
  if (pack && !copy.suggestedResponses.length) {
    copy.suggestedResponses = (m.suggestedResponses || []).filter((s) => typeof s === 'string' && s.trim());
  }

  const ui = UI[lang];
  const mr = own ? customOnly(raw.manualReview, lang) : {};
  const sat = own ? customOnly(raw.satisfaction, lang) : {};
  const support = {
    buttonText: mr.buttonText || ui.support,
    formTitle: mr.formTitle || ui.formTitle,
    formDescription: mr.formDescription || ui.formDescription,
    successMessage: mr.successMessage || ui.formSentBody,
    emailTab: stripEmoji(mr.emailSupportButtonText) || ui.emailTab,
    liveTab: stripEmoji(mr.liveChatButtonText) || ui.liveTab,
    attachmentNotice: noticeBody(mr.attachmentNoticeText) || ui.attachmentNotice,
    nameLabel: mr.nameLabel || ui.nameLabel,
    namePlaceholder: mr.namePlaceholder || ui.namePlaceholder,
    emailLabel: mr.emailLabel || ui.emailLabel,
    emailPlaceholder: mr.emailPlaceholder || ui.emailPlaceholder,
    messageLabel: mr.messageLabel || ui.messageLabel,
    messagePlaceholder: mr.messagePlaceholder || ui.messagePlaceholder,
    liveNotice: noticeBody(mr.liveChatNoticeText) || ui.liveNotice,
    liveReasonLabel: mr.liveChatReasonLabel || ui.liveReasonLabel,
    liveReasonPlaceholder: mr.liveChatReasonPlaceholder || ui.liveReasonPlaceholder,
    cancel: mr.cancelButtonText || ui.cancel,
    submitEmail: mr.submitButtonText || ui.submitEmail,
  };

  const b = raw.branding || {};
  return {
    ...raw,
    branding: { ...b, poweredByText: own && !(lang !== 'en' && V1_EN_DEFAULTS.has(norm(b.poweredByText))) ? b.poweredByText : null },
    lang,
    locale: LOCALES[lang],
    copy,
    ui,
    support,
    rating: {
      prompt: sat.promptText || ui.ratingPrompt,
      feedbackPlaceholder: sat.feedbackPlaceholder || ui.ratingFeedback,
    },
    names: {
      title: b.title || raw.name || 'AI Assistant',
      assistant: b.assistantName || b.title || raw.name || 'AI Assistant',
    },
  };
}

// Older widgets saved v1's English defaults into the database. On a non-English
// widget they are not the customer's words, so the translated defaults win.
const V1_EN_DEFAULTS = new Set(
  [
    'Powered by',
    'Request Manual Review',
    'Please provide your contact information and describe what you need help with. Our team will review your conversation and get back to you.',
    'Thank you for your request! Our team will review your conversation and contact you within 24 hours.',
    'How would you rate this conversation so far?',
    'Optional feedback...',
    '📧 Email Support',
    '💬 Live Chat',
    'Cancel',
    'Send Request',
  ].map((s) => s.replace(/\s+/g, ' ').trim().toLowerCase())
);
function customOnly(obj, lang) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (typeof v === 'string' && lang !== 'en' && V1_EN_DEFAULTS.has(norm(v))) continue;
    out[k] = v;
  }
  return out;
}

const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();

/** Which language the widget's single-language texts are written in. */
function detectContentLang(m, packs, base) {
  // The base texts usually copy one pack verbatim (or nearly so).
  for (const key of ['welcomeMessage', 'inputPlaceholder', 'popupMessage', 'bannerText']) {
    const v = norm(m[key]);
    if (!v) continue;
    const hit = Object.keys(packs).find((l) => LANGS.includes(l) && norm(packs[l]?.[key]) === v);
    if (hit) return hit;
  }
  return base;
}

// v1 defaults carried emoji in button labels ("📧 Email Support"); BoardUI
// controls carry their own icons, so drop a leading emoji.
function stripEmoji(s) {
  if (!s) return null;
  const out = s.replace(/^[\p{Extended_Pictographic}️‍\s]+/u, '').trim();
  return out || null;
}

// v1 notices were "Bold prefix: body"; keep the body, the card supplies the heading.
function noticeBody(s) {
  if (!s) return null;
  const i = s.indexOf(':');
  return (i > 0 && i < 40 ? s.slice(i + 1) : s).trim() || null;
}

export function initials(name) {
  const words = String(name || 'AI').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0]?.[0] || 'A').toUpperCase();
}

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

  let lang = base;
  let pack = null;
  if (m.customLanguage) {
    const detected = String(page.lang || '').toLowerCase().split('-')[0];
    if (LANGS.includes(detected) && (m.enabledLanguages || LANGS).includes(detected)) {
      lang = detected;
      pack = (m.languagePacks && m.languagePacks[detected]) || {};
    }
  }

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
  const mr = raw.manualReview || {};
  const sat = raw.satisfaction || {};
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

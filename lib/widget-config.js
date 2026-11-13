import { admin } from './supabase/admin';
import { fromRow } from './supabase/transform';
import { shouldBlockWidget } from './quota';

/**
 * Public widget config for the embeddable chat widget (loader + iframe app).
 *
 * One builder, two consumers:
 *   - GET /api/widget-embed/[widgetId]  → the host-page loader bakes the
 *     launcher subset into its script so the button paints before the iframe.
 *   - GET /api/widget-config/[widgetId] → the iframe app (public/widget/).
 *
 * Text fields are returned as `null` when the admin left them empty. The
 * widget app fills them from its per-language default copy, so an unset
 * welcome message follows the widget's language instead of falling back to
 * English. Never expose prompt, promptId, ai, knowledgeBase, openai or
 * organization internals here; this endpoint is public.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const str = (v) => (typeof v === 'string' && v.trim() ? v : null);
const num = (v, fallback) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : fallback);

/** Look up a widget by embed id: widgets.legacy_id → widgets.id → demos.legacy_id. */
export async function loadWidgetRecord(widgetId) {
  const id = String(widgetId);
  let { data } = await admin.from('widgets').select('*').eq('legacy_id', id).maybeSingle();
  if (!data && UUID_RE.test(id)) {
    ({ data } = await admin.from('widgets').select('*').eq('id', id).maybeSingle());
  }
  let isDemo = false;
  if (!data) {
    const demo = await admin.from('demos').select('*').eq('legacy_id', id).maybeSingle();
    if (demo.data) {
      data = demo.data;
      isDemo = true;
    }
  }
  if (!data) return null;
  const widget = fromRow(data);
  widget.__isDemo = isDemo;
  return widget;
}

/** Display-time quota block. Fails open, and never blocks widgets without an org. */
export async function getBlockState(widget) {
  if (!widget?.organizationId) return { isBlocked: false, blockReason: '' };
  try {
    const { data: organization } = await admin
      .from('organizations')
      .select('plan, usage, trial_ends_at')
      .eq('id', widget.organizationId)
      .maybeSingle();
    if (!organization) return { isBlocked: false, blockReason: '' };
    const check = shouldBlockWidget(organization);
    return { isBlocked: !!check.blocked, blockReason: check.message || check.reason || '' };
  } catch (error) {
    console.error('Widget quota check failed (not blocking):', error.message);
    return { isBlocked: false, blockReason: '' };
  }
}

function imageUploadSettings(widget) {
  const src =
    widget.settings?.imageUpload ||
    widget.settings?.imageupload ||
    widget.imageUpload ||
    widget.imageupload ||
    {};
  return {
    enabled: !!src.enabled,
    maxSizeMB: num(src.maxSizeMB, 5),
    allowedTypes:
      Array.isArray(src.allowedTypes) && src.allowedTypes.length
        ? src.allowedTypes
        : ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  };
}

export function buildWidgetConfig(widget, widgetId, block = { isBlocked: false, blockReason: '' }) {
  const a = widget.appearance || {};
  const t = widget.theme || {};
  const m = widget.messages || {};
  const b = widget.branding || {};
  const c = widget.consent || {};
  const s = widget.satisfaction || {};
  const mr = widget.manualReview || {};
  const adv = widget.advanced || {};
  const voice = m.voiceInput || {};
  const cards = m.productCards || {};

  return {
    version: 2,
    widgetId: String(widgetId),
    name: widget.name || 'AI Assistant',
    status: widget.status || 'active',
    isBlocked: !!block.isBlocked,
    blockReason: block.blockReason || '',

    theme: {
      buttonColor: a.themeColor || t.buttonColor || '#4f46e5',
      secondaryColor: a.secondaryColor || null,
      useGradient: a.useGradient === true,
      chatBg: a.chatBg || t.chatBg || null,
      width: Math.min(Math.max(num(a.width || t.width, 420), 300), 800),
      height: Math.min(Math.max(num(a.height || t.height, 680), 400), 900),
      borderRadius: Math.min(Math.max(Number(a.borderRadius ?? t.borderRadius ?? 20) || 0, 0), 50),
      shadow: a.shadow || t.shadow || null,
      backdropBlur: !!(a.backdropBlur || t.backdropBlur),
      themeMode: ['light', 'dark', 'auto'].includes(a.theme) ? a.theme : 'light',
      placement: ['bottom-right', 'bottom-left', 'top-right', 'top-left'].includes(a.placement)
        ? a.placement
        : 'bottom-right',
      onlineIndicatorColor: a.onlineIndicatorColor || '#3FD128',
      customCSS: typeof a.customCSS === 'string' && a.customCSS.trim() ? a.customCSS : null,
    },

    messages: {
      welcomeMessage: str(m.welcomeMessage),
      popupMessage: str(m.popupMessage),
      popupDelay: Number.isFinite(Number(m.popupDelay)) ? Math.min(Math.max(Number(m.popupDelay), 0), 60000) : 2000,
      typingText: str(m.typingText),
      showTypingText: m.showTypingText !== false,
      inputPlaceholder: str(m.inputPlaceholder),
      suggestedResponses: Array.isArray(m.suggestedResponses)
        ? m.suggestedResponses.filter((r) => typeof r === 'string' && r.trim())
        : [],
      bannerText: str(m.bannerText),
      disclaimerText: str(m.disclaimerText),
      newConversationLabel: str(m.newConversationLabel),
      conversationHistoryLabel: str(m.conversationHistoryLabel),
      conversationLoadedLabel: str(m.conversationLoadedLabel),
      todayLabel: str(m.todayLabel),
      yesterdayLabel: str(m.yesterdayLabel),
      daysAgoSuffix: str(m.daysAgoSuffix),
      messagesLabel: str(m.messagesLabel),
      noConversationsLabel: str(m.noConversationsLabel),
      startConversationLabel: str(m.startConversationLabel),
      conversationDeletedLabel: str(m.conversationDeletedLabel),
      newConversationStartedLabel: str(m.newConversationStartedLabel),
      availableNowText: str(m.availableNowText) || str(b.availableNowText),
      customLanguage: m.customLanguage === true,
      enabledLanguages:
        Array.isArray(m.enabledLanguages) && m.enabledLanguages.length
          ? m.enabledLanguages
          : ['da', 'en', 'de', 'sv', 'no'],
      languagePacks: m.languagePacks && typeof m.languagePacks === 'object' ? m.languagePacks : null,
      voiceInput: {
        enabled: voice.enabled !== false,
        language: voice.language || 'da-DK',
        continuousRecording: voice.continuousRecording === true,
        autoSendOnComplete: voice.autoSendOnComplete === true,
      },
      productCards: {
        enabled: cards.enabled !== false,
        layout: ['horizontal', 'grid', 'vertical'].includes(cards.layout) ? cards.layout : 'horizontal',
        showPrice: cards.showPrice !== false,
        priceCurrency: cards.priceCurrency || 'kr.',
        autoFetchProductData: cards.autoFetchProductData === true,
      },
    },

    consent: {
      enabled: c.enabled !== false,
      title: str(c.title),
      description: str(c.description),
      privacyUrl: str(c.privacyUrl) || 'https://elva-solutions.com/privacy',
      cookiesUrl: str(c.cookiesUrl) || 'https://elva-solutions.com/cookies',
    },

    branding: {
      title: str(b.title) || widget.name || 'AI Assistant',
      assistantName: str(b.assistantName),
      companyName: str(b.companyName),
      showBranding: b.showBranding !== false,
      poweredByText: str(b.poweredByText),
      avatarUrl: str(b.avatarUrl),
      avatarBackgroundColor: str(b.avatarBackgroundColor),
      useAvatarBackgroundColor: b.useAvatarBackgroundColor !== false,
      logoUrl: str(b.logoUrl),
      widgetLogoUrl: str(b.widgetLogoUrl) || str(b.customWidgetLogo) || str(b.companyLogo) || str(b.logoUrl),
      imageSettings: b.imageSettings || null,
      iconSizes: b.iconSizes || null,
    },

    satisfaction: {
      enabled: s.enabled !== false,
      triggerAfter: num(s.triggerAfter, 3),
      inactivityDelay: num(s.inactivityDelay, 30000),
      promptText: str(s.promptText),
      allowFeedback: s.allowFeedback === true,
      feedbackPlaceholder: str(s.feedbackPlaceholder),
    },

    manualReview: {
      enabled: mr.enabled !== false,
      liveChatEnabled: mr.liveChatEnabled !== false,
      buttonText: str(mr.buttonText),
      formTitle: str(mr.formTitle),
      formDescription: str(mr.formDescription),
      successMessage: str(mr.successMessage),
      emailSupportButtonText: str(mr.emailSupportButtonText),
      attachmentNoticeText: str(mr.attachmentNoticeText),
      nameLabel: str(mr.nameLabel),
      namePlaceholder: str(mr.namePlaceholder),
      emailLabel: str(mr.emailLabel),
      emailPlaceholder: str(mr.emailPlaceholder),
      messageLabel: str(mr.messageLabel),
      messagePlaceholder: str(mr.messagePlaceholder),
      liveChatButtonText: str(mr.liveChatButtonText),
      liveChatNoticeText: str(mr.liveChatNoticeText),
      liveChatReasonLabel: str(mr.liveChatReasonLabel),
      liveChatReasonPlaceholder: str(mr.liveChatReasonPlaceholder),
      cancelButtonText: str(mr.cancelButtonText),
      submitButtonText: str(mr.submitButtonText),
    },

    advanced: {
      showCloseButton: adv.showCloseButton !== false,
      showConversationHistory: adv.showConversationHistory !== false,
      showNewChatButton: adv.showNewChatButton !== false,
      language: ['da', 'en', 'de', 'sv', 'no'].includes(adv.language) ? adv.language : 'da',
    },

    settings: { imageUpload: imageUploadSettings(widget) },
  };
}

/** The launcher subset the host-page loader needs before the iframe has loaded. */
export function buildLauncherConfig(config) {
  return {
    widgetId: config.widgetId,
    status: config.status,
    placement: config.theme.placement,
    color: config.theme.buttonColor,
    secondaryColor: config.theme.secondaryColor,
    useGradient: config.theme.useGradient,
    width: config.theme.width,
    height: config.theme.height,
    radius: config.theme.borderRadius,
    shadow: config.theme.shadow,
    backdropBlur: config.theme.backdropBlur,
    themeMode: config.theme.themeMode,
    onlineIndicatorColor: config.theme.onlineIndicatorColor,
    launcherSize: Math.min(Math.max(num(config.branding.iconSizes?.chatButton, 56), 40), 80),
    logoUrl: config.branding.widgetLogoUrl,
    title: config.branding.title,
    popupMessage: config.messages.popupMessage,
    popupDelay: config.messages.popupDelay,
    customLanguage: config.messages.customLanguage,
    enabledLanguages: config.messages.enabledLanguages,
    languagePacks: config.messages.languagePacks
      ? Object.fromEntries(
          Object.entries(config.messages.languagePacks).map(([lang, pack]) => [lang, { popupMessage: pack?.popupMessage || null }])
        )
      : null,
    language: config.advanced.language,
  };
}

export function configEtag(widget, block) {
  const updated = widget.updatedAt ? new Date(widget.updatedAt).getTime() : 0;
  return `"v2-${updated}-${block.isBlocked ? 1 : 0}"`;
}

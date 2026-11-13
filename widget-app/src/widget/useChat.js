import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ApiError,
  fetchProductMetadata,
  requestLiveChat,
  sendLiveMessage,
  streamReply,
  submitRating,
  submitSupport,
  uploadImage,
} from '../lib/api';
import { parseProducts, stripBrandPrefix } from '../lib/products';
import { extractImages } from '../lib/markdown';
import { useLiveChat } from './useLiveChat';
import { WIDGET_ID, IS_PREVIEW, send as sendToHost } from '../lib/bridge';
import { createTrail } from './trail';

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const now = () => new Date().toISOString();
const CHAT_ROLES = new Set(['user', 'assistant', 'agent', 'system']);
const PSEUDO = new Set(['satisfaction_rating', 'manual_review_form']);
const HISTORY_MAX = 20;

/** Finish an assistant message: split out product cards and images. */
function finalizeAssistant(content, cfg) {
  const parsed = parseProducts(content, { enabled: cfg.messages.productCards.enabled });
  const { text, images } = extractImages(parsed.text);
  return { content: text, products: parsed.products, images };
}

function restoreMessage(m) {
  if (!m || !CHAT_ROLES.has(m.role) || PSEUDO.has(m.content)) return null;
  return {
    id: m.id || uid(),
    role: m.role,
    content: m.content || '',
    imageUrl: m.imageUrl || null,
    ts: m.ts || m.timestamp || null,
    products: m.products || [],
    images: m.images || [],
    agentInfo: m.agentInfo || null,
    welcome: !!m.welcome,
  };
}

function makeUserId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 11)}_${Date.now()}`;
}

export function useChat({ cfg, store, isOpen }) {
  const restored = useMemo(() => store.session(), [store]);
  const consent = useMemo(() => store.consent() || {}, [store]);

  const userId = useMemo(() => {
    if (IS_PREVIEW) return 'preview-user';
    if (consent.functional === true) {
      const existing = store.userId();
      if (existing) return existing;
      const id = makeUserId('user');
      store.setUserId(id);
      return id;
    }
    return restored?.userId || makeUserId('session');
  }, [consent, restored, store]);

  const [messages, setMessages] = useState(() => (restored?.messages || []).map(restoreMessage).filter(Boolean));
  const [conversationId, setConversationId] = useState(restored?.conversationId || null);
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState(null); // {url, name, preview} | {uploading:true, name, preview}
  const [ratingState, setRatingState] = useState(restored?.ratingShown ? 'done' : 'idle'); // idle | armed | shown | done
  const [supportOpen, setSupportOpen] = useState(false);
  const [suggestionsUsed, setSuggestionsUsed] = useState(!!restored?.suggestionsUsed || (restored?.messages || []).some((m) => m.role === 'user'));
  const [historyList, setHistoryList] = useState(() => store.history());
  const [notice, setNotice] = useState(null); // transient composer notice {tone, text}

  const abortRef = useRef(null);
  const timerRef = useRef(null);
  const debounceRef = useRef(null);
  const msgsRef = useRef(messages);
  msgsRef.current = messages;
  const convRef = useRef(conversationId);
  convRef.current = conversationId;
  const openRef = useRef(isOpen);
  openRef.current = isOpen;
  const unreadRef = useRef(0);

  const t = cfg.ui;

  const saveToHistory = useCallback(
    (id, list) => {
      if (!id || IS_PREVIEW) return;
      const chat = list.filter((m) => CHAT_ROLES.has(m.role) && !m.streaming && m.content?.trim());
      const firstUser = chat.find((m) => m.role === 'user');
      let title = stripBrandPrefix(firstUser?.content || '').trim() || cfg.copy.newConversationLabel;
      if (title.length > 50) title = `${title.slice(0, 50)}…`;
      const item = {
        id,
        title,
        messages: chat.map((m) => ({ role: m.role, content: m.content, ...(m.imageUrl ? { imageUrl: m.imageUrl } : {}), ts: m.ts })),
        timestamp: now(),
        lastMessage: chat[chat.length - 1]?.content || '',
        messageCount: chat.length,
      };
      const current = store.history().filter((h) => h && h.id !== id);
      const next = [item, ...current].slice(0, HISTORY_MAX);
      store.setHistory(next);
      setHistoryList(next);
    },
    [cfg, store]
  );

  /* ---------------------------------------------------------- satisfaction */
  const sat = cfg.satisfaction;
  const showRating = useCallback(() => {
    timerRef.current = null;
    if (!convRef.current) return;
    setRatingState('shown');
    setMessages((list) => [...list, { id: uid(), role: 'rating', ts: now() }]);
  }, []);

  const armRating = useCallback(() => {
    if (!sat.enabled || IS_PREVIEW) return;
    setRatingState((state) => {
      if (state !== 'idle' && state !== 'armed') return state;
      const count = msgsRef.current.filter((m) => CHAT_ROLES.has(m.role)).length;
      if (count < sat.triggerAfter) return state;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(showRating, sat.inactivityDelay);
      return 'armed';
    });
  }, [sat, showRating]);

  /** Visitor activity postpones a pending rating prompt. */
  const activity = useCallback(() => {
    if (!timerRef.current) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!timerRef.current) return;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(showRating, sat.inactivityDelay);
    }, 1000);
  }, [sat, showRating]);

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    clearTimeout(debounceRef.current);
  }, []);

  /* ---------------------------------------------------------- live chat */
  const pushLive = useCallback((msg) => {
    setMessages((list) => (list.some((m) => m.id === msg.id) ? list : [...list, msg]));
    if (!openRef.current && msg.role === 'agent') {
      unreadRef.current += 1;
      sendToHost('unread', { count: unreadRef.current });
    }
  }, []);

  const live = useLiveChat({
    conversationId,
    initial: restored?.live,
    onMessage: (m) => {
      const role = m.type === 'agent' || m.role === 'agent' ? 'agent' : 'system';
      pushLive({ id: m.id || uid(), role, content: m.content || '', ts: m.timestamp || now(), agentInfo: m.agentInfo || null });
    },
    onJoined: (agent) => {
      pushLive({ id: `joined-${conversationId}-${agent?.displayName || ''}`, role: 'system', content: t.liveJoined(agent?.displayName || t.agent), ts: now() });
    },
  });

  /* ---------------------------------------------------------- persistence */
  useEffect(() => {
    const persistable = messages
      .filter((m) => CHAT_ROLES.has(m.role) && !m.streaming)
      .slice(-60)
      .map(({ id, role, content, imageUrl, ts, products, images, agentInfo, welcome }) => ({
        id, role, content, imageUrl, ts, products, images, agentInfo, welcome,
      }));
    store.setSession({
      conversationId,
      userId,
      messages: persistable,
      ratingShown: ratingState === 'shown' || ratingState === 'done',
      suggestionsUsed,
      live: { status: live.status, agentInfo: live.agentInfo },
    });
  }, [messages, conversationId, userId, ratingState, suggestionsUsed, store, live.status, live.agentInfo]);

  useEffect(() => {
    if (isOpen) {
      unreadRef.current = 0;
      sendToHost('unread', { count: 0 });
    }
  }, [isOpen]);

  /* ---------------------------------------------------------- sending */
  const errorFor = (err) => {
    if (err instanceof ApiError) {
      if (err.status === 403) return err.body?.message || cfg.blockReason || t.blocked;
      if (err.status === 429) return t.errorRateLimit;
      return t.errorGeneric;
    }
    if (err?.name === 'TypeError') return t.errorNetwork;
    return t.errorGeneric;
  };

  const runReply = useCallback(
    async ({ text, imageUrl }) => {
      const replyId = uid();
      setSending(true);
      setMessages((list) => [...list, { id: replyId, role: 'assistant', content: '', streaming: true, thinking: true, ts: now() }]);
      const controller = new AbortController();
      abortRef.current = controller;
      let full = '';
      let convId = convRef.current;
      let failed = null;

      const patch = (fields) => setMessages((list) => list.map((m) => (m.id === replyId ? { ...m, ...fields } : m)));
      const trail = createTrail((steps) => patch({ steps }));

      try {
        await streamReply(
          {
            widgetId: WIDGET_ID,
            message: text,
            userId,
            conversationId: convId,
            imageUrl,
            consentAnalytics: consent.analytics === true,
            signal: controller.signal,
          },
          (ev) => {
            if (ev.type === 'conversation' && ev.conversationId) {
              if (ev.conversationId !== convRef.current) {
                convId = ev.conversationId;
                convRef.current = convId;
                setConversationId(convId);
                setRatingState((s) => (s === 'done' ? 'idle' : s));
              }
            } else if (ev.type === 'step') {
              trail.push(ev);
            } else if (ev.type === 'delta' && ev.content) {
              if (!full) trail.hurry();
              full += ev.content;
              patch({ content: full, thinking: false });
            } else if (ev.type === 'done') {
              if (ev.conversationId && ev.conversationId !== convRef.current) {
                convId = ev.conversationId;
                convRef.current = convId;
                setConversationId(convId);
              }
            } else if (ev.type === 'error') {
              failed = ev.error || 'stream error';
            }
          }
        );
      } catch (err) {
        if (err?.name === 'AbortError') failed = 'aborted';
        else failed = err;
      } finally {
        abortRef.current = null;
      }
      const steps = trail.finish();

      if (failed && !full.trim()) {
        const aborted = failed === 'aborted';
        setMessages((list) =>
          list
            .filter((m) => m.id !== replyId)
            .concat(aborted ? [] : [{ id: uid(), role: 'error', content: typeof failed === 'string' ? t.errorGeneric : errorFor(failed), retry: { text, imageUrl }, ts: now() }])
        );
      } else {
        const done = finalizeAssistant(full, cfg);
        patch({ ...done, ...(steps.length ? { steps } : {}), streaming: false, thinking: false, interrupted: !!failed && failed !== 'aborted' });
        // Product metadata (v1 parity: cotonshoppen links, or admin opt-in).
        const needs = done.products.filter((p) => p.needsMetadata || (cfg.messages.productCards.autoFetchProductData && !p.image));
        if (needs.length) {
          Promise.all(needs.map((p) => fetchProductMetadata(p.url))).then((metas) => {
            const byUrl = new Map(needs.map((p, i) => [p.url, metas[i]]));
            setMessages((list) =>
              list.map((m) =>
                m.id !== replyId
                  ? m
                  : {
                      ...m,
                      products: m.products
                        .map((p) => {
                          const meta = byUrl.get(p.url);
                          if (!meta) return p;
                          return { ...p, image: p.image || meta.image, price: p.price || meta.price, name: meta.name || p.name, needsMetadata: false };
                        })
                        .filter((p) => !p.needsMetadata || p.image),
                    }
              )
            );
          });
        }
      }
      setSending(false);
      // Let state settle, then persist + arm the rating prompt.
      setTimeout(() => {
        saveToHistory(convRef.current, msgsRef.current);
        armRating();
      }, 0);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cfg, userId, consent, saveToHistory, armRating]
  );

  const send = useCallback(
    async (raw) => {
      const text = String(raw || '').trim();
      const imageUrl = attachment?.url || null;
      if ((!text && !imageUrl) || sending || attachment?.uploading) return false;
      activity();
      setSuggestionsUsed(true);
      setNotice(null);

      if (cfg.isBlocked && live.status !== 'active') {
        setMessages((list) => [...list, { id: uid(), role: 'error', content: cfg.blockReason || t.blocked, ts: now() }]);
        return false;
      }

      const userMsg = { id: uid(), role: 'user', content: text, imageUrl, ts: now() };
      setMessages((list) => [...list.filter((m) => m.role !== 'error'), userMsg]);
      setAttachment(null);

      if (live.status === 'active' && convRef.current) {
        try {
          const res = await sendLiveMessage({ conversationId: convRef.current, message: text || imageUrl });
          if (res?.message?.id) live.markSeen(res.message.id);
          setTimeout(() => saveToHistory(convRef.current, msgsRef.current), 0);
        } catch {
          setMessages((list) => [...list, { id: uid(), role: 'error', content: t.liveSendFailed, ts: now() }]);
        }
        return true;
      }

      // The API needs text; an image-only message gets a neutral prompt.
      runReply({ text: text || (cfg.lang === 'da' ? 'Se vedhæftede billede.' : 'See attached image.'), imageUrl });
      return true;
    },
    [attachment, sending, activity, cfg, live, runReply, saveToHistory, t]
  );

  const retry = useCallback(
    (errorMsg) => {
      if (!errorMsg?.retry || sending) return;
      setMessages((list) => list.filter((m) => m.id !== errorMsg.id));
      runReply(errorMsg.retry);
    },
    [runReply, sending]
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  /* ---------------------------------------------------------- welcome */
  const ensureWelcome = useCallback(() => {
    setMessages((list) => (list.length ? list : [{ id: uid(), role: 'assistant', content: cfg.copy.welcomeMessage, welcome: true, fresh: true, ts: now() }]));
  }, [cfg]);

  /* ---------------------------------------------------------- conversations */
  const resetConversation = useCallback(() => {
    abortRef.current?.abort();
    clearTimeout(timerRef.current);
    timerRef.current = null;
    live.reset();
    setConversationId(null);
    convRef.current = null;
    setRatingState('idle');
    setSupportOpen(false);
    setSuggestionsUsed(false);
    setAttachment(null);
    setNotice(null);
  }, [live]);

  const newConversation = useCallback(() => {
    resetConversation();
    setMessages([{ id: uid(), role: 'assistant', content: cfg.copy.welcomeMessage, welcome: true, fresh: true, ts: now() }]);
  }, [resetConversation, cfg]);

  const loadConversation = useCallback(
    (item) => {
      resetConversation();
      setSuggestionsUsed(true);
      setConversationId(item.id);
      convRef.current = item.id;
      setRatingState('done');
      setMessages(
        (item.messages || [])
          .map((m) => {
            const r = restoreMessage({ ...m, ts: m.ts || item.timestamp });
            if (!r) return null;
            if (r.role === 'assistant') Object.assign(r, finalizeAssistant(r.content, cfg));
            return r;
          })
          .filter(Boolean)
      );
    },
    [resetConversation, cfg]
  );

  const deleteConversation = useCallback(
    (id) => {
      const next = store.history().filter((h) => h && h.id !== id);
      store.setHistory(next);
      setHistoryList(next);
      if (id === convRef.current) newConversation();
    },
    [store, newConversation]
  );

  /* ---------------------------------------------------------- attachments */
  const attach = useCallback(
    async (file) => {
      const limits = cfg.settings.imageUpload;
      if (!file) return;
      if (!limits.allowedTypes.includes(file.type)) {
        setNotice({ tone: 'error', text: t.fileWrongType });
        return;
      }
      if (file.size > limits.maxSizeMB * 1024 * 1024) {
        setNotice({ tone: 'error', text: t.fileTooLarge(limits.maxSizeMB) });
        return;
      }
      setNotice(null);
      const preview = URL.createObjectURL(file);
      setAttachment({ uploading: true, name: file.name, preview });
      try {
        const url = await uploadImage(WIDGET_ID, file);
        setAttachment({ url, name: file.name, preview });
      } catch (err) {
        setAttachment(null);
        setNotice({ tone: 'error', text: err?.body?.error && err.status !== 500 ? err.body.error : t.uploadFailed });
      }
    },
    [cfg, t]
  );

  /* ---------------------------------------------------------- rating */
  const rate = useCallback(
    async (ratingMsgId, rating, feedback) => {
      await submitRating({ conversationId: convRef.current, widgetId: WIDGET_ID, rating, feedback: feedback || '' });
      setRatingState('done');
      setMessages((list) => list.map((m) => (m.id === ratingMsgId ? { ...m, submitted: rating } : m)));
    },
    []
  );

  /* ---------------------------------------------------------- support */
  const openSupport = useCallback(() => {
    if (supportOpen) return;
    setSupportOpen(true);
    setMessages((list) => [...list.filter((m) => m.role !== 'support'), { id: uid(), role: 'support', ts: now() }]);
  }, [supportOpen]);

  const closeSupport = useCallback(() => {
    setSupportOpen(false);
    setMessages((list) => list.filter((m) => m.role !== 'support'));
  }, []);

  const submitEmailSupport = useCallback(async ({ name, email, message }) => {
    if (!convRef.current) throw Object.assign(new Error('no-conversation'), { code: 'no-conversation' });
    await submitSupport({
      widgetId: WIDGET_ID,
      conversationId: convRef.current,
      contactInfo: { name: name || '', email },
      message: message || '',
    });
  }, []);

  const startLiveChat = useCallback(
    async (reason) => {
      if (!convRef.current) throw Object.assign(new Error('no-conversation'), { code: 'no-conversation' });
      try {
        await requestLiveChat({ conversationId: convRef.current, handoffReason: reason || null });
        live.begin('requested');
        pushLive({ id: uid(), role: 'system', content: t.liveRequested, ts: now() });
      } catch (err) {
        const status = err?.body?.status;
        if (status === 'requested' || status === 'active') {
          live.begin(status, err.body.agentInfo);
          pushLive({ id: uid(), role: 'system', content: t.liveAlready, ts: now() });
        } else {
          throw err;
        }
      }
      setSupportOpen(false);
      setMessages((list) => list.filter((m) => m.role !== 'support'));
    },
    [live, pushLive, t]
  );

  return {
    messages,
    conversationId,
    sending,
    attachment,
    notice,
    setNotice,
    suggestionsVisible: !suggestionsUsed && !supportOpen && cfg.copy.suggestedResponses.length > 0,
    historyList,
    live,
    supportOpen,
    send,
    retry,
    stop,
    activity,
    attach,
    clearAttachment: () => setAttachment(null),
    ensureWelcome,
    newConversation,
    loadConversation,
    deleteConversation,
    rate,
    openSupport,
    closeSupport,
    submitEmailSupport,
    startLiveChat,
    markWelcomeSeen: (id) => setMessages((list) => list.map((m) => (m.id === id ? { ...m, fresh: false } : m))),
  };
}

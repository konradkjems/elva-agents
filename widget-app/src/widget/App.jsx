import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiErrorWarningLine } from '@remixicon/react';
import { Skeleton } from '@/components/base/skeleton/skeleton';
import { DirectionProvider } from '@/components/foundations/direction/direction';
import { fetchConfig } from '../lib/api';
import { resolveConfig } from '../lib/config';
import { applyTheme } from '../lib/theme';
import { EMBEDDED, IS_PREVIEW, WIDGET_ID, createStore, on, send } from '../lib/bridge';
import { useChat } from './useChat';
import { Header } from './Header';
import { MessageList } from './MessageList';
import { Composer, Suggestions } from './Composer';
import { HistoryView } from './HistoryView';

/** Waits for the host loader's `init` (storage snapshot + page info). */
function useHostInit() {
  const [init, setInit] = useState(EMBEDDED ? null : { storage: null, page: { lang: navigator.language, isMobile: window.innerWidth <= 640 }, open: true });
  useEffect(() => {
    if (!EMBEDDED) return undefined;
    const off = on('init', (payload) => setInit(payload));
    send('ready');
    // A host that never answers (old cached loader, odd embed) still gets a chat.
    const t = setTimeout(() => setInit((cur) => cur || { storage: null, page: {}, open: false }), 2500);
    return () => {
      off();
      clearTimeout(t);
    };
  }, []);
  return init;
}

export function App() {
  const init = useHostInit();
  const [raw, setRaw] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!WIDGET_ID) {
      setError('missing-id');
      return;
    }
    fetchConfig(WIDGET_ID).then(setRaw, (err) => setError(err?.status === 404 ? 'not-found' : 'failed'));
  }, []);

  const cfg = useMemo(() => (raw && init ? resolveConfig(raw, init.page || {}) : null), [raw, init]);
  useEffect(() => {
    if (cfg) applyTheme(cfg);
  }, [cfg]);

  if (error) return <LoadError kind={error} />;
  if (!cfg) return <Loading />;
  return (
    <DirectionProvider locale={cfg.locale}>
      <Widget cfg={cfg} init={init} />
    </DirectionProvider>
  );
}

function Widget({ cfg, init }) {
  const store = useMemo(() => createStore(init.storage), [init]);
  const [isOpen, setIsOpen] = useState(!!init.open);
  const [isMobile, setIsMobile] = useState(!!init.page?.isMobile);
  const [view, setView] = useState('chat');
  const chat = useChat({ cfg, store, isOpen });
  const [flash, setFlash] = useState(null);
  const flashTimer = useRef(null);
  const announce = useCallback((text) => {
    clearTimeout(flashTimer.current);
    setFlash({ text, key: Date.now() });
    flashTimer.current = setTimeout(() => setFlash(null), 2400);
  }, []);

  useEffect(() => {
    const offs = [
      on('open', () => setIsOpen(true)),
      on('close', () => setIsOpen(false)),
      on('viewport', (p) => setIsMobile(!!p.isMobile)),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  // The welcome message lands the first time the panel is actually seen.
  useEffect(() => {
    if (isOpen) chat.ensureWelcome();
  }, [isOpen, chat.ensureWelcome]);

  const close = useCallback(() => {
    if (EMBEDDED) send('close');
    else setIsOpen(false);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('[role="dialog"], [role="menu"]')) return;
      // Escape steps back out of a sub-view before it closes the panel.
      if (view !== 'chat') setView('chat');
      else close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close, view]);

  const actions = useMemo(
    () => ({
      ...chat,
      newConversation: () => {
        chat.newConversation();
        announce(cfg.copy.newConversationStartedLabel);
      },
      loadConversation: (item) => {
        chat.loadConversation(item);
        announce(cfg.copy.conversationLoadedLabel);
      },
      deleteConversation: (id) => {
        chat.deleteConversation(id);
        announce(cfg.copy.conversationDeletedLabel);
      },
    }),
    [chat, cfg, announce]
  );

  return (
    <div className="relative flex h-full flex-col bg-background-primary-default" data-elva-root>
      {view === 'history' ? (
        <HistoryView cfg={cfg} chat={actions} onBack={() => setView('chat')} onClose={close} isMobile={isMobile} />
      ) : (
        <>
          <Header cfg={cfg} chat={actions} isMobile={isMobile} onClose={close} onShowHistory={() => setView('history')} />
          {cfg.copy.bannerText && (
            <div className="shrink-0 border-b border-separator-border bg-background-secondary-default px-4 py-2 text-center text-caption-1-regular text-text-secondary">
              {cfg.copy.bannerText}
            </div>
          )}
          <MessageList cfg={cfg} chat={actions} />
          {chat.suggestionsVisible && <Suggestions items={cfg.copy.suggestedResponses} onPick={(s) => chat.send(s)} />}
          <Composer cfg={cfg} chat={actions} isOpen={isOpen} isMobile={isMobile} />
        </>
      )}
      {IS_PREVIEW && <span className="sr-only">Preview</span>}
      <div aria-live="polite" className="pointer-events-none absolute inset-x-0 top-[76px] z-30 flex justify-center">
        {flash && (
          <span
            key={flash.key}
            className="elva-rise rounded-full border border-border-button-default bg-background-primary-default px-3 py-1.5 text-caption-1-medium text-text-primary shadow-sm"
          >
            {flash.text}
          </span>
        )}
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex h-full flex-col" aria-busy="true">
      <div className="flex items-center gap-3 border-b border-separator-border px-4 py-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-3 w-20 rounded-md" />
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-end gap-2 p-4 ps-13">
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <Skeleton className="h-4 w-1/2 rounded-md" />
      </div>
      <div className="p-3">
        <Skeleton className="h-[88px] w-full rounded-[22px]" />
      </div>
    </div>
  );
}

function LoadError({ kind }) {
  const da = (navigator.language || 'da').startsWith('da');
  const text =
    kind === 'not-found'
      ? da ? 'Chatten blev ikke fundet.' : 'This chat could not be found.'
      : da ? 'Chatten kunne ikke indlæses. Prøv at genindlæse siden.' : 'The chat could not load. Try reloading the page.';
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <RiErrorWarningLine className="size-6 text-foreground-icon-tertiary" aria-hidden />
      <p className="max-w-[30ch] text-body-regular text-text-secondary">{text}</p>
      {EMBEDDED && (
        <button
          type="button"
          onClick={() => send('close')}
          className="cursor-pointer rounded-md text-body-medium text-text-primary underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        >
          {da ? 'Luk' : 'Close'}
        </button>
      )}
    </div>
  );
}

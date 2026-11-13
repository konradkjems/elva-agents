import { useEffect, useLayoutEffect, useRef } from 'react';
import { RiErrorWarningLine, RiRefreshLine } from '@remixicon/react';
import { AgentThinking } from '@/components/application/agent-thinking/agent-thinking';
import { ScrollFade, useScrollFade } from '@/components/foundations/scroll-fade/scroll-fade';
import { cx } from '@/utils/cx';
import { Markdown, extractImages } from '../lib/markdown';
import { hidePartialProducts } from '../lib/products';
import { ActivityTrail } from './ActivityTrail';
import { AssistantAvatar, PersonAvatar } from './Avatar';
import { ProductCards } from './ProductCards';
import { RatingCard } from './RatingCard';
import { SupportCard } from './SupportCard';

function time(ts, locale) {
  if (!ts) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

function Images({ images }) {
  if (!images?.length) return null;
  return (
    <div className={cx('mt-3 grid gap-2', images.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
      {images.map((img) => (
        <a
          key={img.url}
          href={img.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-xl border border-separator-border bg-background-secondary-default"
        >
          <img
            src={img.url}
            alt={img.alt || ''}
            loading="lazy"
            className="max-h-60 w-full object-cover"
            onError={(e) => (e.currentTarget.parentElement.style.display = 'none')}
          />
        </a>
      ))}
    </div>
  );
}

function Speaker({ children, avatar }) {
  return (
    <div className="mb-1.5 flex items-center gap-2">
      {avatar}
      <span className="truncate text-caption-1-semibold text-text-secondary">{children}</span>
    </div>
  );
}

function AssistantMessage({ msg, cfg, showSpeaker, onSeen }) {
  const streaming = msg.streaming;
  const fresh = msg.welcome && msg.fresh;
  useEffect(() => {
    if (fresh) {
      const t = setTimeout(() => onSeen(msg.id), 1400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [fresh, msg.id, onSeen]);

  const text = streaming ? extractImages(hidePartialProducts(msg.content)).text : msg.content;
  return (
    <div className="flex flex-col">
      {showSpeaker && <Speaker avatar={<AssistantAvatar cfg={cfg} size="sm" />}>{cfg.names.assistant}</Speaker>}
      <div className="ps-9">
        {msg.steps?.length > 0 && <ActivityTrail steps={msg.steps} t={cfg.ui.steps} live={!!streaming} />}
        {msg.thinking && msg.steps?.length > 0 ? null : msg.thinking ? (
          <AgentThinking
            variant="wave"
            tone="subtle"
            label={cfg.messages.showTypingText ? cfg.copy.typingText : ''}
            showTimer={false}
            className="h-6"
          />
        ) : (
          <>
            <Markdown
              text={text}
              animate={streaming ? 'stream' : fresh ? 'stagger' : undefined}
              className="elva-prose text-headline-regular text-text-primary"
            />
            {!streaming && <Images images={msg.images} />}
            {!streaming && msg.products?.length > 0 && (
              <div className="elva-rise mt-3">
                <ProductCards products={msg.products} cfg={cfg} />
              </div>
            )}
            {msg.interrupted && <p className="mt-2 text-caption-1-regular text-text-tertiary">{cfg.ui.errorInterrupted}</p>}
          </>
        )}
      </div>
    </div>
  );
}

function AgentMessage({ msg, cfg, showSpeaker }) {
  const name = msg.agentInfo?.displayName || cfg.ui.agent;
  return (
    <div className="flex flex-col">
      {showSpeaker && (
        <Speaker avatar={<PersonAvatar agent={msg.agentInfo} size="sm" />}>
          {name}
          {msg.agentInfo?.title && <span className="font-normal text-text-tertiary"> · {msg.agentInfo.title}</span>}
        </Speaker>
      )}
      <div className="ps-9">
        <Markdown text={msg.content} className="elva-prose text-headline-regular text-text-primary" />
      </div>
    </div>
  );
}

function UserMessage({ msg }) {
  return (
    <div className="flex flex-col items-end">
      <div
        className="elva-rise max-w-[85%] overflow-hidden rounded-[20px] rounded-ee-md text-on-accent"
        style={{ background: 'var(--elva-bubble)' }}
      >
        {msg.imageUrl && (
          <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer" className="block">
            <img src={msg.imageUrl} alt="" className="max-h-56 w-full object-cover" />
          </a>
        )}
        {msg.content && (
          <Markdown text={msg.content} className="elva-prose elva-prose-on-accent px-3.5 py-2.5 text-headline-regular" />
        )}
      </div>
    </div>
  );
}

function SystemLine({ msg }) {
  return (
    <div className="elva-rise flex items-center gap-3 py-1" role="status">
      <span className="h-px flex-1 bg-separator-border" />
      <span className="max-w-[80%] text-center text-caption-1-regular text-text-tertiary">{msg.content}</span>
      <span className="h-px flex-1 bg-separator-border" />
    </div>
  );
}

function ErrorLine({ msg, cfg, onRetry }) {
  return (
    <div role="alert" className="elva-rise ms-9 flex flex-wrap items-center gap-x-2 gap-y-1 text-body-regular text-text-error-primary">
      <RiErrorWarningLine className="size-4 shrink-0" aria-hidden />
      <span>{msg.content}</span>
      {msg.retry && (
        <button
          type="button"
          onClick={() => onRetry(msg)}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md text-body-medium text-text-primary underline decoration-separator-border-strong underline-offset-4 hover:decoration-current outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        >
          <RiRefreshLine className="size-3.5" aria-hidden />
          {cfg.ui.retry}
        </button>
      )}
    </div>
  );
}

export function MessageList({ cfg, chat }) {
  const scrollRef = useRef(null);
  const stick = useRef(true);
  const fade = useScrollFade();
  const { messages } = chat;

  const onScroll = (e) => {
    fade.onScroll(e);
    const el = e.currentTarget;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    chat.activity();
  };

  const last = messages[messages.length - 1];
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (last?.role === 'support') {
      // A form taller than the viewport should open at its title, not its buttons.
      const card = el.querySelector(`[data-msg="${last.id}"]`);
      if (card) {
        stick.current = false;
        el.scrollTop = Math.max(0, Math.min(card.offsetTop - 12, el.scrollHeight - el.clientHeight));
        return;
      }
    }
    if (last?.role === 'user' || last?.role === 'rating') stick.current = true;
    if (stick.current) el.scrollTop = el.scrollHeight;
  }, [messages, last]);

  // Keep pinned to the bottom while images and cards load in.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => {
      if (stick.current) el.scrollTop = el.scrollHeight;
    });
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, []);

  let prevRole = null;
  let prevAgent = null;
  return (
    <div className="relative min-h-0 flex-1">
      <ScrollFade progress={fade.progress} />
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="elva-scroll relative h-full overflow-y-auto px-4 pb-4 pt-5"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        <div className="flex min-h-full flex-col justify-end gap-5">
          {messages.map((msg, i) => {
            const nextMsg = messages[i + 1];
            let node = null;
            const showSpeaker =
              (msg.role === 'assistant' && prevRole !== 'assistant') ||
              (msg.role === 'agent' && (prevRole !== 'agent' || prevAgent !== msg.agentInfo?.displayName));
            if (msg.role === 'assistant') node = <AssistantMessage msg={msg} cfg={cfg} showSpeaker={showSpeaker} onSeen={chat.markWelcomeSeen} />;
            else if (msg.role === 'agent') node = <AgentMessage msg={msg} cfg={cfg} showSpeaker={showSpeaker} />;
            else if (msg.role === 'user') node = <UserMessage msg={msg} />;
            else if (msg.role === 'system') node = <SystemLine msg={msg} />;
            else if (msg.role === 'error') node = <ErrorLine msg={msg} cfg={cfg} onRetry={chat.retry} />;
            else if (msg.role === 'rating') node = <div className="ps-9"><RatingCard msg={msg} cfg={cfg} chat={chat} /></div>;
            else if (msg.role === 'support') node = <SupportCard cfg={cfg} chat={chat} />;

            const endOfRun = !nextMsg || nextMsg.role !== msg.role || ['rating', 'support', 'error', 'system'].includes(msg.role);
            const stamp = endOfRun && ['user', 'assistant', 'agent'].includes(msg.role) && !msg.streaming && time(msg.ts, cfg.locale);
            prevRole = msg.role;
            prevAgent = msg.agentInfo?.displayName || null;
            return (
              <div key={msg.id} data-msg={msg.id} className={cx('flex flex-col', ['rating', 'support'].includes(msg.role) && '-mt-1')}>
                {node}
                {stamp && (
                  <time
                    dateTime={msg.ts}
                    className={cx(
                      'mt-1 text-caption-2-regular text-text-tertiary tabular-nums',
                      msg.role === 'user' ? 'self-end' : 'ps-9'
                    )}
                  >
                    {stamp}
                  </time>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

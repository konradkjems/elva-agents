import { useState } from 'react';
import { RiArrowLeftSLine, RiChat3Line, RiDeleteBin6Line, RiAddLine } from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { ScrollFade, useScrollFade } from '@/components/foundations/scroll-fade/scroll-fade';
import { cx } from '@/utils/cx';
import { GhostIconButton } from './Header';

function relativeDay(ts, copy, locale) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(new Date()) - start(d)) / 86400000);
  if (days <= 0) return `${copy.todayLabel}, ${d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`;
  if (days === 1) return copy.yesterdayLabel;
  if (days < 7) return `${days}${copy.daysAgoSuffix}`;
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

function Row({ item, cfg, active, onOpen, onDelete }) {
  const [confirm, setConfirm] = useState(false);
  const count = item.messageCount ?? item.messages?.length ?? 0;
  return (
    <li className="group relative">
      <button
        type="button"
        onClick={() => onOpen(item)}
        onMouseLeave={() => setConfirm(false)}
        className={cx(
          'flex w-full cursor-pointer items-start gap-3 rounded-2xl px-3 py-3 text-start transition-colors duration-150',
          'hover:bg-background-secondary-hover outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring',
          active && 'bg-background-secondary-default'
        )}
      >
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-background-tertiary-default text-foreground-icon-secondary">
          <RiChat3Line className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 pe-9">
          <span className="block truncate text-body-medium text-text-primary">{item.title || cfg.copy.newConversationLabel}</span>
          <span className="mt-0.5 block truncate text-caption-1-regular text-text-tertiary">
            {relativeDay(item.timestamp, cfg.copy, cfg.locale)} · {count} {cfg.copy.messagesLabel}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => (confirm ? onDelete(item.id) : setConfirm(true))}
        onBlur={() => setConfirm(false)}
        aria-label={confirm ? cfg.ui.confirmDelete : cfg.ui.deleteConversation}
        className={cx(
          'absolute end-2 top-1/2 inline-flex h-8 -translate-y-1/2 cursor-pointer items-center justify-center gap-1 rounded-full transition-[opacity,background-color,color] duration-150',
          'outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:opacity-100',
          confirm
            ? 'bg-background-tertiary-error px-3 text-caption-1-semibold text-text-error-primary opacity-100'
            : 'w-8 text-foreground-icon-tertiary opacity-100 hover:bg-background-tertiary-error hover:text-text-error-primary sm:opacity-0 sm:group-hover:opacity-100'
        )}
      >
        {confirm ? cfg.ui.confirmDelete : <RiDeleteBin6Line className="size-4" aria-hidden />}
      </button>
    </li>
  );
}

export function HistoryView({ cfg, chat, onBack, onClose, isMobile }) {
  const fade = useScrollFade();
  const list = chat.historyList.filter(Boolean);
  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b border-separator-border px-2 py-3">
        <GhostIconButton icon={RiArrowLeftSLine} label={cfg.ui.back} onClick={onBack} />
        <h1 className="min-w-0 flex-1 truncate text-headline-semibold text-text-primary">{cfg.copy.conversationHistoryLabel}</h1>
        {isMobile && (
          <Button size="small" variant="ghost" onClick={onClose}>
            {cfg.ui.close}
          </Button>
        )}
      </header>
      {list.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
          <span className="mb-1 flex size-11 items-center justify-center rounded-full bg-background-tertiary-default text-foreground-icon-secondary">
            <RiChat3Line className="size-5" aria-hidden />
          </span>
          <p className="text-headline-semibold text-text-primary">{cfg.copy.noConversationsLabel}</p>
          <p className="max-w-[28ch] text-body-regular text-text-secondary">{cfg.copy.startConversationLabel}</p>
        </div>
      ) : (
        <div className="relative min-h-0 flex-1">
          <ScrollFade progress={fade.progress} />
          <ul onScroll={fade.onScroll} className="elva-scroll flex h-full flex-col gap-0.5 overflow-y-auto p-2">
            {list.map((item) => (
              <Row
                key={item.id}
                item={item}
                cfg={cfg}
                active={item.id === chat.conversationId}
                onOpen={(it) => {
                  chat.loadConversation(it);
                  onBack();
                }}
                onDelete={chat.deleteConversation}
              />
            ))}
          </ul>
        </div>
      )}
      {cfg.advanced.showNewChatButton && (
        <div className="shrink-0 border-t border-separator-border p-3">
          <Button
            variant="secondary"
            leadingIcon={RiAddLine}
            className="w-full"
            onClick={() => {
              chat.newConversation();
              onBack();
            }}
          >
            {cfg.copy.newConversationLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

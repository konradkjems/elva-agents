import { useState } from 'react';
import { RiAddLine, RiCustomerService2Line, RiHistoryLine, RiMore2Fill, RiArrowDownSLine, RiCloseLine } from '@remixicon/react';
import { Dropdown, DropdownTrigger, DropdownPopover, DropdownItem } from '@/components/base/dropdown/dropdown';
import { cx } from '@/utils/cx';
import { AssistantAvatar, PersonAvatar } from './Avatar';

export function GhostIconButton({ icon: Icon, label, className, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-foreground-icon-secondary',
        'transition-colors duration-150 hover:bg-background-secondary-hover hover:text-foreground-icon-primary',
        'outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring',
        'disabled:cursor-not-allowed disabled:opacity-40',
        className
      )}
      {...props}
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}

function MenuRow({ icon: Icon, children }) {
  return (
    <>
      <Icon className="size-[18px] shrink-0 text-foreground-icon-secondary" aria-hidden />
      <span className="text-body-medium text-text-primary">{children}</span>
    </>
  );
}

export function Header({ cfg, chat, isMobile, onClose, onShowHistory }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const adv = cfg.advanced;
  const live = chat.live;
  const agentName = live.agentInfo?.displayName;

  const items = [
    adv.showNewChatButton && { key: 'new', icon: RiAddLine, label: cfg.copy.newConversationLabel, run: chat.newConversation },
    adv.showConversationHistory && { key: 'history', icon: RiHistoryLine, label: cfg.copy.conversationHistoryLabel, run: onShowHistory },
    cfg.manualReview.enabled && live.status === 'ai' && { key: 'support', icon: RiCustomerService2Line, label: cfg.support.buttonText, run: chat.openSupport },
  ].filter(Boolean);

  let status;
  if (live.status === 'active') status = <span className="truncate">{cfg.ui.liveChattingWith(agentName || cfg.ui.agent)}</span>;
  else if (live.status === 'requested') status = <span className="truncate">{cfg.ui.liveWaiting}</span>;
  else status = <span className="truncate">{cfg.copy.availableNowText}</span>;

  return (
    <header className="relative z-20 flex shrink-0 items-center gap-3 border-b border-separator-border px-4 py-3">
      <div className="relative">
        {live.status === 'active' ? <PersonAvatar agent={live.agentInfo} size="md" /> : <AssistantAvatar cfg={cfg} />}
        <span
          aria-hidden
          className="elva-online-dot absolute -bottom-px -right-px size-3 rounded-full ring-2 ring-background-primary-default"
          style={{ background: live.status === 'requested' ? 'var(--color-text-tertiary)' : 'var(--elva-online)' }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-headline-semibold text-text-primary">
          {live.status === 'active' && agentName ? agentName : cfg.names.title}
        </h1>
        <p className="flex min-w-0 items-center text-caption-1-regular text-text-secondary">{status}</p>
      </div>
      <div className="-me-1.5 flex items-center gap-0.5">
        {items.length > 0 && (
          <Dropdown isOpen={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownTrigger
              aria-label={cfg.ui.menu}
              className={cx(
                'inline-flex size-9 items-center justify-center rounded-xl text-foreground-icon-secondary transition-colors',
                'hover:bg-background-secondary-hover hover:text-foreground-icon-primary',
                menuOpen && 'bg-background-secondary-hover text-foreground-icon-primary'
              )}
            >
              <RiMore2Fill className="size-5" aria-hidden />
            </DropdownTrigger>
            <DropdownPopover aria-label={cfg.ui.menu} placement="bottom end" className="w-60">
              {items.map((it) => (
                <DropdownItem
                  key={it.key}
                  onSelect={() => {
                    setMenuOpen(false);
                    it.run();
                  }}
                >
                  <MenuRow icon={it.icon}>{it.label}</MenuRow>
                </DropdownItem>
              ))}
            </DropdownPopover>
          </Dropdown>
        )}
        {(adv.showCloseButton || isMobile) && (
          <GhostIconButton icon={isMobile ? RiCloseLine : RiArrowDownSLine} label={cfg.ui.close} onClick={onClose} />
        )}
      </div>
    </header>
  );
}

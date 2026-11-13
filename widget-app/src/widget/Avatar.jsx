import { useState } from 'react';
import { cx } from '@/utils/cx';
import { initials } from '../lib/config';

const SIZES = { sm: 'size-7 text-caption-2-semibold', md: 'size-10 text-body-semibold' };

/**
 * Assistant avatar: the widget's avatar image (with the admin's zoom/offset
 * crop), else its logo, else initials on a quiet accent tint.
 */
export function AssistantAvatar({ cfg, size = 'md', className }) {
  const b = cfg.branding;
  const [failed, setFailed] = useState(false);
  const src = !failed && (b.avatarUrl || b.logoUrl);
  const s = b.imageSettings || {};
  const isAvatar = !!b.avatarUrl && src === b.avatarUrl;
  const zoom = isAvatar ? s.avatarZoom ?? 1 : s.logoZoom ?? 1;
  const ox = isAvatar ? s.avatarOffsetX ?? 0 : s.logoOffsetX ?? 0;
  const oy = isAvatar ? s.avatarOffsetY ?? 0 : s.logoOffsetY ?? 0;
  const custom = b.useAvatarBackgroundColor && b.avatarBackgroundColor;

  return (
    <span
      aria-hidden
      className={cx(
        'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full',
        !custom && 'bg-accent-50 text-accent-700 ring-1 ring-inset ring-accent-100',
        SIZES[size],
        className
      )}
      style={custom ? { background: b.avatarBackgroundColor } : undefined}
    >
      {src ? (
        <img
          src={src}
          alt=""
          onError={() => setFailed(true)}
          className={cx('size-full', isAvatar ? 'object-cover' : 'object-contain p-1')}
          style={zoom !== 1 || ox || oy ? { transform: `scale(${zoom}) translate(${ox}px, ${oy}px)` } : undefined}
          draggable={false}
        />
      ) : (
        <span className={custom ? 'text-text-white' : undefined}>{initials(cfg.names.title)}</span>
      )}
    </span>
  );
}

export function PersonAvatar({ agent, size = 'sm', className }) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      aria-hidden
      className={cx(
        'inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-background-tertiary-default text-text-secondary',
        SIZES[size],
        className
      )}
    >
      {agent?.avatarUrl && !failed ? (
        <img src={agent.avatarUrl} alt="" className="size-full object-cover" onError={() => setFailed(true)} />
      ) : (
        initials(agent?.displayName || 'A')
      )}
    </span>
  );
}

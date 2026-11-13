import { useEffect, useId, useRef, useState } from 'react';
import {
  RiArrowDownSLine,
  RiBookOpenLine,
  RiChatHistoryLine,
  RiCheckLine,
  RiEyeLine,
  RiGlobalLine,
  RiImageLine,
  RiLightbulbLine,
  RiQuillPenLine,
  RiSearchLine,
} from '@remixicon/react';
import { SpinnerGlyph } from '@/components/base/spinner/spinner';
import { cx } from '@/utils/cx';

const ICONS = {
  context: RiChatHistoryLine,
  read: RiEyeLine,
  search: RiSearchLine,
  sources: RiBookOpenLine,
  web: RiGlobalLine,
  think: RiLightbulbLine,
  compose: RiQuillPenLine,
};

function hostOf(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, '');
    return path && path !== '/' ? `${u.hostname.replace(/^www\./, '')}${decodeURIComponent(path)}` : u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Label + optional detail for one step, in the visitor's language. */
function describe(step, t) {
  const live = step.status === 'active';
  const pick = (pair) => (live ? pair.active : pair.done);
  const d = step.data || {};
  switch (step.kind) {
    case 'context':
      return { label: pick(t.context), detail: d.count ? t.contextDetail(d.count) : null };
    case 'read':
      return { label: pick(d.image ? t.readImage : t.read), icon: d.image ? RiImageLine : null };
    case 'search':
      if (live) return { label: t.search.active, detail: d.query ? `“${d.query}”` : null };
      if (typeof d.count === 'number') return { label: d.count > 0 ? t.found(d.count) : t.none, detail: d.query ? `“${d.query}”` : null };
      return { label: t.search.done };
    case 'sources':
      return { label: pick(t.sources), detail: d.sources?.length ? t.sourcesCount(d.sources.length) : null };
    case 'web':
      return { label: pick(t.web), detail: d.query ? `“${d.query}”` : null };
    case 'think':
      return { label: pick(t.think) };
    case 'compose':
      return { label: pick(t.compose) };
    default:
      return { label: live ? t.think.active : t.think.done };
  }
}

function SourceChips({ sources, t }) {
  const shown = sources.slice(0, 4);
  const rest = sources.length - shown.length;
  return (
    <ul className="mt-1.5 flex flex-wrap gap-1.5">
      {shown.map((s, i) => {
        const text = s.title || (s.url ? hostOf(s.url) : '');
        if (!text) return null;
        const body = <span className="block max-w-[200px] truncate">{text}</span>;
        return (
          <li key={`${s.url || s.title}-${i}`} className="elva-rise" style={{ animationDelay: `${i * 60}ms` }}>
            {s.url ? (
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                title={s.url}
                className="inline-flex items-center rounded-md border border-separator-border bg-background-secondary-default px-1.5 py-0.5 text-caption-2-medium text-text-secondary outline-none transition-colors hover:bg-background-secondary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
              >
                {body}
              </a>
            ) : (
              <span className="inline-flex items-center rounded-md border border-separator-border bg-background-secondary-default px-1.5 py-0.5 text-caption-2-medium text-text-secondary">
                {body}
              </span>
            )}
          </li>
        );
      })}
      {rest > 0 && <li className="px-1 py-0.5 text-caption-2-regular text-text-tertiary">{t.more(rest)}</li>}
    </ul>
  );
}

function StepRow({ step, t, last }) {
  const { label, detail, icon } = describe(step, t);
  const Icon = icon || ICONS[step.kind] || RiLightbulbLine;
  const live = step.status === 'active';
  return (
    <li className="elva-rise relative flex gap-2.5 pb-2 last:pb-0">
      {!last && <span aria-hidden className="absolute start-[9px] top-5 bottom-0 w-px bg-separator-border" />}
      <span
        aria-hidden
        className={cx(
          'relative z-[1] flex size-[19px] shrink-0 items-center justify-center rounded-full border bg-background-primary-default transition-colors duration-300',
          live ? 'border-border-button-default text-foreground-icon-primary' : 'border-separator-border text-foreground-icon-tertiary'
        )}
      >
        <Icon className="size-3" />
      </span>
      <div className="min-w-0 flex-1 pt-px">
        <div className="flex items-center gap-1.5">
          <span className={cx('min-w-0 truncate text-caption-1-medium', live ? 'elva-shimmer text-text-secondary' : 'text-text-tertiary')}>
            {label}
            {detail && <span className="font-normal"> · {detail}</span>}
          </span>
          <span aria-hidden className="flex size-3.5 shrink-0 items-center justify-center">
            {live ? (
              <SpinnerGlyph size="xs" className="text-foreground-icon-tertiary" />
            ) : (
              <RiCheckLine className="elva-pop size-3.5 text-foreground-icon-tertiary" />
            )}
          </span>
        </div>
        {step.kind === 'sources' && step.data?.sources?.length > 0 && <SourceChips sources={step.data.sources} t={t} />}
      </div>
    </li>
  );
}

function summaryOf(steps, t) {
  const sources = new Set(
    steps.filter((s) => s.kind === 'sources').flatMap((s) => (s.data?.sources || []).map((x) => x.url || x.title))
  ).size;
  const searched = steps.some((s) => s.kind === 'search');
  const web = steps.some((s) => s.kind === 'web');
  if (searched && sources) return { icon: RiSearchLine, text: `${t.search.done} · ${t.sourcesCount(sources)}` };
  if (searched) return { icon: RiSearchLine, text: t.search.done };
  if (web) return { icon: RiGlobalLine, text: t.web.done };
  if (steps.some((s) => s.kind === 'read' && s.data?.image)) return { icon: RiImageLine, text: t.readImage.done };
  return { icon: RiCheckLine, text: t.stepsCount(steps.length) };
}

/**
 * The agent's visible work for one reply: expanded while it runs, folded into
 * a one-line summary once the answer is done (expandable again).
 */
export function ActivityTrail({ steps, t, live }) {
  const [open, setOpen] = useState(live);
  const wasLive = useRef(live);
  const listId = useId();

  useEffect(() => {
    if (live) {
      setOpen(true);
    } else if (wasLive.current) {
      // Let the last check mark land before folding away.
      const id = setTimeout(() => setOpen(false), 900);
      wasLive.current = live;
      return () => clearTimeout(id);
    }
    wasLive.current = live;
    return undefined;
  }, [live]);

  if (!steps?.length) return null;
  const summary = summaryOf(steps, t);
  const SummaryIcon = summary.icon;

  return (
    <div className={cx(live || open ? 'mb-2.5' : 'mb-1')}>
      {!live && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((v) => !v)}
          className="group -ms-1 inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 text-caption-1-medium text-text-tertiary outline-none transition-colors hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        >
          <SummaryIcon className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{summary.text}</span>
          <RiArrowDownSLine className={cx('size-3.5 shrink-0 transition-transform duration-200', open && 'rotate-180')} aria-hidden />
          <span className="sr-only">{open ? t.hide : t.show}</span>
        </button>
      )}
      <div
        id={listId}
        className={cx('grid transition-[grid-template-rows,opacity] duration-300 ease-out', open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}
      >
        <ol aria-live={live ? 'polite' : undefined} className={cx('min-h-0 overflow-hidden transition-[padding] duration-300', !live && open && 'pt-2')}>
          {steps.map((s, i) => (
            <StepRow key={s.id} step={s} t={t} last={i === steps.length - 1} />
          ))}
        </ol>
      </div>
    </div>
  );
}

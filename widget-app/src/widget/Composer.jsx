import { useEffect, useRef, useState } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { RiArrowUpLine, RiAttachment2, RiCloseLine, RiCustomerService2Line, RiMicLine, RiStopFill } from '@remixicon/react';
import { TextareaBase } from '@/components/base/textarea/textarea';
import { TextField } from '@/components/base/input/input';
import { Spinner } from '@/components/base/spinner/spinner';
import { Tooltip, TooltipTrigger } from '@/components/base/tooltip/tooltip';
import { cx } from '@/utils/cx';
import { useVoice } from './useVoice';

function ToolButton({ icon: Icon, label, active, className, onClick, disabled }) {
  return (
    <TooltipTrigger delay={400}>
      <AriaButton
        aria-label={label}
        onPress={onClick}
        isDisabled={disabled}
        className={cx(
          'inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-150',
          'outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40',
          active
            ? 'bg-background-tertiary-error text-text-error-primary'
            : 'text-foreground-icon-secondary hover:bg-background-secondary-hover hover:text-foreground-icon-primary',
          className
        )}
      >
        <Icon className="size-[18px]" aria-hidden />
      </AriaButton>
      <Tooltip placement="top">{label}</Tooltip>
    </TooltipTrigger>
  );
}

export function Suggestions({ items, onPick }) {
  return (
    <div className="flex flex-wrap justify-end gap-2 px-4 pb-3">
      {items.map((s, i) => (
        <button
          key={s}
          type="button"
          onClick={() => onPick(s)}
          style={{ animationDelay: `${120 + i * 50}ms` }}
          className={cx(
            'elva-rise max-w-full cursor-pointer truncate rounded-full border border-border-button-default bg-background-primary-default px-3.5 py-1.5',
            'text-body-medium text-text-primary shadow-xs transition-colors duration-150',
            'hover:border-accent-300 hover:bg-accent-50 hover:text-accent-700',
            'outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring'
          )}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

export function Composer({ cfg, chat, isOpen, isMobile }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const ui = cfg.ui;
  const blocked = cfg.isBlocked && chat.live.status !== 'active';
  const canAttach = cfg.settings.imageUpload.enabled && chat.live.status !== 'active';
  const canSupport = cfg.manualReview.enabled && chat.live.status === 'ai';
  const att = chat.attachment;

  const voice = useVoice({
    settings: cfg.messages.voiceInput,
    onText: setText,
    onFinal: () => setTimeout(() => submitRef.current?.(), 0),
    onError: (kind) => chat.setNotice({ tone: 'error', text: kind === 'denied' ? ui.voiceDenied : ui.voiceFailed }),
  });

  const submit = async () => {
    if (voice.recording) voice.stop();
    const ok = await chat.send(text);
    if (ok) setText('');
  };
  const submitRef = useRef(submit);
  submitRef.current = submit;

  useEffect(() => {
    if (isOpen && !isMobile) {
      const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 80);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isOpen, isMobile]);

  const hasContent = text.trim() || att?.url;
  const placeholder = blocked ? cfg.blockReason || ui.blocked : cfg.copy.inputPlaceholder;

  return (
    <div className="shrink-0 px-3 pb-2">
      {chat.notice && (
        <p role="alert" className="elva-rise mb-2 px-1 text-caption-1-regular text-text-error-primary">
          {chat.notice.text}
        </p>
      )}
      <div
        className={cx(
          'rounded-[22px] border border-border-button-default bg-background-primary-default shadow-xs transition-[border-color,box-shadow] duration-150',
          'focus-within:border-accent-400 focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-accent-500)_14%,transparent)]',
          blocked && 'opacity-60'
        )}
      >
        {att && (
          <div className="flex items-center gap-2 px-3 pt-3">
            <div className="relative size-12 overflow-hidden rounded-xl border border-separator-border bg-background-secondary-default">
              {att.preview && <img src={att.preview} alt="" className="size-full object-cover" />}
              {att.uploading && (
                <span className="absolute inset-0 flex items-center justify-center bg-background-primary-default/60">
                  <Spinner size="sm" aria-label={ui.uploading} />
                </span>
              )}
            </div>
            <span className="min-w-0 flex-1 truncate text-caption-1-regular text-text-secondary">{att.uploading ? ui.uploading : att.name}</span>
            <button
              type="button"
              onClick={chat.clearAttachment}
              aria-label={ui.removeAttachment}
              className="inline-flex size-7 cursor-pointer items-center justify-center rounded-full text-foreground-icon-tertiary hover:bg-background-secondary-hover hover:text-foreground-icon-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
            >
              <RiCloseLine className="size-4" aria-hidden />
            </button>
          </div>
        )}
        <TextField aria-label={placeholder} value={text} onChange={(v) => { setText(v); chat.activity(); }} isDisabled={blocked}>
          <TextareaBase
            ref={inputRef}
            rows={1}
            autoResize
            maxRows={6}
            placeholder={placeholder}
            onFocus={chat.activity}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            fieldClassName="!border-0 !bg-transparent !shadow-none !ring-0 px-4 pt-3 pb-1"
            className="text-headline-regular focus:placeholder:text-text-tertiary"
          />
        </TextField>
        <div className="flex items-center gap-1 px-2 pb-2">
          {canAttach && (
            <>
              <ToolButton icon={RiAttachment2} label={`${ui.attach} · ${ui.attachHint}`} onClick={() => fileRef.current?.click()} disabled={blocked || att?.uploading} />
              <input
                ref={fileRef}
                type="file"
                accept={cfg.settings.imageUpload.allowedTypes.join(',')}
                className="hidden"
                onChange={(e) => {
                  chat.attach(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </>
          )}
          {voice.supported && (
            <ToolButton
              icon={voice.recording ? RiStopFill : RiMicLine}
              label={voice.recording ? ui.voiceStop : ui.voiceStart}
              active={voice.recording}
              onClick={() => (voice.recording ? voice.stop() : voice.start(text.trim()))}
              disabled={blocked}
            />
          )}
          {canSupport && <ToolButton icon={RiCustomerService2Line} label={cfg.support.buttonText} onClick={chat.openSupport} />}
          <span className="flex-1" />
          {chat.sending ? (
            <button
              type="button"
              onClick={chat.stop}
              aria-label={ui.stop}
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-background-tertiary-default text-foreground-icon-primary transition-colors hover:bg-background-tertiary-hover outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
            >
              <RiStopFill className="size-4" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!hasContent || blocked || att?.uploading}
              aria-label={ui.send}
              className={cx(
                'inline-flex size-8 cursor-pointer items-center justify-center rounded-full transition-[background-color,transform,opacity] duration-150',
                'outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus-ring',
                'bg-accent-500 text-on-accent hover:bg-accent-600 active:scale-95',
                'disabled:cursor-not-allowed disabled:bg-background-tertiary-default disabled:text-foreground-icon-tertiary disabled:opacity-70 disabled:ring-1 disabled:ring-inset disabled:ring-border-button-default disabled:active:scale-100'
              )}
            >
              <RiArrowUpLine className="size-[18px]" aria-hidden />
            </button>
          )}
        </div>
      </div>
      <Footer cfg={cfg} />
    </div>
  );
}

function Footer({ cfg }) {
  const disclaimer = cfg.copy.disclaimerText;
  const brand = cfg.branding.showBranding;
  if (!disclaimer && !brand) return <div className="h-1" />;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-2 pt-2 text-center text-caption-2-regular text-text-tertiary">
      {disclaimer && <span>{disclaimer}</span>}
      {disclaimer && brand && <span aria-hidden>·</span>}
      {brand && (
        <a
          href="https://elva-solutions.com"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-sm transition-colors hover:text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        >
          {cfg.branding.poweredByText || cfg.ui.poweredBy} <span className="font-medium">Elva</span>
        </a>
      )}
    </div>
  );
}

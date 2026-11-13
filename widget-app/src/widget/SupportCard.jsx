import { useState } from 'react';
import { RiMailLine, RiCustomerService2Line, RiCheckLine, RiInformationLine } from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { Textarea } from '@/components/base/textarea/textarea';
import { SegmentedControl, SegmentedControlItem } from '@/components/base/segmented-control/segmented-control';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function SupportCard({ cfg, chat }) {
  const s = cfg.support;
  const ui = cfg.ui;
  const liveAllowed = cfg.manualReview.liveChatEnabled;
  const [mode, setMode] = useState('email');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState(null);

  const emailInvalid = touched && !EMAIL_RE.test(email.trim());

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (mode === 'email') {
      setTouched(true);
      if (!EMAIL_RE.test(email.trim())) return;
    }
    setState('sending');
    try {
      if (mode === 'email') {
        await chat.submitEmailSupport({ name: name.trim(), email: email.trim(), message: message.trim() });
        setState('sent');
      } else {
        await chat.startLiveChat(reason.trim());
      }
    } catch (err) {
      setState('idle');
      setError(err?.code === 'no-conversation' ? ui.needConversation : ui.formFailed);
    }
  };

  if (state === 'sent') {
    return (
      <div className="elva-rise rounded-2xl border border-border-button-default bg-background-primary-default p-4">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-accent-50 text-accent-600">
            <RiCheckLine className="size-4" aria-hidden />
          </span>
          <p className="text-body-semibold text-text-primary">{ui.formSentTitle}</p>
        </div>
        <p className="mt-2 text-body-regular text-text-secondary">{s.successMessage}</p>
        <Button size="small" variant="secondary" className="mt-3" onClick={chat.closeSupport}>
          OK
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="elva-rise flex flex-col gap-3 rounded-2xl border border-border-button-default bg-background-primary-default p-4"
    >
      <div>
        <h2 className="text-headline-semibold text-text-primary">{s.formTitle}</h2>
        <p className="mt-1 text-body-regular text-text-secondary">{mode === 'email' ? s.formDescription : s.liveNotice}</p>
      </div>

      {liveAllowed && (
        <SegmentedControl
          aria-label={s.formTitle}
          selectedKeys={[mode]}
          onSelectionChange={(keys) => {
            const next = [...keys][0];
            if (next) {
              setMode(next);
              setError(null);
            }
          }}
          className="w-full"
        >
          <SegmentedControlItem id="email" className="flex-1 gap-1.5">
            <RiMailLine className="size-4" aria-hidden />
            {s.emailTab}
          </SegmentedControlItem>
          <SegmentedControlItem id="live" className="flex-1 gap-1.5">
            <RiCustomerService2Line className="size-4" aria-hidden />
            {s.liveTab}
          </SegmentedControlItem>
        </SegmentedControl>
      )}

      {mode === 'email' ? (
        <>
          <Input label={s.nameLabel} placeholder={s.namePlaceholder} value={name} onChange={setName} autoComplete="name" size="small" autoFocus />
          <Input
            label={s.emailLabel}
            placeholder={s.emailPlaceholder}
            type="email"
            isRequired
            value={email}
            onChange={setEmail}
            onBlur={() => email && setTouched(true)}
            isInvalid={emailInvalid}
            errorMessage={ui.invalidEmail}
            autoComplete="email"
            size="small"
          />
          <Textarea label={s.messageLabel} placeholder={s.messagePlaceholder} value={message} onChange={setMessage} rows={3} autoResize maxRows={6} size="small" />
          <p className="flex items-start gap-1.5 text-caption-1-regular text-text-tertiary">
            <RiInformationLine className="mt-px size-3.5 shrink-0" aria-hidden />
            {s.attachmentNotice}
          </p>
        </>
      ) : (
        <Textarea label={s.liveReasonLabel} placeholder={s.liveReasonPlaceholder} value={reason} onChange={setReason} rows={3} autoResize maxRows={6} size="small" />
      )}

      {error && (
        <p role="alert" className="text-caption-1-regular text-text-error-primary">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" size="small" variant="secondary" onClick={chat.closeSupport}>
          {s.cancel}
        </Button>
        <Button type="submit" size="small" variant="primary" disabled={state === 'sending'}>
          {state === 'sending' ? ui.submitting : mode === 'email' ? s.submitEmail : ui.submitLive}
        </Button>
      </div>
    </form>
  );
}

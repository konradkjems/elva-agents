import { useState } from 'react';
import { RiEmotionUnhappyLine, RiEmotionSadLine, RiEmotionNormalLine, RiEmotionHappyLine, RiEmotionLaughLine, RiCheckLine } from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { TextareaBase } from '@/components/base/textarea/textarea';
import { TextField } from '@/components/base/input/input';
import { cx } from '@/utils/cx';

const FACES = [RiEmotionUnhappyLine, RiEmotionSadLine, RiEmotionNormalLine, RiEmotionHappyLine, RiEmotionLaughLine];

export function RatingCard({ msg, cfg, chat }) {
  const [picked, setPicked] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [state, setState] = useState(msg.submitted ? 'done' : 'idle'); // idle | sending | done | error
  const allowFeedback = cfg.satisfaction.allowFeedback;
  const ui = cfg.ui;

  const submit = async (rating) => {
    setState('sending');
    try {
      await chat.rate(msg.id, rating, feedback.trim());
      setState('done');
    } catch {
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <div className="elva-rise flex items-center gap-2 text-body-regular text-text-secondary">
        <RiCheckLine className="size-4 text-accent-600" aria-hidden />
        {ui.ratingThanks}
      </div>
    );
  }

  return (
    <div className="elva-rise rounded-2xl border border-border-button-default bg-background-primary-default p-4">
      <p className="text-body-medium text-text-primary">{cfg.rating.prompt}</p>
      <div role="radiogroup" aria-label={cfg.rating.prompt} className="mt-3 flex justify-between gap-1">
        {FACES.map((Face, i) => {
          const value = i + 1;
          const active = picked === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={ui.ratingLabels[i]}
              title={ui.ratingLabels[i]}
              disabled={state === 'sending'}
              onClick={() => {
                setPicked(value);
                if (!allowFeedback) submit(value);
              }}
              className={cx(
                'flex size-11 cursor-pointer items-center justify-center rounded-full transition-[background-color,color,transform] duration-150',
                'outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring active:scale-95',
                active
                  ? 'bg-accent-50 text-accent-600 ring-1 ring-inset ring-accent-200'
                  : 'text-foreground-icon-tertiary hover:bg-background-secondary-hover hover:text-foreground-icon-primary'
              )}
            >
              <Face className="size-7" aria-hidden />
            </button>
          );
        })}
      </div>
      {allowFeedback && picked && (
        <div className="elva-rise mt-3 flex flex-col gap-2">
          <TextField aria-label={cfg.rating.feedbackPlaceholder} value={feedback} onChange={setFeedback}>
            <TextareaBase rows={2} autoResize maxRows={5} placeholder={cfg.rating.feedbackPlaceholder} />
          </TextField>
          <Button size="small" variant="primary" onClick={() => submit(picked)} disabled={state === 'sending'} className="self-end">
            {ui.ratingSubmit}
          </Button>
        </div>
      )}
      {state === 'error' && <p className="mt-2 text-caption-1-regular text-text-error-primary">{ui.ratingFailed}</p>}
    </div>
  );
}

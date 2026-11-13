import { useCallback, useEffect, useRef, useState } from 'react';

/** Web Speech API dictation. Unsupported browsers (Firefox) get no mic button. */
export function useVoice({ settings, onText, onFinal, onError }) {
  const Rec = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
  const supported = !!(settings?.enabled && Rec);
  const [recording, setRecording] = useState(false);
  const recRef = useRef(null);
  const textRef = useRef('');
  const cb = useRef({ onText, onFinal, onError });
  cb.current = { onText, onFinal, onError };

  useEffect(() => () => recRef.current?.abort?.(), []);

  const start = useCallback(
    (prefix = '') => {
      if (!supported || recording) return;
      const rec = new Rec();
      rec.lang = settings.language || 'da-DK';
      rec.continuous = !!settings.continuousRecording;
      rec.interimResults = true;
      textRef.current = '';
      rec.onresult = (e) => {
        let text = '';
        for (let i = 0; i < e.results.length; i += 1) text += e.results[i][0].transcript;
        textRef.current = text;
        cb.current.onText?.((prefix ? `${prefix} ` : '') + text);
      };
      rec.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') cb.current.onError?.('denied');
        else if (e.error !== 'no-speech' && e.error !== 'aborted') cb.current.onError?.('failed');
      };
      rec.onend = () => {
        setRecording(false);
        recRef.current = null;
        if (settings.autoSendOnComplete && textRef.current.trim()) cb.current.onFinal?.();
      };
      try {
        rec.start();
        recRef.current = rec;
        setRecording(true);
      } catch (err) {
        if (err?.name !== 'InvalidStateError') cb.current.onError?.('failed');
      }
    },
    [Rec, recording, settings, supported]
  );

  const stop = useCallback(() => recRef.current?.stop(), []);
  return { supported, recording, start, stop };
}

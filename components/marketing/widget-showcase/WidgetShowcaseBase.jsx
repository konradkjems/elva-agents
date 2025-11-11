import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);

    return () => {
      mediaQuery.removeEventListener('change', updatePreference);
    };
  }, []);

  return prefersReducedMotion;
}

function shadeColor(hex, amount = -10) {
  const normalized = hex?.replace('#', '');
  if (!normalized || normalized.length !== 6) {
    return hex || '#4f46e5';
  }

  const num = parseInt(normalized, 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00ff) + amount;
  let b = (num & 0x0000ff) + amount;

  r = Math.max(Math.min(255, r), 0);
  g = Math.max(Math.min(255, g), 0);
  b = Math.max(Math.min(255, b), 0);

  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

const defaultConversation = [
  { id: 'assistant-1', sender: 'assistant', text: 'Hej! Klar til at hjælpe dig ✨' },
  { id: 'user-1', sender: 'user', text: 'Vis mig venligst et eksempel.' },
  { id: 'assistant-2', sender: 'assistant', text: 'Selvfølgelig! Denne komponent afspiller en dummy samtale med det samme look & feel som jeres AI-widget.' },
];

export default function WidgetShowcaseBase({
  accentColor = '#4f46e5',
  assistantName = 'Elva Assistant',
  assistantStatus = 'Tilgængelig nu',
  badgeText = 'AI Widget',
  conversation = defaultConversation,
  description,
  headerCtaLabel = 'Afspil igen',
  onConversationEnd,
  className,
}) {
  const containerRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [playKey, setPlayKey] = useState(0);
  const prefersReducedMotion = usePrefersReducedMotion();
  const darkerAccent = useMemo(() => shadeColor(accentColor, -25), [accentColor]);

  const timeOffsets = useMemo(() => {
    const baseDelay = 900;
    let cumulative = 200;

    return conversation.map((message) => {
      const messageDelay = message.delay ?? baseDelay;
      cumulative += messageDelay;
      return cumulative;
    });
  }, [conversation]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setVisibleCount(conversation.length);
      return;
    }

    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsActive(entry.isIntersecting);
      },
      {
        root: null,
        threshold: 0.4,
      }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    if (!isActive) {
      setVisibleCount(0);
      return;
    }

    const timers = [];
    setVisibleCount(0);

    timeOffsets.forEach((offset, index) => {
      timers.push(
        setTimeout(() => {
          setVisibleCount((prev) => {
            const next = Math.max(prev, index + 1);
            if (next === conversation.length && typeof onConversationEnd === 'function') {
              onConversationEnd();
            }
            return next;
          });
        }, offset)
      );
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [isActive, playKey, conversation.length, timeOffsets, prefersReducedMotion, onConversationEnd]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setVisibleCount(conversation.length);
    }
  }, [prefersReducedMotion, conversation.length]);

  const visibleMessages = prefersReducedMotion
    ? conversation
    : conversation.slice(0, visibleCount);

  const showTypingIndicator =
    !prefersReducedMotion &&
    isActive &&
    visibleCount < conversation.length &&
    conversation[visibleCount]?.sender === 'assistant';

  const initials = useMemo(() => {
    const parts = assistantName?.split(' ') ?? [];
    if (!parts.length) return 'AI';
    return parts
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [assistantName]);

  const handleReplay = () => {
    if (prefersReducedMotion) return;
    setPlayKey((prev) => prev + 1);
    setIsActive(true);
  };

  return (
    <div ref={containerRef} className={clsx('widget-showcase-wrapper', className)}>
      <div className="widget-card">
        <header className="widget-header" style={{ background: `linear-gradient(135deg, ${accentColor}, ${darkerAccent})` }}>
          <div className="assistant-meta">
            <div className="assistant-avatar">
              <span>{initials}</span>
            </div>
            <div className="assistant-copy">
              <div className="assistant-name">{assistantName}</div>
              <div className="assistant-status">
                <span className="status-dot" />
                {assistantStatus}
              </div>
            </div>
          </div>
          <div className="widget-actions">
            <button
              type="button"
              className="icon-button"
              aria-label="Vis muligheder"
              title="Vis muligheder"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={handleReplay}
              aria-label={headerCtaLabel}
              title={headerCtaLabel}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582M20 20v-5h-.581M5.184 9H12a4 4 0 014 4v0a4 4 0 01-4 4H9m-3.816 0H4" />
              </svg>
            </button>
          </div>
        </header>

        <div className="badge">{badgeText}</div>

        {description ? <p className="widget-description">{description}</p> : null}

        <div className="message-list">
          {visibleMessages.map((message) => {
            if (message.type === 'products') {
              return (
                <div key={message.id} className="message-row assistant visible">
                  <div className="message-bubble products">
                    {message.heading ? <div className="products-heading">{message.heading}</div> : null}
                    <div className="product-grid">
                      {message.products?.map((product) => (
                        <div key={product.id} className={clsx('product-card', product.highlight && 'product-card-highlight')}>
                          <div className="product-media" style={product.mediaColor ? { background: product.mediaColor } : undefined}>
                            {product.image ? (
                              <img src={product.image} alt={product.name} />
                            ) : (
                              <span>{product.fallback || product.name?.charAt(0) || '☆'}</span>
                            )}
                          </div>
                          <div className="product-body">
                            <div className="product-name">{product.name}</div>
                            {product.tag ? <span className="product-tag">{product.tag}</span> : null}
                            <p className="product-description">{product.description}</p>
                            {product.price ? <div className="product-price">{product.price}</div> : null}
                            {product.cta ? (
                              <button type="button" className="product-button">
                                {product.cta}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                    {message.footer ? <div className="products-footer">{message.footer}</div> : null}
                  </div>
                </div>
              );
            }

            if (message.type === 'image') {
              return (
                <div key={message.id} className={clsx('message-row', message.sender, 'visible')}>
                  <div className={clsx('message-bubble', message.sender === 'user' ? 'user' : 'assistant')}>
                    <div className="image-bubble">
                      <div className="image-wrapper">
                        <img src={message.image?.src} alt={message.image?.alt || 'Uploaded'} />
                      </div>
                      {message.caption ? <div className="image-caption">{message.caption}</div> : null}
                    </div>
                    {message.text ? <p>{message.text}</p> : null}
                  </div>
                </div>
              );
            }

            return (
              <div key={message.id} className={clsx('message-row', message.sender, 'visible')}>
                <div className={clsx('message-bubble', message.sender === 'user' ? 'user' : 'assistant')}>
                  {message.title ? <div className="message-title">{message.title}</div> : null}
                  <p>{message.text}</p>
                </div>
              </div>
            );
          })}

          {showTypingIndicator ? (
            <div className="message-row assistant visible">
              <div className="message-bubble assistant typing">
                <div className="typing-indicator">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <footer className="widget-footer">
          <div className="input-placeholder">Stil et spørgsmål...</div>
          <div className="footer-actions">
            <button type="button" className="footer-button" aria-label="Stemmesøgning">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 1a3 3 0 00-3 3v6a3 3 0 106 0V4a3 3 0 00-3-3z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 10v2a7 7 0 01-14 0v-2" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 19v4" />
              </svg>
            </button>
            <button type="button" className="footer-button primary" aria-label="Send besked">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3.4 4.2l16.2 7.3-16.2 7.3 2.1-7.3-2.1-7.3z" />
              </svg>
            </button>
          </div>
        </footer>
      </div>

      <style jsx>{`
        .widget-showcase-wrapper {
          width: 100%;
          max-width: 440px;
          margin: 0 auto;
        }

        .widget-card {
          position: relative;
          display: flex;
          flex-direction: column;
          border-radius: 24px;
          background: #ffffff;
          box-shadow: 0 30px 70px rgba(15, 23, 42, 0.18);
          border: 1px solid rgba(148, 163, 184, 0.18);
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .widget-header {
          padding: 20px 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: white;
        }

        .assistant-meta {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .assistant-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.22);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 18px;
          letter-spacing: 0.5px;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(12px);
        }

        .assistant-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          opacity: 0.9;
        }

        .assistant-name {
          font-weight: 600;
          font-size: 16px;
          line-height: 1.2;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #3fd128;
          box-shadow: 0 0 0 4px rgba(63, 209, 40, 0.18);
          animation: pulse 2.2s ease-in-out infinite;
        }

        .widget-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .icon-button {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          border: none;
          background: rgba(255, 255, 255, 0.16);
          color: inherit;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s ease, background 0.2s ease;
        }

        .icon-button:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.24);
        }

        .badge {
          position: absolute;
          top: 112px;
          left: 24px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(79, 70, 229, 0.1);
          color: #4338ca;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        .widget-description {
          margin: 60px 24px 12px;
          color: #4b5563;
          font-size: 14px;
          line-height: 1.6;
        }

        .message-list {
          padding: 24px 20px 28px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          background: linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%);
          min-height: 280px;
        }

        .message-row {
          display: flex;
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 0.35s ease, transform 0.35s ease;
        }

        .message-row.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .message-row.user {
          justify-content: flex-end;
        }

        .message-row.assistant {
          justify-content: flex-start;
        }

        .message-bubble {
          max-width: 82%;
          padding: 12px 16px;
          border-radius: 18px;
          font-size: 15px;
          line-height: 1.55;
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
          background: #ffffff;
          color: #1f2937;
        }

        .message-bubble.assistant {
          border-bottom-left-radius: 6px;
        }

        .message-bubble.user {
          background: linear-gradient(135deg, ${accentColor}, ${darkerAccent});
          color: white;
          border-bottom-right-radius: 6px;
        }

        .message-bubble.typing {
          width: 64px;
          display: flex;
          justify-content: center;
        }

        .message-title {
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 6px;
          color: inherit;
        }

        .typing-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .typing-indicator span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.8);
          animation: bounce 1.3s infinite;
        }

        .message-bubble.assistant .typing-indicator span {
          background: rgba(79, 70, 229, 0.35);
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: 0.12s;
        }

        .typing-indicator span:nth-child(3) {
          animation-delay: 0.24s;
        }

        .message-bubble.products {
          background: #ffffff;
          border: 1px solid rgba(79, 70, 229, 0.08);
          border-radius: 18px;
          padding: 18px 18px 16px;
        }

        .products-heading {
          font-size: 14px;
          font-weight: 600;
          color: #312e81;
          margin-bottom: 12px;
        }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 14px;
        }

        .product-card {
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          background: rgba(248, 250, 252, 0.85);
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 18px 30px rgba(79, 70, 229, 0.12);
        }

        .product-card-highlight {
          position: relative;
          background: rgba(79, 70, 229, 0.08);
        }

        .product-media {
          width: 100%;
          height: 92px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(79, 70, 229, 0.18), rgba(14, 165, 233, 0.22));
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .product-media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .product-media span {
          font-size: 28px;
          font-weight: 600;
          color: rgba(79, 70, 229, 0.8);
        }

        .product-body {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .product-name {
          font-size: 15px;
          font-weight: 600;
          color: #1f2937;
        }

        .product-tag {
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 600;
          color: #4338ca;
          background: rgba(79, 70, 229, 0.1);
          width: fit-content;
        }

        .product-description {
          font-size: 13px;
          color: #4b5563;
          line-height: 1.5;
        }

        .product-price {
          font-size: 14px;
          font-weight: 600;
          color: #1d4ed8;
        }

        .product-button {
          margin-top: 4px;
          border: none;
          border-radius: 10px;
          padding: 8px 10px;
          font-size: 13px;
          font-weight: 600;
          background: linear-gradient(135deg, ${accentColor}, ${darkerAccent});
          color: white;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .product-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 18px rgba(79, 70, 229, 0.22);
        }

        .products-footer {
          margin-top: 14px;
          font-size: 12px;
          color: #4b5563;
          opacity: 0.8;
        }

        .image-bubble {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .image-wrapper {
          border-radius: 16px;
          overflow: hidden;
          max-width: 220px;
          box-shadow: 0 12px 22px rgba(15, 23, 42, 0.15);
        }

        .image-wrapper img {
          display: block;
          width: 100%;
          height: auto;
        }

        .image-caption {
          font-size: 12px;
          opacity: 0.8;
          color: inherit;
        }

        .widget-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px;
          border-top: 1px solid rgba(226, 232, 240, 0.8);
          background: rgba(255, 255, 255, 0.96);
        }

        .input-placeholder {
          flex: 1;
          padding: 12px 16px;
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          color: #94a3b8;
          font-size: 14px;
          background: linear-gradient(120deg, rgba(248, 250, 252, 0.9), rgba(241, 245, 249, 0.9));
        }

        .footer-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-left: 12px;
        }

        .footer-button {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.24);
          background: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .footer-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 20px rgba(100, 116, 139, 0.18);
        }

        .footer-button.primary {
          background: linear-gradient(135deg, ${accentColor}, ${darkerAccent});
          border: none;
          color: white;
          box-shadow: 0 14px 24px rgba(79, 70, 229, 0.24);
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.18);
            opacity: 0.6;
          }
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }

        @media (max-width: 768px) {
          .widget-card {
            border-radius: 20px;
          }

          .widget-header {
            padding: 18px;
          }

          .message-list {
            padding: 20px 18px 24px;
          }

          .message-bubble {
            max-width: 86%;
          }

          .product-grid {
            grid-template-columns: 1fr;
          }

          .badge {
            top: 108px;
          }
        }
      `}</style>
    </div>
  );
}



import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { VscDebugRestart } from 'react-icons/vsc';

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
    return hex || '#175bfa';
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
  { id: 'user-1', sender: 'user', text: 'Vis mig et eksempel' },
  { id: 'assistant-2', sender: 'assistant', text: 'Selvfølgelig! Denne komponent afspiller en dummy samtale med det samme look & feel som jeres AI-widget.' },
];

export default function WidgetShowcaseBase({
  accentColor = '#175bfa', // Elva Solutions blue
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
  const messageListRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [playKey, setPlayKey] = useState(0);
  const [typingMessages, setTypingMessages] = useState({});
  const [inputValue, setInputValue] = useState(''); // Track input field value for user message typewriter
  const [isTypingInInput, setIsTypingInInput] = useState(false); // Track if currently typing in input
  const [cursorPosition, setCursorPosition] = useState(0); // Track cursor position for user message typewriter
  const [hasCompleted, setHasCompleted] = useState(false); // Track if animation has completed
  const [isImageUploadAnimating, setIsImageUploadAnimating] = useState(false); // Track image upload button animation
  const [visibleProducts, setVisibleProducts] = useState({}); // Track which products are visible for staggered animation
  const imageUploadButtonRef = useRef(null); // Ref for image upload button
  const completedMessagesRef = useRef(new Set()); // Track which messages have completed typewriter
  const activeTimersRef = useRef([]); // Track active timers
  const visibleCountRef = useRef(0); // Track visible count in ref to avoid dependency issues
  const lastPlayKeyRef = useRef(0); // Track last playKey to detect changes
  const hasStartedRef = useRef(false); // Track if animation has started (using ref to avoid timing issues)
  const inputRef = useRef(null); // Ref for input field
  const measureRef = useRef(null); // Ref for measuring text width
  const prefersReducedMotion = usePrefersReducedMotion();
  const darkerAccent = useMemo(() => shadeColor(accentColor, -25), [accentColor]);

  const timeOffsets = useMemo(() => {
    const baseDelay = 2500; // Increased delay between messages - gives time to read
    let cumulative = 500; // Initial delay before first message
    const typewriterSpeed = 5; // ms per character
    const typewriterInitialDelay = 800; // ms before typing starts

    return conversation.map((message, index) => {
      const prevMessage = index > 0 ? conversation[index - 1] : null;
      
      // Calculate delay based on message length - longer messages need more time
      const messageLength = message.text?.length || 0;
      const readingTime = Math.max(2000, messageLength * 50); // At least 2 seconds, plus 50ms per character
      let messageDelay = message.delay ?? Math.max(baseDelay, readingTime);
      
      // If previous message was an assistant message and this is a user message,
      // ensure there's enough time for typewriter to finish + natural pause
      if (prevMessage && prevMessage.sender === 'assistant' && message.sender === 'user') {
        const prevTextLength = prevMessage.text?.length || 0;
        // Total time for previous assistant message typewriter: initial delay + typing time
        const prevTypewriterTime = typewriterInitialDelay + (prevTextLength * typewriterSpeed);
        // Natural pause after user reads the message (2 seconds feels natural)
        const naturalPause = 2000; // 2 seconds pause after reading
        // The delay between when prev message starts showing and when this message should show
        // should account for typewriter finishing + pause
        // Since messageDelay is added to cumulative, we need to ensure it's at least
        // the typewriter time + pause (minus any time already accounted for in base delay)
        const minDelayAfterTypewriter = prevTypewriterTime + naturalPause;
        messageDelay = Math.max(messageDelay, minDelayAfterTypewriter);
      }
      
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

  // Auto-scroll to bottom when messages appear or typewriter updates
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [visibleCount, typingMessages]);

  // Typewriter effect function for assistant messages
  const startTypewriter = useMemo(() => {
    return (messageId, text) => {
      // Don't start typewriter if this message has already been typed
      if (completedMessagesRef.current.has(messageId)) {
        return;
      }

      if (prefersReducedMotion) {
        setTypingMessages((prev) => ({ ...prev, [messageId]: text }));
        completedMessagesRef.current.add(messageId);
        return;
      }

      const speed = 8; // Slower typing speed - 8ms per character (was 5ms)
      let charCount = 0;
      const fullText = text;

      // Start with empty string to show typing indicator first
      setTypingMessages((prev) => ({ ...prev, [messageId]: '' }));

      const typeNext = () => {
        if (charCount < fullText.length) {
          charCount++;
          setTypingMessages((prev) => ({
            ...prev,
            [messageId]: fullText.substring(0, charCount),
          }));
          setTimeout(typeNext, speed);
        } else {
          // Typing complete - mark as completed
          completedMessagesRef.current.add(messageId);
          // Remove from typing state after a short delay
          setTimeout(() => {
            setTypingMessages((prev) => {
              const updated = { ...prev };
              delete updated[messageId];
              return updated;
            });
          }, 100);
        }
      };

      // Start typing after a delay (to show typing indicator first)
      setTimeout(typeNext, 800);
    };
  }, [prefersReducedMotion]);

  // Typewriter effect function for user messages (types in input field)
  const startUserMessageTypewriter = useMemo(() => {
    return (text, onComplete) => {
      if (prefersReducedMotion) {
        setInputValue(text);
        setIsTypingInInput(false);
        if (onComplete) {
          setTimeout(onComplete, 500);
        }
        return;
      }

      const speed = 15; // Much slower typing speed for user messages - 15ms per character (was 3ms)
      let charCount = 0;
      const fullText = text;

      setIsTypingInInput(true);
      setInputValue('');
      const basePadding = conversation.some(msg => msg.type === 'image') ? 82 : 46;
      setCursorPosition(basePadding); // Start at left padding position

      // Focus input field when typing starts
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);

      const typeNext = () => {
        if (charCount < fullText.length) {
          charCount++;
          const currentText = fullText.substring(0, charCount);
          setInputValue(currentText);
          
          // Calculate cursor position by measuring text width
          if (measureRef.current) {
            measureRef.current.textContent = currentText;
            const textWidth = measureRef.current.offsetWidth;
            setCursorPosition(basePadding + textWidth);
          }
          
          setTimeout(typeNext, speed);
        } else {
          // Typing complete - wait a moment then show message
          setIsTypingInInput(false);
          if (onComplete) {
            setTimeout(onComplete, 300); // Small delay before showing message
          }
        }
      };

      // Start typing after a short delay
      setTimeout(typeNext, 200);
    };
  }, [prefersReducedMotion, conversation]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    
    // If animation has completed, don't restart it when scrolling
    if (hasCompleted) {
      return;
    }

    if (!isActive) {
      // Don't reset when scrolling away - keep the progress
      return;
    }

    // Check if playKey has changed (replay was triggered)
    const playKeyChanged = playKey !== lastPlayKeyRef.current;
    
    if (playKeyChanged) {
      lastPlayKeyRef.current = playKey;
      // Reset states for replay
      hasStartedRef.current = false;
      setHasCompleted(false);
      completedMessagesRef.current.clear();
      visibleCountRef.current = 0;
    }

    // Start animation if it hasn't started yet OR if playKey changed (replay)
    const shouldStart = !hasStartedRef.current || playKeyChanged;
    
    if (shouldStart) {
      hasStartedRef.current = true;
      setVisibleCount(0);
      visibleCountRef.current = 0;
      setTypingMessages({});
      
      // Clear any existing timers first
      activeTimersRef.current.forEach(clearTimeout);
      activeTimersRef.current = [];
      
      const timers = [];
      
      timeOffsets.forEach((offset, index) => {
        timers.push(
          setTimeout(() => {
            const message = conversation[index];
            
            // Handle user messages - type in input field first
            if (message && message.sender === 'user' && message.text) {
              startUserMessageTypewriter(message.text, () => {
                // After typing in input is complete, show the message
                setVisibleCount((prev) => {
                  const next = Math.max(prev, index + 1);
                  visibleCountRef.current = next;
                  setInputValue(''); // Clear input after showing message
                  
                  if (next === conversation.length) {
                    setHasCompleted(true);
                    if (typeof onConversationEnd === 'function') {
                      onConversationEnd();
                    }
                  }
                  return next;
                });
              });
            } else {
              // Handle assistant messages and other types
              // For assistant messages, show the message first, then start typewriter
              if (message && message.sender === 'assistant' && message.text && !message.type) {
                // Initialize typing state immediately to prevent showing typing indicator for wrong message
                setTypingMessages((prev) => ({
                  ...prev,
                  [message.id]: '',
                }));
                
                setVisibleCount((prev) => {
                  const next = Math.max(prev, index + 1);
                  visibleCountRef.current = next;
                  
                  // Start typewriter effect after a short delay (to show typing indicator first)
                  setTimeout(() => {
                    if (!completedMessagesRef.current.has(message.id)) {
                      startTypewriter(message.id, message.text);
                    }
                  }, 100);
                  
                  if (next === conversation.length) {
                    setHasCompleted(true);
                    if (typeof onConversationEnd === 'function') {
                      onConversationEnd();
                    }
                  }
                  return next;
                });
              } else if (message && message.type === 'image' && message.sender === 'user') {
                // Handle image upload: animate button click, then show image
                setIsImageUploadAnimating(true);
                
                // Animate button click
                setTimeout(() => {
                  if (imageUploadButtonRef.current) {
                    imageUploadButtonRef.current.style.transform = 'scale(0.9)';
                    imageUploadButtonRef.current.style.backgroundColor = 'rgba(107, 114, 128, 0.2)';
                  }
                }, 100);
                
                // Reset button animation
                setTimeout(() => {
                  if (imageUploadButtonRef.current) {
                    imageUploadButtonRef.current.style.transform = 'scale(1)';
                    imageUploadButtonRef.current.style.backgroundColor = 'transparent';
                  }
                  setIsImageUploadAnimating(false);
                }, 300);
                
                // Show image after button animation
                setTimeout(() => {
                  setVisibleCount((prev) => {
                    const next = Math.max(prev, index + 1);
                    visibleCountRef.current = next;
                    
                    if (next === conversation.length) {
                      setHasCompleted(true);
                      if (typeof onConversationEnd === 'function') {
                        onConversationEnd();
                      }
                    }
                    return next;
                  });
                }, 500);
              } else if (message && message.type === 'products') {
                // Handle product cards: show message first, then show products with staggered animation
                setVisibleCount((prev) => {
                  const next = Math.max(prev, index + 1);
                  visibleCountRef.current = next;
                  
                  // Show products with staggered animation (200ms delay between each)
                  if (message.products && message.products.length > 0) {
                    message.products.forEach((product, productIndex) => {
                      setTimeout(() => {
                        setVisibleProducts((prev) => ({
                          ...prev,
                          [`${message.id}-${product.id}`]: true,
                        }));
                      }, productIndex * 200); // 200ms delay between each product
                    });
                  }
                  
                  if (next === conversation.length) {
                    setHasCompleted(true);
                    if (typeof onConversationEnd === 'function') {
                      onConversationEnd();
                    }
                  }
                  return next;
                });
              } else {
                // For other message types, show immediately
                setVisibleCount((prev) => {
                  const next = Math.max(prev, index + 1);
                  visibleCountRef.current = next;
                  
                  if (next === conversation.length) {
                    setHasCompleted(true);
                    if (typeof onConversationEnd === 'function') {
                      onConversationEnd();
                    }
                  }
                  return next;
                });
              }
            }
          }, offset)
        );
      });

      activeTimersRef.current = timers;

      return () => {
        timers.forEach(clearTimeout);
        activeTimersRef.current = [];
      };
    }
    // If animation has already started and playKey hasn't changed, don't restart it
  }, [isActive, playKey, conversation, timeOffsets, prefersReducedMotion, onConversationEnd, startTypewriter, startUserMessageTypewriter, hasCompleted]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setVisibleCount(conversation.length);
    }
  }, [prefersReducedMotion, conversation.length]);

  const visibleMessages = prefersReducedMotion
    ? conversation
    : conversation.slice(0, visibleCount);

  // Find the next assistant message that should show typing indicator
  const nextAssistantMessage = useMemo(() => {
    if (prefersReducedMotion || !isActive || visibleCount >= conversation.length) {
      return null;
    }
    
    // Find the next assistant message that hasn't been typed yet
    // We need to check messages starting from visibleCount, but only show typing indicator
    // for the FIRST assistant message that hasn't started typing yet
    for (let i = visibleCount; i < conversation.length; i++) {
      const msg = conversation[i];
      if (msg && msg.sender === 'assistant' && msg.text && !msg.type) {
        // Check if this message is already being typed or completed
        const isTyping = typingMessages[msg.id] !== undefined;
        const isCompleted = completedMessagesRef.current.has(msg.id);
        
        // Only show typing indicator if message hasn't started typing yet
        if (!isTyping && !isCompleted) {
          // Check if any previous assistant message is still typing
          // We don't want to show typing indicator for the next message while any previous one is still typing
          for (let j = i - 1; j >= 0; j--) {
            const prevMsg = conversation[j];
            if (prevMsg && prevMsg.sender === 'assistant' && prevMsg.text && !prevMsg.type) {
              const prevIsTyping = typingMessages[prevMsg.id] !== undefined;
              const prevIsCompleted = completedMessagesRef.current.has(prevMsg.id);
              // If any previous assistant message is still typing, don't show typing indicator for next one yet
              if (prevIsTyping && !prevIsCompleted) {
                return null;
              }
            }
          }
          
          // Check if there's a user message before this assistant message that hasn't been shown yet
          // We don't want to show typing indicator for assistant message before user has responded
          if (i > 0) {
            const prevMsg = conversation[i - 1];
            // If the previous message is a user message and it's not yet visible, don't show typing indicator
            if (prevMsg && prevMsg.sender === 'user' && i - 1 >= visibleCount) {
              return null;
            }
          }
          
          return msg;
        }
        // If this message is already typing or completed, continue to next
      }
    }
    return null;
  }, [prefersReducedMotion, isActive, visibleCount, conversation, typingMessages]);

  const showTypingIndicator = !!nextAssistantMessage;

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
    // Clear all active timers
    activeTimersRef.current.forEach(clearTimeout);
    activeTimersRef.current = [];
    // Reset completion state and completed messages
    setHasCompleted(false);
    hasStartedRef.current = false;
    completedMessagesRef.current.clear();
    visibleCountRef.current = 0;
    setPlayKey((prev) => prev + 1);
    setIsActive(true);
    // Reset visible count to restart animation
    setVisibleCount(0);
    setTypingMessages({});
    setInputValue('');
    setIsTypingInInput(false);
    setCursorPosition(0);
    setIsImageUploadAnimating(false);
    setVisibleProducts({});
    if (imageUploadButtonRef.current) {
      imageUploadButtonRef.current.style.transform = 'scale(1)';
      imageUploadButtonRef.current.style.backgroundColor = 'transparent';
    }
  };

  return (
    <div ref={containerRef} className={clsx('widget-showcase-wrapper', className)}>
      <div className="widget-card">
        <header className="widget-header" style={{ background: `linear-gradient(135deg, ${accentColor}, ${darkerAccent})` }}>
          <div className="assistant-meta">
            <div className="assistant-avatar">
              <img src="/Elva Logo 128 white.png" alt={assistantName} />
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
              <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={handleReplay}
              aria-label={headerCtaLabel}
              title={headerCtaLabel}
            >
              <VscDebugRestart size={22} />
            </button>
          </div>
        </header>


        <div className="message-list" ref={messageListRef}>
          {visibleMessages.map((message) => {
            if (message.type === 'products') {
              return (
                <div key={message.id} className="message-row assistant visible">
                  <div className="message-content-wrapper">
                    <div className="message-avatar" style={{ background: accentColor }}>
                      <img src="/Elva Logo 128 white.png" alt={assistantName} />
                    </div>
                    <div className="message-content">
                      <div className="message-name-label">{assistantName}</div>
                      <div className="message-bubble products">
                        {message.heading ? <div className="products-heading">{message.heading}</div> : null}
                        <div className="product-grid">
                          {message.products?.map((product, productIndex) => {
                            const isVisible = visibleProducts[`${message.id}-${product.id}`] || prefersReducedMotion;
                            const CardWrapper = product.url ? 'a' : 'div';
                            const cardProps = product.url ? {
                              href: product.url,
                              target: '_blank',
                              rel: 'noopener noreferrer'
                            } : {};
                            
                            return (
                              <CardWrapper 
                                key={product.id} 
                                className={clsx('product-card', { 'product-card-visible': isVisible })}
                                {...cardProps}
                              >
                                {product.image ? (
                                  <img src={product.image} alt={product.name} className="product-image" />
                                ) : (
                                  <div className="product-image-placeholder">
                                    <span>{product.fallback || product.name?.charAt(0) || '☆'}</span>
                                  </div>
                                )}
                                <div className="product-info">
                                  <div className="product-name">{product.name}</div>
                                  {product.price ? (
                                    <div className="product-price" style={{ color: accentColor }}>
                                      {product.price}
                                    </div>
                                  ) : null}
                                </div>
                              </CardWrapper>
                            );
                          })}
                        </div>
                        {message.footer ? <div className="products-footer">{message.footer}</div> : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            if (message.type === 'image') {
              if (message.sender === 'assistant') {
                return (
                  <div key={message.id} className={clsx('message-row', message.sender, 'visible')}>
                    <div className="message-content-wrapper">
                      <div className="message-avatar" style={{ background: accentColor }}>
                        <span>{initials}</span>
                      </div>
                      <div className="message-content">
                        <div className="message-name-label">{assistantName}</div>
                        <div className="message-bubble assistant">
                          <div className="image-bubble">
                            <div className="image-wrapper">
                              <img src={message.image?.src} alt={message.image?.alt || 'Uploaded'} />
                            </div>
                            {message.caption ? <div className="image-caption">{message.caption}</div> : null}
                          </div>
                          {message.text ? <p>{message.text}</p> : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <div key={message.id} className={clsx('message-row', message.sender, 'visible')}>
                  <div className="message-bubble user">
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

            if (message.sender === 'assistant') {
              const isTyping = typingMessages[message.id] !== undefined;
              const isCompleted = completedMessagesRef.current.has(message.id);
              const displayText = isTyping ? typingMessages[message.id] : (isCompleted ? message.text : '');
              const showTypingIndicator = isTyping && displayText === '';
              const showText = (isTyping && displayText !== '') || isCompleted;
              const showCursor = isTyping && displayText !== '' && displayText !== message.text;

              return (
                <div key={message.id} className={clsx('message-row', message.sender, 'visible')}>
                  <div className="message-content-wrapper">
                    <div className="message-avatar" style={{ background: accentColor }}>
                      <img src="/Elva Logo 128 white.png" alt={assistantName} />
                    </div>
                    <div className="message-content">
                      <div className="message-name-label">{assistantName}</div>
                      <div className={clsx('message-bubble', 'assistant', { typing: showTypingIndicator })}>
                        {message.title ? <div className="message-title">{message.title}</div> : null}
                        {showTypingIndicator ? (
                          <div className="typing-indicator">
                            <span />
                            <span />
                            <span />
                          </div>
                        ) : null}
                        {showText && (
                          <p>
                            {displayText}
                            {showCursor && <span className="typewriter-cursor">|</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={message.id} className={clsx('message-row', message.sender, 'visible')}>
                <div className={clsx('message-bubble', 'user')} style={{ background: `linear-gradient(135deg, ${accentColor}, ${darkerAccent})` }}>
                  {message.title ? <div className="message-title">{message.title}</div> : null}
                  <p>{message.text}</p>
                </div>
              </div>
            );
          })}

          {showTypingIndicator ? (
            <div className="message-row assistant visible">
              <div className="message-content-wrapper">
                <div className="message-avatar" style={{ background: accentColor }}>
                  <img src="/Elva Logo 128 white.png" alt={assistantName} />
                </div>
                <div className="message-content">
                  <div className="message-name-label">{assistantName}</div>
                  <div className="message-bubble assistant typing">
                    <div className="typing-indicator">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <footer className="widget-footer">
          <div className="input-container">
            <div className="input-field-wrapper">
              <button type="button" className="input-button voice-button" aria-label="Stemmesøgning">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </button>
              {conversation.some(msg => msg.type === 'image') && (
                <button 
                  ref={imageUploadButtonRef}
                  type="button" 
                  className="input-button image-upload-button" 
                  aria-label="Upload billede"
                  style={{
                    transition: 'all 0.2s ease',
                  }}
                >
                  <svg className="image-icon" width="20" height="20" viewBox="-4.5 0 24 24" fill="currentColor">
                    <path d="m9.818 0c-3.012 0-5.455 2.442-5.455 5.455v9.818c0 1.808 1.465 3.273 3.273 3.273s3.273-1.465 3.273-3.273v-5.665c-.017-.589-.499-1.061-1.091-1.061s-1.074.471-1.091 1.059v.002 5.665.031c0 .603-.489 1.091-1.091 1.091s-1.091-.489-1.091-1.091c0-.011 0-.021 0-.032v.002-9.818c0-1.808 1.465-3.273 3.273-3.273s3.273 1.465 3.273 3.273v10.906c0 3.012-2.442 5.455-5.455 5.455s-5.455-2.442-5.455-5.455v-10.906c0-.009 0-.02 0-.031 0-.603-.489-1.091-1.091-1.091s-1.091.489-1.091 1.091v.032-.002 10.906c0 4.217 3.419 7.636 7.636 7.636s7.636-3.419 7.636-7.636v-10.906c-.003-3.011-2.444-5.452-5.455-5.455z"/>
                  </svg>
                </button>
              )}
              <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                {/* Hidden element for measuring text width */}
                <span
                  ref={measureRef}
                  style={{
                    position: 'absolute',
                    visibility: 'hidden',
                    whiteSpace: 'pre',
                    font: '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    padding: 0,
                    margin: 0,
                  }}
                />
                <input 
                  ref={inputRef}
                  type="text" 
                  className="widget-input" 
                  placeholder={isTypingInInput ? '' : "Stil et spørgsmål..."} 
                  value={inputValue}
                  readOnly 
                  style={{ 
                    paddingLeft: conversation.some(msg => msg.type === 'image') ? '82px' : '46px',
                    paddingRight: isTypingInInput ? '20px' : undefined 
                  }}
                />
                {isTypingInInput && (
                  <span 
                    className="input-cursor"
                    style={{
                      position: 'absolute',
                      left: `${cursorPosition || (conversation.some(msg => msg.type === 'image') ? 82 : 46)}px`,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'inline-block',
                      width: '2px',
                      height: '16px',
                      background: '#374151',
                      animation: 'blink 1s infinite',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>
            </div>
            <button type="button" className="input-button send-button" aria-label="Send besked" style={{ background: `linear-gradient(135deg, ${accentColor}, ${darkerAccent})` }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m22 2-7 20-4-9-9-4Z"></path>
                <path d="M22 2 11 13"></path>
              </svg>
            </button>
          </div>
          <div className="powered-by">
            <img src="https://www.elva-agents.com/images/elva-logo-icon-grey.svg" alt="Elva" width="16" height="16" />
            <span>Drevet af <span style={{ opacity: 0.8, fontStyle: 'italic' }}>elva-solutions.com</span></span>
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
          border-radius: 20px;
          background: #ffffff;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 32px rgba(0, 0, 0, 0.1);
          border: none;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          height: 700px;
          max-height: calc(100vh - 100px);
        }

        .widget-header {
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: white;
          border-radius: 20px 20px 0 0;
        }

        .assistant-meta {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .assistant-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 18px;
          backdrop-filter: blur(10px);
          overflow: hidden;
        }

        .assistant-avatar img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 6px;
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
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #3FD128;
          border: 1px solid white;
          animation: pulse 2s infinite;
        }

        .widget-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .icon-button {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.15);
          color: inherit;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .icon-button:hover {
          background: rgba(255, 255, 255, 0.2);
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
          background: rgba(23, 91, 250, 0.1);
          color: #0f3cc8;
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
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: #ffffff;
          min-height: 280px;
          flex: 1;
          overflow-y: auto;
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

        .message-content-wrapper {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          width: 100%;
        }

        .message-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          font-size: 12px;
          font-weight: 600;
          color: white;
          overflow: hidden;
        }

        .message-avatar img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 4px;
        }

        .message-content {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .message-name-label {
          font-size: 12px;
          color: #374151;
          margin-bottom: 8px;
          font-weight: 500;
          opacity: 0.7;
        }

        .message-bubble {
          max-width: 320px;
          padding: 12px 4px 12px 16px;
          border-radius: 18px 18px 18px 4px;
          font-size: 14px;
          line-height: 1.5;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          word-wrap: break-word;
        }

        .message-bubble.assistant {
          background: #f3f4f6;
          color: #374151;
        }

        .message-bubble.user {
          color: white;
          border-radius: 18px 18px 4px 18px;
          border: none;
          padding: 12px 16px;
          max-width: 80%;
          box-shadow: 0 2px 8px rgba(23, 91, 250, 0.3);
        }

        .message-bubble.typing {
          width: fit-content;
          min-width: 64px;
          display: flex;
          justify-content: center;
          padding: 12px 16px;
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
          background: #6b7280;
          opacity: 0.6;
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: 0.12s;
        }

        .typing-indicator span:nth-child(3) {
          animation-delay: 0.24s;
        }

        .message-bubble.products {
          background: #ffffff;
          border: 1px solid rgba(23, 91, 250, 0.08);
          border-radius: 18px;
          padding: 18px 18px 16px;
        }

        .products-heading {
          font-size: 14px;
          font-weight: 600;
          color: #0f3cc8;
          margin-bottom: 12px;
        }

        .product-grid {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding: 8px 0;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e0 transparent;
        }

        .product-grid::-webkit-scrollbar {
          height: 6px;
        }

        .product-grid::-webkit-scrollbar-track {
          background: transparent;
        }

        .product-grid::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 3px;
        }

        .product-card {
          display: flex;
          flex-direction: column;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
          text-decoration: none;
          color: inherit;
          min-width: 175px;
          max-width: 175px;
          width: 175px;
          flex-shrink: 0;
          opacity: 0;
          transform: translateY(10px);
        }

        .product-card.product-card-visible {
          opacity: 1;
          transform: translateY(0);
          animation: productCardFadeIn 0.4s ease-out forwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .product-card {
            opacity: 1;
            transform: none;
            animation: none;
          }
        }

        .product-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .product-image {
          width: 100%;
          height: 180px;
          object-fit: cover;
          background: #f3f4f6;
        }

        .product-image-placeholder {
          width: 100%;
          height: 180px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          font-size: 14px;
        }

        .product-info {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .product-name {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .product-price {
          font-size: 16px;
          font-weight: 700;
          margin-top: 4px;
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
          flex-direction: column;
          border-top: 1px solid #e5e7eb;
          background: #ffffff;
        }

        .input-container {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          background: #ffffff;
        }

        .input-field-wrapper {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
          background: #ffffff;
          border: 2px solid #e5e7eb;
          border-radius: 28px;
          overflow: hidden;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .widget-input {
          width: 100%;
          height: 50px;
          padding: 0 16px 0 46px;
          border: none;
          font-size: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          outline: none;
          background: transparent;
          color: #374151;
          letter-spacing: 0;
        }

        .input-button {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          transition: all 0.2s ease;
          border-radius: 8px;
        }

        .input-button.voice-button {
          position: absolute;
          left: 12px;
          z-index: 2;
        }

        .input-button.image-upload-button {
          position: absolute;
          left: 46px;
          z-index: 3;
          color: #6b7280;
        }

        .input-button.image-upload-button:hover {
          background-color: rgba(107, 114, 128, 0.1);
          color: #374151;
        }

        .input-button.send-button {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          color: white;
          box-shadow: 0 4px 12px rgba(23, 91, 250, 0.3);
          transition: all 0.2s ease;
        }

        .input-button.send-button:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(23, 91, 250, 0.4);
        }

        .powered-by {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0px 20px 8px 16px;
          font-size: 11px;
          color: #374151;
          opacity: 0.6;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .powered-by img {
          width: 16px;
          height: 16px;
          opacity: 0.8;
          flex-shrink: 0;
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

        @keyframes blink {
          0%, 50% {
            opacity: 1;
          }
          51%, 100% {
            opacity: 0;
          }
        }

        @keyframes productCardFadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .typewriter-cursor {
          display: inline-block;
          width: 2px;
          height: 16px;
          background: #374151;
          margin-left: 2px;
          animation: blink 1s infinite;
          vertical-align: middle;
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



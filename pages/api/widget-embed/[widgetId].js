import clientPromise from '../../../lib/mongodb.js';
import { ObjectId } from 'mongodb';
import { getConsentManagerCode } from '../../../lib/consent-banner.js';

export default async function handler(req, res) {
  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-elva-consent-analytics, x-elva-consent-functional');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Cache control - allow caching but revalidate
  res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate'); // 5 minutes cache
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { widgetId } = req.query;

    if (!widgetId) {
      return res.status(400).json({ error: 'Widget ID is required' });
    }

    // Try to get widget from database
    let widget;
    try {
      const client = await clientPromise;
      const db = client.db('elva-agents');
      
      // Convert string ID to ObjectId if it's a valid ObjectId string
      let queryId = widgetId;
      if (ObjectId.isValid(widgetId)) {
        queryId = new ObjectId(widgetId);
      }
      
      // First try to find in widgets collection
      widget = await db.collection('widgets').findOne({ _id: queryId });
      
      // If not found in widgets, try demos collection
      if (!widget) {
        widget = await db.collection('demos').findOne({ _id: widgetId });
        console.log('📝 Widget not found in widgets collection, checking demos collection...');
        if (widget) {
          console.log('📝 Found widget in demos collection:', widget.name);
        }
      }
    } catch (dbError) {
      console.log('Database error, using fallback widget data:', dbError.message);
      // Fallback to mock data if database fails
      widget = {
        _id: widgetId,
        name: 'Demo Widget',
        theme: {
          buttonColor: '#3b82f6',
          chatBg: '#ffffff'
        },
        messages: {
          welcomeMessage: 'Hello! How can I help you today?',
          inputPlaceholder: 'Type your message...',
          typingText: 'AI is thinking...',
          suggestedResponses: [
            'What can you help me with?',
            'Tell me more about your services',
            'How do I get started?',
            'Contact support'
          ]
        },
        branding: {
          title: 'AI Assistant',
          assistantName: 'Assistant'
        },
        openai: {
          promptId: 'demo-prompt',
          version: 'latest'
        }
      };
    }

    if (!widget) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    // Check if widget should be blocked due to quota
    let isBlocked = false;
    let blockReason = '';
    if (widget.organizationId) {
      try {
        const organization = await db.collection('organizations').findOne({
          _id: new ObjectId(widget.organizationId)
        });
        
        if (organization) {
          const { shouldBlockWidget } = await import('../../../lib/quota.js');
          const blockCheck = shouldBlockWidget(organization);
          isBlocked = blockCheck.blocked;
          blockReason = blockCheck.message || blockCheck.reason || '';
        }
      } catch (quotaError) {
        console.error('Error checking quota:', quotaError);
        // Don't block on error
      }
    }

    // DEBUG: Log widget settings
    console.log('🔍 Widget Settings Debug:', {
      widgetId: widget._id,
      isBlocked: isBlocked,
      blockReason: blockReason,
      hasSettings: !!widget.settings,
      settings: widget.settings,
      imageUpload: widget.settings?.imageUpload,
      imageupload: widget.settings?.imageupload
    });

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/javascript');
    
    // Smart caching based on environment and widget update time
    const isDevelopment = false; // Always production in widget
    const cacheTime = isDevelopment ? 10 : 30; // 10 seconds in dev, 30 seconds in production (reduced for testing)
    
    // Use ETag based on widget's updatedAt timestamp + settings for better cache invalidation
    const settingsHash = widget.settings ? JSON.stringify(widget.settings).length : 0;
    const etag = `"${widget.updatedAt ? new Date(widget.updatedAt).getTime() : Date.now()}-${settingsHash}"`;
    res.setHeader('ETag', etag);
    
    // Check if client has cached version
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }
    
    res.setHeader('Cache-Control', `public, max-age=${cacheTime}, must-revalidate`);

    // Debug log for widget configuration (disabled in production)

    // Auto-detect if this should use Responses API or legacy
    const useResponsesAPI = widget.openai?.promptId && widget.openai?.promptId !== 'demo-prompt';
    
    // Generate the widget JavaScript with embedded configuration
    const widgetScript = `
(function() {
  const WIDGET_CONFIG = ${JSON.stringify({
    widgetId: widgetId,
    name: widget.name || 'AI Assistant',
    isBlocked: isBlocked,
    blockReason: blockReason,
    theme: {
      buttonColor: widget.appearance?.themeColor || widget.theme?.buttonColor || '#4f46e5',
      chatBg: widget.appearance?.chatBg || widget.theme?.chatBg || '#ffffff',
      width: widget.appearance?.width || widget.theme?.width || 450,
      height: widget.appearance?.height || widget.theme?.height || 700,
      borderRadius: widget.appearance?.borderRadius || widget.theme?.borderRadius || 20,
      shadow: widget.appearance?.shadow || widget.theme?.shadow || '0 20px 60px rgba(0,0,0,0.15)',
      backdropBlur: widget.appearance?.backdropBlur || widget.theme?.backdropBlur || false,
      themeMode: widget.appearance?.theme || 'light' // light, dark, auto
    },
    messages: {
      welcomeMessage: widget.messages?.welcomeMessage || 'Hello! How can I help you today?',
      popupMessage: widget.messages?.popupMessage || 'Hi! Need help?',
      typingText: widget.messages?.typingText || 'AI is thinking...',
      showTypingText: widget.messages?.showTypingText !== false,
      inputPlaceholder: widget.messages?.inputPlaceholder || 'Type your message...',
      suggestedResponses: widget.messages?.suggestedResponses || [],
      bannerText: widget.messages?.bannerText || null,
      disclaimerText: widget.messages?.disclaimerText || 'Opgiv ikke personlige oplysninger',
      voiceInput: {
        enabled: widget.messages?.voiceInput?.enabled !== false,
        language: widget.messages?.voiceInput?.language || 'da-DK',
        buttonPosition: widget.messages?.voiceInput?.buttonPosition || 'left',
        continuousRecording: widget.messages?.voiceInput?.continuousRecording || false,
        autoSendOnComplete: widget.messages?.voiceInput?.autoSendOnComplete || false
      },
      productCards: {
        enabled: widget.messages?.productCards?.enabled !== false,
        layout: widget.messages?.productCards?.layout || 'horizontal',
        cardsPerRow: widget.messages?.productCards?.cardsPerRow || 3,
        showPrice: widget.messages?.productCards?.showPrice !== false,
        priceCurrency: widget.messages?.productCards?.priceCurrency || 'kr.',
        cardStyle: widget.messages?.productCards?.cardStyle || 'standard',
        autoFetchProductData: widget.messages?.productCards?.autoFetchProductData || false
      }
    },
    branding: {
      title: widget.branding?.title || widget.name || 'AI Assistant',
      assistantName: widget.branding?.assistantName || 'Assistant',
      companyName: widget.branding?.companyName || 'Company',
      showBranding: widget.branding?.showBranding !== undefined ? widget.branding.showBranding : true,
      avatarUrl: widget.branding?.avatarUrl || null,
      logoUrl: widget.branding?.logoUrl || null,
      widgetLogoUrl: widget.branding?.widgetLogoUrl || widget.branding?.customWidgetLogo || widget.branding?.companyLogo || widget.branding?.logoUrl || null,
      imageSettings: widget.branding?.imageSettings || null,
      iconSizes: widget.branding?.iconSizes || null
    },
    apiUrl: process.env.NEXT_PUBLIC_API_URL || process.env.NEXTAUTH_URL || 'https://elva-agents.vercel.app',
    apiType: useResponsesAPI ? 'responses' : 'legacy',
    openai: useResponsesAPI ? {
      promptId: widget.openai.promptId,
      version: widget.openai.version || 'latest'
    } : null,
    appearance: {
      placement: widget.appearance?.placement || 'bottom-right',
      theme: widget.appearance?.theme || 'light',
      useGradient: widget.appearance?.useGradient || false,
      secondaryColor: widget.appearance?.secondaryColor || null,
      onlineIndicatorColor: widget.appearance?.onlineIndicatorColor || '#3FD128'
    },
    satisfaction: {
      enabled: widget.satisfaction?.enabled !== false,
      triggerAfter: widget.satisfaction?.triggerAfter || 3,
      inactivityDelay: widget.satisfaction?.inactivityDelay || 30000, // 30 seconds
      promptText: widget.satisfaction?.promptText || 'How would you rate this conversation so far?',
      allowFeedback: widget.satisfaction?.allowFeedback === true,
      feedbackPlaceholder: widget.satisfaction?.feedbackPlaceholder || 'Optional feedback...',
      emojis: {
        1: '😡',
        2: '😞',
        3: '😐',
        4: '😊',
        5: '🤩'
      }
    },
    manualReview: {
      enabled: widget.manualReview?.enabled !== false,
      buttonText: widget.manualReview?.buttonText || 'Request Support',
      formTitle: widget.manualReview?.formTitle || 'Request Support',
      formDescription: widget.manualReview?.formDescription || 'Please provide your contact information and describe what you need help with. Our team will review your conversation and get back to you.',
      successMessage: widget.manualReview?.successMessage || 'Thank you for your request! Our team will review your conversation and contact you within 24 hours.'
    },
    settings: {
      imageUpload: {
        enabled: widget.settings?.imageUpload?.enabled || widget.settings?.imageupload?.enabled || widget.imageUpload?.enabled || widget.imageupload?.enabled || false,
        maxSizeMB: widget.settings?.imageUpload?.maxSizeMB || widget.settings?.imageupload?.maxSizeMB || widget.imageUpload?.maxSizeMB || widget.imageupload?.maxSizeMB || 5,
        allowedTypes: widget.settings?.imageUpload?.allowedTypes || widget.settings?.imageupload?.allowedTypes || widget.imageUpload?.allowedTypes || widget.imageupload?.allowedTypes || ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      }
    }
  })};

${getConsentManagerCode({ widgetId: widgetId, theme: widget.theme })}

  // Generate or retrieve user ID - RESPECTS GDPR CONSENT
  let userId = null;
  
  const consent = ElvaConsent.getConsent();
  if (consent && consent.functional) {
    // User has given consent for functional cookies
    userId = localStorage.getItem(\`chatUserId_\${WIDGET_CONFIG.widgetId}\`);
    if (!userId) {
      userId = \`user_\${Math.random().toString(36).substr(2, 9)}_\${Date.now()}\`;
      localStorage.setItem(\`chatUserId_\${WIDGET_CONFIG.widgetId}\`, userId);
    }
  } else {
    // No consent - use session-only identifier (not persisted)
    userId = \`session_\${Math.random().toString(36).substr(2, 9)}_\${Date.now()}\`;
  }
  
  // Current conversation ID - only from localStorage if consent given
  let currentConversationId = null;
  if (consent && consent.functional) {
    currentConversationId = localStorage.getItem(\`conversationId_\${WIDGET_CONFIG.widgetId}\`) || null;
  }
  
  // Store raw messages for history (before formatting)
  let currentConversationMessages = [];

  // Conversation history storage
  function saveConversationToHistory(conversationId, messages) {
    if (!conversationId || !messages || messages.length === 0) return;
    
    const historyKey = \`conversationHistory_\${WIDGET_CONFIG.widgetId}\`;
    let history = JSON.parse(localStorage.getItem(historyKey) || '[]');
    
    // Check if conversation already exists
    const existingIndex = history.findIndex(conv => conv.id === conversationId);
    const conversationData = {
      id: conversationId,
      title: generateConversationTitle(messages),
      messages: messages,
      timestamp: new Date().toISOString(),
      lastMessage: messages[messages.length - 1]?.content || 'No messages',
      messageCount: messages.length
    };
    
    if (existingIndex >= 0) {
      // Update existing conversation
      history[existingIndex] = conversationData;
    } else {
      // Add new conversation
      history.unshift(conversationData);
    }
    
    // Keep only last 20 conversations
    history = history.slice(0, 20);
    
    localStorage.setItem(historyKey, JSON.stringify(history));
  }
  
  function generateConversationTitle(messages) {
    if (!messages || messages.length === 0) return 'Ny samtale';
    
    // Find first user message
    const firstUserMessage = messages.find(msg => msg.role === 'user');
    if (firstUserMessage) {
      // Clean the content to remove any branding prefixes
      let cleanContent = firstUserMessage.content.replace(/^ECottonshoppen Ai-Kundeservice/, '').trim();
      const title = cleanContent.substring(0, 50);
      return title.length < cleanContent.length ? title + '...' : title;
    }
    
    return 'Ny samtale';
  }
  
  function getConversationHistory() {
    const historyKey = \`conversationHistory_\${WIDGET_CONFIG.widgetId}\`;
    return JSON.parse(localStorage.getItem(historyKey) || '[]');
  }

  // Helper function to adjust color brightness
  function adjustColor(color, amount) {
    const usePound = color[0] === '#';
    const col = usePound ? color.slice(1) : color;
    const num = parseInt(col, 16);
    let r = (num >> 16) + amount;
    let g = (num >> 8 & 0x00FF) + amount;
    let b = (num & 0x0000FF) + amount;
    r = r > 255 ? 255 : r < 0 ? 0 : r;
    g = g > 255 ? 255 : g < 0 ? 0 : g;
    b = b > 255 ? 255 : b < 0 ? 0 : b;
    return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
  }

  // Helper function to get theme colors based on theme mode
  function getThemeColors() {
    const themeMode = WIDGET_CONFIG.theme.themeMode || 'light';
    
    if (themeMode === 'dark') {
      return {
        chatBg: '#1f2937', // gray-800
        inputBg: '#1f2937', // same as chatBg
        messageBg: '#1A1C23', // gray-600
        textColor: '#f9fafb', // gray-50
        borderColor: '#1A1C23', // gray-600
        buttonColor: WIDGET_CONFIG.theme.buttonColor || '#4f46e5'
      };
    } else if (themeMode === 'auto') {
      // Detect system preference
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        return {
          chatBg: '#1f2937',
          inputBg: '#1f2937', // same as chatBg
          messageBg: '#4b5563',
          textColor: '#f9fafb',
          borderColor: '#4b5563',
          buttonColor: WIDGET_CONFIG.theme.buttonColor || '#4f46e5'
        };
      } else {
        return {
          chatBg: '#ffffff',
          inputBg: '#ffffff', // same as chatBg
          messageBg: '#f3f4f6',
          textColor: '#374151',
          borderColor: '#e5e7eb',
          buttonColor: WIDGET_CONFIG.theme.buttonColor || '#4f46e5'
        };
      }
    } else {
      // Light theme (default)
      return {
        chatBg: '#ffffff',
        inputBg: '#ffffff', // same as chatBg
        messageBg: '#f3f4f6',
        textColor: '#374151',
        borderColor: '#e5e7eb',
        buttonColor: WIDGET_CONFIG.theme.buttonColor || '#4f46e5'
      };
    }
  }

  const themeColors = getThemeColors();

  // Track widget minimized state (defined early to avoid initialization errors)
  let widgetIsMinimized = true;

  // Helper function to generate smart AI icon based on widget name
  function generateAIIcon(widgetName, brandingTitle) {
    // Use branding title if available, otherwise use widget name
    const name = brandingTitle || widgetName || 'AI';
    
    // Extract first letter or initials
    if (name.includes(' ')) {
      // Multiple words - use initials
      const words = name.split(' ').filter(word => word.length > 0);
      if (words.length >= 2) {
        return words[0][0].toUpperCase() + words[1][0].toUpperCase();
      }
    }
    
    // Single word or fallback - use first letter
    return name[0]?.toUpperCase() || 'A';
  }

  // Helper function to generate chat bubble icon without online indicator
  function generateChatBubbleIcon() {
    return \`
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-circle transition-transform duration-300" style="width: 32px; height: 32px;">
        <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"></path>
      </svg>
    \`;
  }

  // Helper function to generate chevron down icon for open state
  function generateChevronIcon() {
    return \`
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down transition-transform duration-300" style="width: 32px; height: 32px;">
        <path d="m6 9 6 6 6-6"></path>
      </svg>
    \`;
  }

  // Helper function to generate widget content (logo or chat bubble)
  function generateWidgetContent(isMinimized = null, forceIcon = false) {
    // Use global state if no parameter provided
    const shouldShowMinimized = isMinimized !== null ? isMinimized : widgetIsMinimized;
    
    // Debug logging (disabled in production)
    
    // If forceIcon is true, always show the chat bubble (for open state)
    if (forceIcon) {
      console.log('🔵 Forcing default chat bubble icon');
      return generateChatBubbleIcon();
    }
    
    // Check for any available logo URL (prioritize widgetLogoUrl, then fallback to others)
    const logoUrl = WIDGET_CONFIG.branding?.widgetLogoUrl || 
                   WIDGET_CONFIG.branding?.customWidgetLogo || 
                   WIDGET_CONFIG.branding?.companyLogo || 
                   WIDGET_CONFIG.branding?.logoUrl;
    
    // console.log('🎯 Logo Decision Logic:', {
    //   shouldShowMinimized,
    //   logoUrl,
    //   hasLogoUrl: !!logoUrl,
    //   willShowLogo: shouldShowMinimized && logoUrl
    // });
    
    if (shouldShowMinimized && logoUrl) {
      // Show custom logo when minimized - use same size as chat bubble icon (32x32px)
      // console.log('🖼️ Using custom logo:', logoUrl);
      
      return \`
        <img src="\${logoUrl}" 
             alt="Widget Logo" 
             class="widget-logo"
             style="width: 32px; height: 32px; object-fit: contain; transition: all 0.3s ease;" 
             onerror="console.error('Failed to load widget logo:', this.src); this.style.display='none';" 
             onload="" />
      \`;
    } else {
      // Show chat bubble icon with consistent sizing
      console.log('🔵 Using default chat bubble icon - shouldShowMinimized:', shouldShowMinimized, 'logoUrl:', logoUrl);
      return generateChatBubbleIcon();
    }
  }

  // Create chat button with modern design matching LivePreview
  const chatBtn = document.createElement("button");
  chatBtn.innerHTML = generateWidgetContent(true); // Start minimized
  chatBtn.style.cssText = \`
    position: fixed;
    \${WIDGET_CONFIG.appearance?.placement === 'bottom-left' ? 'bottom: 24px; left: 24px;' : 
      WIDGET_CONFIG.appearance?.placement === 'top-right' ? 'top: 24px; right: 24px;' :
      WIDGET_CONFIG.appearance?.placement === 'top-left' ? 'top: 24px; left: 24px;' :
      'bottom: 24px; right: 24px;'}
    width: \${WIDGET_CONFIG.branding?.iconSizes?.chatButton || 60}px;
    height: \${WIDGET_CONFIG.branding?.iconSizes?.chatButton || 60}px;
    border-radius: 50%;
    background: \${WIDGET_CONFIG.appearance?.useGradient ? 
      \`linear-gradient(135deg, \${WIDGET_CONFIG.theme.buttonColor || '#4f46e5'} 0%, \${WIDGET_CONFIG.appearance?.secondaryColor || adjustColor(WIDGET_CONFIG.theme.buttonColor || '#4f46e5', -20)} 100%)\` : 
      WIDGET_CONFIG.theme.buttonColor || '#4f46e5'};
    color: white;
    border: none;
    cursor: pointer;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.1);
    transition: all 0.3s ease, transform 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    backdrop-filter: blur(10px);
  \`;
  
  chatBtn.onmouseover = () => {
    chatBtn.style.transform = 'scale(1.05)';
    chatBtn.style.boxShadow = '0 12px 35px rgba(79, 70, 229, 0.4)';
  };
  
  chatBtn.onmouseout = () => {
    chatBtn.style.transform = 'scale(1)';
    chatBtn.style.boxShadow = '0 8px 25px rgba(79, 70, 229, 0.3)';
  };
  
  document.body.appendChild(chatBtn);

  // Create online indicator as separate element
  const onlineIndicator = document.createElement("div");
  onlineIndicator.className = 'online-indicator';
  onlineIndicator.style.cssText = \`
    position: fixed;
    \${WIDGET_CONFIG.appearance?.placement === 'bottom-left' ? 'bottom: 64px; left: 56px;' : 
      WIDGET_CONFIG.appearance?.placement === 'top-right' ? 'top: 14px; right: 22px;' :
      WIDGET_CONFIG.appearance?.placement === 'top-left' ? 'top: 14px; left: 56px;' :
      'bottom: 64px; right: 22px;'}
    width: 14px;
    height: 14px;
    background: \${WIDGET_CONFIG.appearance.onlineIndicatorColor};
    border: 1px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    z-index: 10001;
    display: block;
  \`;
  
  document.body.appendChild(onlineIndicator);

  // Create popup message (initially hidden)
  const popupMessage = document.createElement("div");
  popupMessage.style.cssText = \`
    position: fixed;
    \${WIDGET_CONFIG.appearance?.placement === 'bottom-left' ? 'bottom: 100px; left: 24px;' : 
      WIDGET_CONFIG.appearance?.placement === 'top-right' ? 'top: 100px; right: 24px;' :
      WIDGET_CONFIG.appearance?.placement === 'top-left' ? 'top: 100px; left: 24px;' :
      'bottom: 100px; right: 24px;'}
    max-width: 280px;
    background: \${themeColors.chatBg};
    border-radius: 16px;
    padding: 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.1);
    border: 1px solid \${themeColors.borderColor};
    z-index: 10001;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    color: \${themeColors.textColor};
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.3s ease;
    pointer-events: none;
  \`;
  
  document.body.appendChild(popupMessage);

  // Create chat box with modern design matching LivePreview
  const chatBox = document.createElement("div");
  chatBox.className = 'mobile-chat-box mobile-scroll';
  chatBox.style.cssText = \`
    display: none;
    position: fixed;
    \${WIDGET_CONFIG.appearance?.placement === 'bottom-left' ? 'bottom: 80px; left: 24px;' : 
      WIDGET_CONFIG.appearance?.placement === 'top-right' ? 'top: 80px; right: 24px;' :
      WIDGET_CONFIG.appearance?.placement === 'top-left' ? 'top: 80px; left: 24px;' :
      'bottom: 80px; right: 24px;'}
    width: \${WIDGET_CONFIG.theme.width || 450}px;
    height: \${WIDGET_CONFIG.theme.height || 700}px;
    max-height: calc(100vh - 180px);
    background: \${themeColors.chatBg};
    border-radius: \${WIDGET_CONFIG.theme.borderRadius || 20}px;
    flex-direction: column;
    z-index: 10000;
    box-shadow: \${WIDGET_CONFIG.theme.shadow || '0 20px 60px rgba(0,0,0,0.15), 0 8px 32px rgba(0,0,0,0.1)'};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    backdrop-filter: \${WIDGET_CONFIG.theme.backdropBlur ? 'blur(20px)' : 'none'};
    overflow: visible;
    transition: all 0.3s ease;
    will-change: transform, opacity;
  \`;

  // Create header matching LivePreview structure
  const header = document.createElement("div");
  header.style.cssText = \`
    background: linear-gradient(135deg, \${WIDGET_CONFIG.theme.buttonColor || '#4f46e5'}, \${adjustColor(WIDGET_CONFIG.theme.buttonColor || '#4f46e5', -20)});
    color: white;
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-radius: \${WIDGET_CONFIG.theme.borderRadius || 20}px \${WIDGET_CONFIG.theme.borderRadius || 20}px 0 0;
    position: relative;
    overflow: visible;
  \`;
  header.innerHTML = \`
    <div style="display: flex; align-items: center; gap: 12px; position: relative; z-index: 10;">
      <div style="width: \${WIDGET_CONFIG.branding?.iconSizes?.headerAvatar || 40}px; height: \${WIDGET_CONFIG.branding?.iconSizes?.headerAvatar || 40}px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; backdrop-filter: blur(10px); overflow: hidden;">
        \${WIDGET_CONFIG.branding?.avatarUrl ? 
          \`<img src="\${WIDGET_CONFIG.branding.avatarUrl}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; transform: scale(\${WIDGET_CONFIG.branding?.imageSettings?.avatarZoom || 1}) translate(\${WIDGET_CONFIG.branding?.imageSettings?.avatarOffsetX || 0}px, \${WIDGET_CONFIG.branding?.imageSettings?.avatarOffsetY || 0}px); transform-origin: center center;" />\` : 
          generateAIIcon(WIDGET_CONFIG.name, WIDGET_CONFIG.branding?.title)
        }
      </div>
      <div>
        <div style="font-weight: 600; font-size: 16px;">\${WIDGET_CONFIG.branding.assistantName || WIDGET_CONFIG.branding.title || 'AI Assistant'}</div>
        <div style="font-size: 12px; opacity: 0.9; display: flex; align-items: center; gap: 6px;">
          <div style="width: 6px; height: 6px; background: \${WIDGET_CONFIG.appearance.onlineIndicatorColor}; border-radius: 50%; animation: pulse 2s infinite;"></div>
          Tilgængelig nu
        </div>
      </div>
    </div>
    
    <div style="display: flex; align-items: center; gap: 8px; position: relative; z-index: 10;">
      <div style="position: relative;">
        <button id="menuBtn_\${WIDGET_CONFIG.widgetId}" style="background: none; border: none; color: white; font-size: 16px; cursor: pointer; padding: 6px; border-radius: 50%; transition: all 0.2s ease;" onmouseover="this.style.backgroundColor='rgba(255,255,255,0.15)'" onmouseout="this.style.backgroundColor='transparent'">
          <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
        
        <!-- Dropdown Menu -->
         <div id="menuDropdown_\${WIDGET_CONFIG.widgetId}" style="
           position: absolute;
           top: 100%;
           right: 0;
           background: \${themeColors.chatBg};
           border-radius: 12px;
           box-shadow: 0 8px 32px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.1);
           border: 1px solid \${themeColors.borderColor};
           min-width: 200px;
           z-index: 10002;
           opacity: 0;
           visibility: hidden;
           transform: translateY(-10px);
           transition: all 0.2s ease;
           margin-top: 8px;
         ">
          <div style="padding: 8px 0;">
            <button class="menu-option" data-action="new-conversation" style="
              width: 100%;
              padding: 12px 4px 12px 16px;
              background: none;
              border: none;
              text-align: left;
              font-size: 14px;
              color: \${themeColors.textColor};
              cursor: pointer;
              transition: all 0.2s ease;
              display: flex;
              align-items: center;
              gap: 12px;
            " onmouseover="this.style.backgroundColor='\${themeColors.messageBg}'" onmouseout="this.style.backgroundColor='transparent'">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Ny samtale
            </button>
            <button class="menu-option" data-action="view-conversations" style="
              width: 100%;
              padding: 12px 4px 12px 16px;
              background: none;
              border: none;
              text-align: left;
              font-size: 14px;
              color: \${themeColors.textColor};
              cursor: pointer;
              transition: all 0.2s ease;
              display: flex;
              align-items: center;
              gap: 12px;
            " onmouseover="this.style.backgroundColor='\${themeColors.messageBg}'" onmouseout="this.style.backgroundColor='transparent'">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Tidligere samtaler
            </button>
          </div>
        </div>
      </div>
      
      <button id="closeBtn_\${WIDGET_CONFIG.widgetId}" style="background: none; border: none; color: white; font-size: 16px; cursor: pointer; padding: 6px; border-radius: 50%; transition: all 0.2s ease;" onmouseover="this.style.backgroundColor='rgba(255,255,255,0.15)'" onmouseout="this.style.backgroundColor='transparent'">
        <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  \`;

  // Create messages container matching LivePreview
  const messages = document.createElement("div");
  messages.style.cssText = \`
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    background: \${themeColors.chatBg};
    scrollbar-width: thin;
    scrollbar-color: #cbd5e0 transparent;
    height: calc(100% - 200px);
  \`;

    // Create input container matching LivePreview
    const inputContainer = document.createElement("div");
    inputContainer.style.cssText = \`
      background: \${themeColors.inputBg};
      border-radius: 0 0 \${WIDGET_CONFIG.theme.borderRadius || 20}px \${WIDGET_CONFIG.theme.borderRadius || 20}px;
    \`;

  const inputWrapper = document.createElement("div");
  inputWrapper.style.cssText = \`
    padding: 10px;
    display: flex;
    gap: 8px;
    align-items: center;
  \`;

  // Create input container with integrated buttons
  const inputContainerInner = document.createElement("div");
  inputContainerInner.style.cssText = \`
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
    background: \${themeColors.inputBg};
    border: 2px solid \${themeColors.borderColor};
    border-radius: 28px;
    overflow: hidden;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  \`;

  // Support request button (right side)
  const manualReviewButton = document.createElement("button");
  manualReviewButton.className = 'manual-review-button';
  manualReviewButton.innerHTML = \`
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
      <polyline points="22,6 12,13 2,6"></polyline>
    </svg>
  \`;
  manualReviewButton.style.cssText = \`
    width: 44px;
    height: 50px;
    background: transparent;
    color: \${themeColors.textColor};
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    opacity: 0.5;
    border-radius: 12px;
    margin-right: 4px;
  \`;
  manualReviewButton.addEventListener('mouseenter', () => {
    manualReviewButton.style.opacity = '1';
    manualReviewButton.style.backgroundColor = \`\${WIDGET_CONFIG.theme.buttonColor || '#4f46e5'}15\`;
    manualReviewButton.style.transform = 'scale(1.1)';
  });
  manualReviewButton.addEventListener('mouseleave', () => {
    manualReviewButton.style.opacity = '0.5';
    manualReviewButton.style.backgroundColor = 'transparent';
    manualReviewButton.style.transform = 'scale(1)';
  });

  // Create input wrapper for label animation
  const inputFieldWrapper = document.createElement("div");
  inputFieldWrapper.style.cssText = \`
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
  \`;

  // VOICE BUTTON - Placeret INDE i input feltet til venstre
  const voiceButton = document.createElement("button");
  voiceButton.className = "widget-voice-button";
  voiceButton.setAttribute('aria-label', 'Voice input');
  voiceButton.innerHTML = \`
    <svg class="mic-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
    <svg class="recording-icon" style="display:none" width="18" height="18" viewBox="0 0 24 24" fill="red">
      <circle cx="12" cy="12" r="8"/>
    </svg>
  \`;
  voiceButton.style.cssText = \`
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;
    transition: all 0.2s ease;
    z-index: 2;
    border-radius: 4px;
  \`;

  // INPUT FIELD - Med padding til venstre for mikrofon
  const input = document.createElement("input");
  input.type = "text";
  input.className = "widget-input";
  input.id = "widget-input-field";
  input.style.cssText = \`
    width: 100%;
    height: 50px;
    padding: 0 16px 0 \${WIDGET_CONFIG.messages.voiceInput.enabled ? '46px' : '16px'};
    border: none;
    font-size: 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    outline: none;
    background: transparent;
    color: \${themeColors.textColor};
    transition: all 0.2s ease;
    box-sizing: border-box;
  \`;

  // LABEL - Justeret for mikrofon ikon
  const inputLabel = document.createElement("label");
  inputLabel.htmlFor = "widget-input-field";
  inputLabel.textContent = WIDGET_CONFIG.messages.inputPlaceholder || "Stil et spørgsmål";
  inputLabel.style.cssText = \`
    position: absolute;
    left: \${WIDGET_CONFIG.messages.voiceInput.enabled ? '46px' : '16px'};
    top: 50%;
    transform: translateY(-50%);
    font-size: 16px;
    color: \${themeColors.textColor};
    opacity: 0.6;
    pointer-events: none;
    transition: all 0.3s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  \`;

  // Disable input if widget is blocked
  if (WIDGET_CONFIG.isBlocked) {
    input.disabled = true;
    input.style.opacity = '0.5';
    input.style.cursor = 'not-allowed';
    inputLabel.textContent = WIDGET_CONFIG.blockReason || 'Chat deaktiveret';
    inputLabel.style.opacity = '0.8';
  }

  // Tilføj elementer i korrekt rækkefølge
  if (WIDGET_CONFIG.messages.voiceInput.enabled) {
    inputFieldWrapper.appendChild(voiceButton);
  }
  inputFieldWrapper.appendChild(input);
  inputFieldWrapper.appendChild(inputLabel);

  // IMAGE UPLOAD IMPLEMENTATION
  let imageUploadButton = null;
  let currentImageAttachment = null;
  const fileInput = document.createElement('input');

  console.log('🖼️ Image Upload Check:', {
    enabled: WIDGET_CONFIG.settings?.imageUpload?.enabled,
    hasSettings: !!WIDGET_CONFIG.settings,
    hasImageUpload: !!WIDGET_CONFIG.settings?.imageUpload,
    fullSettings: WIDGET_CONFIG.settings
  });

  if (WIDGET_CONFIG.settings?.imageUpload?.enabled) {
    // Create hidden file input
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    
    // Create image upload button
    imageUploadButton = document.createElement('button');
    imageUploadButton.type = 'button';
    imageUploadButton.className = 'elva-image-upload-btn';
    imageUploadButton.innerHTML = \`
      <svg class="image-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
        <circle cx="9" cy="9" r="2"/>
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
      </svg>
    \`;
    imageUploadButton.style.cssText = \`
      position: absolute;
      left: \${WIDGET_CONFIG.messages.voiceInput.enabled ? '46px' : '16px'};
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      color: #6b7280;
      cursor: pointer;
      padding: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      z-index: 10;
    \`;
    
    // Update input padding to make room for image button
    const leftPadding = WIDGET_CONFIG.messages.voiceInput.enabled ? '76px' : '46px';
    input.style.paddingLeft = leftPadding;
    inputLabel.style.left = leftPadding;
    
    imageUploadButton.onclick = () => fileInput.click();
    
    // Hover effects with rounded corners
    imageUploadButton.onmouseover = () => {
      imageUploadButton.style.backgroundColor = 'rgba(107, 114, 128, 0.1)';
      imageUploadButton.style.transform = 'translateY(-50%) scale(1.05)';
      imageUploadButton.style.borderRadius = '8px';
    };
    
    imageUploadButton.onmouseout = () => {
      imageUploadButton.style.backgroundColor = 'transparent';
      imageUploadButton.style.transform = 'translateY(-50%) scale(1)';
      imageUploadButton.style.borderRadius = '8px';
    };
    // Handle file selection
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('Billedet skal være mindre end 5MB');
        return;
      }
      
      // Show loading state
      const originalHTML = imageUploadButton.innerHTML;
      imageUploadButton.innerHTML = '⏳';
      imageUploadButton.style.color = '#4f46e5';
      
      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('image', file);
      formData.append('widgetId', WIDGET_CONFIG.widgetId);
      
      try {
        const response = await fetch(\`\${WIDGET_CONFIG.apiUrl}/api/upload-image\`, {
          method: 'POST',
          body: formData
        });
        
        console.log('📤 Upload response:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url
        });
        
        if (!response.ok) {
          let errorMessage = \`Upload fejlede: \${response.status} \${response.statusText}\`;
          try {
            const errorData = await response.json();
            if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (parseError) {
            // If response is not JSON, use status text
            console.error('Upload failed - non-JSON response:', await response.text());
          }
          alert(errorMessage);
          return;
        }
        
        const data = await response.json();
        console.log('📤 Upload data:', data);
        
        if (data.success) {
          currentImageAttachment = data.url;
          showImagePreview(data.url, file.name);
        } else {
          alert(\`Upload fejlede: \${data.error || 'Ukendt fejl'}\`);
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert(\`Upload fejlede: \${error.message}\`);
      } finally {
        // Restore button
        imageUploadButton.innerHTML = originalHTML;
        imageUploadButton.style.color = '#6b7280';
      }
      
      // Reset file input
      fileInput.value = '';
    });
    
    inputFieldWrapper.appendChild(imageUploadButton);
    inputFieldWrapper.appendChild(fileInput);
  }

  // Image preview helper function
  function showImagePreview(url, filename) {
    // Remove existing preview if any
    const existingPreview = inputContainer.querySelector('.elva-image-preview');
    if (existingPreview) {
      existingPreview.remove();
    }
    
    const preview = document.createElement('div');
    preview.className = 'elva-image-preview';
    preview.style.cssText = \`
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: #f3f4f6;
      border-radius: 8px;
      margin-bottom: 8px;
    \`;
    
    const removeButton = document.createElement('button');
    removeButton.textContent = '×';
    removeButton.style.cssText = \`
      background: none;
      border: none;
      cursor: pointer;
      color: #ef4444;
      font-size: 20px;
      font-weight: bold;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    \`;
    removeButton.onclick = () => {
      preview.remove();
      currentImageAttachment = null;
    };
    
    preview.innerHTML = \`
      <img src="\${url}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;" />
      <span style="font-size: 12px; color: #6b7280; flex: 1;">\${filename}</span>
    \`;
    preview.appendChild(removeButton);
    
    inputContainer.insertBefore(preview, inputWrapper);
  }

  const sendButton = document.createElement("button");
  sendButton.innerHTML = \`
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z"></path>
      <path d="M22 2 11 13"></path>
    </svg>
  \`;
  sendButton.style.cssText = \`
    width: \${WIDGET_CONFIG.branding?.iconSizes?.sendButton || 44}px;
    height: \${WIDGET_CONFIG.branding?.iconSizes?.sendButton || 44}px;
    background: \${WIDGET_CONFIG.theme.buttonColor || '#4f46e5'};
    color: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
  \`;

  // Disable send button if widget is blocked
  if (WIDGET_CONFIG.isBlocked) {
    sendButton.disabled = true;
    sendButton.style.opacity = '0.5';
    sendButton.style.cursor = 'not-allowed';
  }

  // Add focus effects for input container and label animation
  const updateLabelPosition = () => {
    if (input.value || document.activeElement === input) {
      inputLabel.style.top = '4px';
      inputLabel.style.fontSize = '11px';
      inputLabel.style.transform = 'translateY(0)';
      inputLabel.style.opacity = '0.8';
    } else {
      inputLabel.style.top = '50%';
      inputLabel.style.fontSize = '16px';
      inputLabel.style.transform = 'translateY(-50%)';
      inputLabel.style.opacity = '0.6';
    }
  };

  input.onfocus = () => {
    inputContainerInner.style.borderColor = WIDGET_CONFIG.theme.buttonColor || '#4f46e5';
    inputContainerInner.style.boxShadow = \`0 0 0 3px \${WIDGET_CONFIG.theme.buttonColor || '#4f46e5'}20, 0 4px 12px rgba(0, 0, 0, 0.12)\`;
    updateLabelPosition();
  };
  
  input.onblur = () => {
    inputContainerInner.style.borderColor = themeColors.borderColor;
    inputContainerInner.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
    updateLabelPosition();
  };

  input.oninput = () => {
    updateLabelPosition();
  };

  // VOICE INPUT IMPLEMENTATION
  let recognition = null;
  let isRecording = false;

  // Initialize Speech Recognition if voice input is enabled
  if (WIDGET_CONFIG.messages.voiceInput.enabled) {
    // Check browser support
    const hasVoiceSupport = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    
    if (hasVoiceSupport) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      
      recognition.continuous = WIDGET_CONFIG.messages.voiceInput.continuousRecording;
      recognition.interimResults = true;
      recognition.lang = WIDGET_CONFIG.messages.voiceInput.language;
      
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        input.value = transcript;
        updateLabelPosition();
      };
      
      recognition.onend = () => {
        if (WIDGET_CONFIG.messages.voiceInput.autoSendOnComplete && input.value.trim()) {
          sendMessage();
        }
        isRecording = false;
        updateVoiceButtonState();
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        isRecording = false;
        updateVoiceButtonState();
        
        // Show user-friendly error message
        if (event.error === 'not-allowed') {
          alert('Mikrofon tilladelse er nødvendig for voice input. Tillad adgang i dine browser indstillinger.');
        } else if (event.error === 'no-speech') {
          console.log('No speech detected');
        }
      };
    } else {
      // Hide voice button if not supported
      voiceButton.style.display = 'none';
      // Adjust input padding back to normal
      input.style.padding = '0 16px';
      inputLabel.style.left = '16px';
    }
  }

  // Voice button state management
  function updateVoiceButtonState() {
    const micIcon = voiceButton.querySelector('.mic-icon');
    const recordingIcon = voiceButton.querySelector('.recording-icon');
    
    if (isRecording) {
      micIcon.style.display = 'none';
      recordingIcon.style.display = 'block';
      voiceButton.style.color = '#ef4444';
      voiceButton.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
    } else {
      micIcon.style.display = 'block';
      recordingIcon.style.display = 'none';
      voiceButton.style.color = '#6b7280';
      voiceButton.style.backgroundColor = 'transparent';
    }
  }

  // Voice button event handlers
  if (WIDGET_CONFIG.messages.voiceInput.enabled && recognition) {
    voiceButton.onclick = () => {
      if (!recognition) {
        alert('Voice input is not supported in your browser');
        return;
      }
      
      if (isRecording) {
        recognition.stop();
      } else {
        try {
          recognition.start();
          isRecording = true;
          updateVoiceButtonState();
        } catch (error) {
          console.error('Failed to start speech recognition:', error);
          alert('Kunne ikke starte voice input. Prøv igen.');
        }
      }
    };

    // Hover effects for voice button - make the corners more round
    voiceButton.style.borderRadius = '8px'; // Make the corners more round by default
    voiceButton.onmouseover = () => {
      if (!isRecording) {
        voiceButton.style.backgroundColor = 'rgba(107, 114, 128, 0.1)';
        voiceButton.style.transform = 'translateY(-50%) scale(1.05)';
        voiceButton.style.borderRadius = '8px'; // Even rounder on hover
      }
    };
    
    voiceButton.onmouseout = () => {
      if (!isRecording) {
        voiceButton.style.backgroundColor = 'transparent';
        voiceButton.style.transform = 'translateY(-50%) scale(1)';
        voiceButton.style.borderRadius = '8px'; // Return to normal roundness
      }
    };
  }

  sendButton.onmouseover = () => {
    sendButton.style.transform = 'scale(1.05)';
    sendButton.style.boxShadow = '0 6px 16px rgba(79, 70, 229, 0.4)';
  };
  
  sendButton.onmouseout = () => {
    sendButton.style.transform = 'scale(1)';
    sendButton.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)';
  };

  // Assemble input container inner
  inputContainerInner.appendChild(inputFieldWrapper);
  inputContainerInner.appendChild(manualReviewButton);
  
  inputWrapper.appendChild(inputContainerInner);
  inputWrapper.appendChild(sendButton);
  inputContainer.appendChild(inputWrapper);
  // Create powered by text
  const poweredBy = document.createElement("div");
  poweredBy.style.cssText = \`
    text-align: center;
    padding: 0px 20px 8px 16px;
    font-size: 11px;
    color: \${themeColors.textColor};
    opacity: 0.6;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  \`;
  poweredBy.innerHTML = \`Drevet af <a href="https://elva-solutions.com" target="_blank" style="color: \${themeColors.textColor}; text-decoration: none; opacity: 0.8; font-style: italic;">elva-solutions.com</a>\`;
  // Create banner (if bannerText is provided)
  let banner = null;
  if (WIDGET_CONFIG.messages.bannerText) {
    banner = document.createElement("div");
    banner.style.cssText = \`
      padding: 8px 16px;
      background: \${themeColors.messageBg};
      border-bottom: 1px solid \${themeColors.borderColor};
      font-size: 12px;
      color: \${themeColors.textColor};
      opacity: 0.8;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      text-align: center;
      line-height: 1.4;
    \`;
    banner.textContent = WIDGET_CONFIG.messages.bannerText;
  }
  
  chatBox.appendChild(header);
  if (banner) {
    chatBox.appendChild(banner);
  }
  chatBox.appendChild(messages);
  chatBox.appendChild(inputContainer);
  chatBox.appendChild(poweredBy);
  
  document.body.appendChild(chatBox);

  // Create conversation history view
  const historyView = document.createElement("div");
  historyView.className = 'mobile-chat-box mobile-scroll';
  historyView.style.cssText = \`
    display: none;
    position: fixed;
    \${WIDGET_CONFIG.appearance?.placement === 'bottom-left' ? 'bottom: 80px; left: 24px;' : 
      WIDGET_CONFIG.appearance?.placement === 'top-right' ? 'top: 80px; right: 24px;' :
      WIDGET_CONFIG.appearance?.placement === 'top-left' ? 'top: 80px; left: 24px;' :
      'bottom: 80px; right: 24px;'}
    width: \${WIDGET_CONFIG.theme.width || 450}px;
    height: \${WIDGET_CONFIG.theme.height || 700}px;
    max-height: calc(100vh - 180px);
    background: \${themeColors.chatBg};
    border-radius: \${WIDGET_CONFIG.theme.borderRadius || 20}px;
    flex-direction: column;
    z-index: 10000;
    box-shadow: \${WIDGET_CONFIG.theme.shadow || '0 20px 60px rgba(0,0,0,0.15), 0 8px 32px rgba(0,0,0,0.1)'};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    backdrop-filter: \${WIDGET_CONFIG.theme.backdropBlur ? 'blur(20px)' : 'none'};
    overflow: hidden;
    transition: all 0.3s ease;
    will-change: transform, opacity;
  \`;

  // Create history header
  const historyHeader = document.createElement("div");
  historyHeader.style.cssText = \`
    background: linear-gradient(135deg, \${WIDGET_CONFIG.theme.buttonColor || '#4f46e5'}, \${adjustColor(WIDGET_CONFIG.theme.buttonColor || '#4f46e5', -20)});
    color: white;
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-radius: \${WIDGET_CONFIG.theme.borderRadius || 20}px \${WIDGET_CONFIG.theme.borderRadius || 20}px 0 0;
    position: relative;
    overflow: hidden;
  \`;
  historyHeader.innerHTML = \`
    <div style="display: flex; align-items: center; gap: 12px;">
      <button id="backBtn_\${WIDGET_CONFIG.widgetId}" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer; padding: 4px; border-radius: 50%; transition: all 0.2s ease;" onmouseover="this.style.backgroundColor='rgba(255,255,255,0.1)'" onmouseout="this.style.backgroundColor='transparent'">
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div style="font-weight: 600; font-size: 16px;">Tidligere samtaler</div>
    </div>
    
    <button id="closeHistoryBtn_\${WIDGET_CONFIG.widgetId}" style="background: none; border: none; color: white; font-size: 16px; cursor: pointer; padding: 4px; border-radius: 50%; transition: all 0.2s ease;" onmouseover="this.style.backgroundColor='rgba(255,255,255,0.1)'" onmouseout="this.style.backgroundColor='transparent'">
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  \`;

  // Create history content
  const historyContent = document.createElement("div");
  historyContent.style.cssText = \`
    flex: 1;
    overflow-y: auto;
    padding: 0;
    background: \${themeColors.chatBg};
    scrollbar-width: thin;
    scrollbar-color: #cbd5e0 transparent;
  \`;

  // Create powered by text for history view
  const historyPoweredBy = document.createElement("div");
  historyPoweredBy.style.cssText = \`
    text-align: center;
    padding: 8px 16px;
    font-size: 11px;
    color: \${themeColors.textColor};
    opacity: 0.6;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  \`;
  historyPoweredBy.innerHTML = \`Drevet af <a href="https://elva-solutions.com" target="_blank" style="color: \${themeColors.textColor}; text-decoration: none; opacity: 0.8;">elva-solutions.com</a>\`;

  historyView.appendChild(historyHeader);
  historyView.appendChild(historyContent);
  historyView.appendChild(historyPoweredBy);
  document.body.appendChild(historyView);

  // Track chat state to prevent popup conflicts
  let chatIsOpen = false;
  let historyIsOpen = false;
  let popupDismissed = false; // Track if user has dismissed the popup

  // Control online indicator visibility based on chat state and device type
  function updateOnlineIndicatorVisibility() {
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile && chatIsOpen) {
      // Hide on mobile when chat is open to prevent covering send button
      onlineIndicator.style.display = 'none';
    } else {
      // Show in all other cases (desktop always, mobile when chat is closed)
      onlineIndicator.style.display = 'block';
    }
  }

  // Function to animate icon change with support for both SVG and images
  function animateIconChange(newIconHTML) {
    // console.log('🔄 animateIconChange called with:', newIconHTML.substring(0, 100) + '...');
    const currentIcon = chatBtn.querySelector('svg, img');
    if (!currentIcon) {
      console.log('❌ No current icon found in chatBtn');
      return;
    }
    // console.log('📱 Current icon type:', currentIcon.tagName, 'Current icon src:', currentIcon.src || 'SVG');
    
    // Create new icon element
    const newIcon = document.createElement('div');
    newIcon.innerHTML = newIconHTML;
    const newElement = newIcon.querySelector('svg, img');
    
    if (!newElement) return;
    
    // Set initial styles for animation
    if (newElement.tagName === 'SVG') {
      newElement.style.cssText = \`
        width: 32px;
        height: 32px;
        position: absolute;
        opacity: 0;
        transform: rotate(-90deg) scale(0.8);
        transition: all 0.3s ease;
      \`;
    } else {
      // For images - use consistent 32x32px size
      newElement.style.cssText = \`
        width: 32px;
        height: 32px;
        object-fit: contain;
        position: absolute;
        opacity: 0;
        transform: scale(0.8);
        transition: all 0.3s ease;
      \`;
    }
    
    // Add new icon to button
    chatBtn.appendChild(newElement);
    
    // Animate out current icon
    currentIcon.style.transition = 'all 0.3s ease';
    currentIcon.style.opacity = '0';
    if (currentIcon.tagName === 'SVG') {
      currentIcon.style.transform = 'rotate(90deg) scale(0.8)';
    } else {
      currentIcon.style.transform = 'scale(0.8)';
    }
    
    // Animate in new icon
    setTimeout(() => {
      newElement.style.opacity = '1';
      if (newElement.tagName === 'SVG') {
        newElement.style.transform = 'rotate(0deg) scale(1)';
      } else {
        newElement.style.transform = 'scale(1)';
      }
    }, 50);
    
    // Clean up old icon
    setTimeout(() => {
      if (currentIcon.parentNode) {
        currentIcon.parentNode.removeChild(currentIcon);
      }
    }, 300);
  }
  
  // Show initial popup message after a short delay (only if chat is closed and not dismissed)
  setTimeout(() => {
    if (!chatIsOpen && !popupDismissed) {
      showPopup();
    }
  }, 2000);

  // Close button functionality
  document.getElementById(\`closeBtn_\${WIDGET_CONFIG.widgetId}\`).onclick = () => {
    // Animate icon back to minimized state (logo or chat bubble)
    widgetIsMinimized = true;
    animateIconChange(generateWidgetContent());
    
    chatBox.style.display = "none";
    chatIsOpen = false; // Update state
    // Show popup after closing chat (only if not dismissed)
    setTimeout(() => {
      if (!popupDismissed) {
        showPopup();
      }
    }, 500);
  };

  // History view button functionality
  document.getElementById(\`backBtn_\${WIDGET_CONFIG.widgetId}\`).onclick = () => {
    hideHistoryView();
  };

  document.getElementById(\`closeHistoryBtn_\${WIDGET_CONFIG.widgetId}\`).onclick = () => {
    // Animate icon back to minimized state (logo or chat bubble)
    widgetIsMinimized = true;
    animateIconChange(generateWidgetContent());
    
    historyView.style.display = "none";
    historyIsOpen = false;
    // Show popup after closing history (only if not dismissed)
    setTimeout(() => {
      if (!popupDismissed) {
        showPopup();
      }
    }, 500);
  };

  // Three-dots menu functionality
  const menuBtn = document.getElementById(\`menuBtn_\${WIDGET_CONFIG.widgetId}\`);
  const menuDropdown = document.getElementById(\`menuDropdown_\${WIDGET_CONFIG.widgetId}\`);
  let isMenuOpen = false;

  // Toggle menu dropdown
  menuBtn.onclick = (e) => {
    e.stopPropagation();
    isMenuOpen = !isMenuOpen;
    
    if (isMenuOpen) {
      menuDropdown.style.opacity = '1';
      menuDropdown.style.visibility = 'visible';
      menuDropdown.style.transform = 'translateY(0)';
    } else {
      menuDropdown.style.opacity = '0';
      menuDropdown.style.visibility = 'hidden';
      menuDropdown.style.transform = 'translateY(-10px)';
    }
  };

  // Handle menu option clicks
  const menuOptions = menuDropdown.querySelectorAll('.menu-option');
  menuOptions.forEach(option => {
    option.onclick = (e) => {
      e.stopPropagation();
      const action = option.getAttribute('data-action');
      
      // Close menu
      isMenuOpen = false;
      menuDropdown.style.opacity = '0';
      menuDropdown.style.visibility = 'hidden';
      menuDropdown.style.transform = 'translateY(-10px)';
      
      // Handle menu actions
      if (action === 'new-conversation') {
        handleNewConversation();
      } else if (action === 'view-conversations') {
        handleViewConversations();
      }
    };
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (isMenuOpen && !menuBtn.contains(e.target) && !menuDropdown.contains(e.target)) {
      isMenuOpen = false;
      menuDropdown.style.opacity = '0';
      menuDropdown.style.visibility = 'hidden';
      menuDropdown.style.transform = 'translateY(-10px)';
    }
  });

  // Menu action handlers
  function handleNewConversation() {
    // Clear current conversation
    currentConversationId = null;
    localStorage.removeItem(\`conversationId_\${WIDGET_CONFIG.widgetId}\`);
    
    // Clear messages
    messages.innerHTML = '';
    
    // Clear conversation messages array
    currentConversationMessages = [];
    
    // Clear input
    input.value = '';
    
    // Reset satisfaction rating state for new conversation
    console.log('🔄 Resetting satisfaction rating state for new conversation');
    satisfactionRatingShown = false;
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      inactivityTimer = null;
      console.log('⏰ Cleared inactivity timer for new conversation');
    }
    
    // Reset manual review form state for new conversation
    manualReviewFormOpen = false;
    if (inputDebounceTimer) {
      clearTimeout(inputDebounceTimer);
      inputDebounceTimer = null;
      console.log('⏰ Cleared input debounce timer for new conversation');
    }
    
    // Show welcome message
    setTimeout(() => {
      showWelcomeMessage();
    }, 100);
    
    // Optional: Show notification
    showNotification('New conversation started');
  }

  function handleViewConversations() {
    showHistoryView();
  }

  function showHistoryView() {
    // Hide chat view
    chatBox.style.display = 'none';
    chatIsOpen = false;
    
    // Show history view
    historyView.style.display = 'flex';
    historyIsOpen = true;
    updatePositioning(); // Update positioning when opening history
    
    // Animate icon to chevron down when history is open
    animateIconChange(\`
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down transition-transform duration-300" style="width: 27.5px; height: 27.5px;">
        <path d="m6 9 6 6 6-6"></path>
      </svg>
    \`);
    
    // Load and display conversation history
    loadConversationHistory();
  }

  function hideHistoryView() {
    historyView.style.display = 'none';
    historyIsOpen = false;
    
    // Show chat view
    chatBox.style.display = 'flex';
    chatIsOpen = true;
    updatePositioning(); // Update positioning when returning to chat
    
    // Keep chevron down icon when chat is open (no animation needed as it's the same icon)
    // No need to animate since we're already showing chevron down
  }

  function loadConversationHistory() {
    const history = getConversationHistory();
    historyContent.innerHTML = '';
    
    if (history.length === 0) {
      // Show empty state
      const emptyState = document.createElement('div');
      emptyState.style.cssText = \`
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 40px 20px;
        text-align: center;
        color: \${themeColors.textColor};
        opacity: 0.7;
      \`;
      emptyState.innerHTML = \`
        <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">💬</div>
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Ingen tidligere samtaler</div>
        <div style="font-size: 14px;">Start en samtale for at se den her</div>
      \`;
      historyContent.appendChild(emptyState);
      return;
    }
    
    // Create conversation list
    history.forEach((conversation, index) => {
      const conversationItem = createConversationItem(conversation, index);
      historyContent.appendChild(conversationItem);
    });
  }

  function createConversationItem(conversation, index) {
    const item = document.createElement('div');
    item.style.cssText = \`
      padding: 16px 20px;
      border-bottom: 1px solid #f3f4f6;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 12px;
    \`;
    
    // Format date
    const date = new Date(conversation.timestamp);
    const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    const dateStr = daysAgo === 0 ? 'I dag' : daysAgo === 1 ? 'I går' : \`\${daysAgo}d\`;
    
    // Format display date
    const displayDate = date.toLocaleDateString('da-DK', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    
    item.innerHTML = \`
      <div style="
        width: 40px;
        height: 40px;
        background: \${WIDGET_CONFIG.theme.buttonColor || '#4f46e5'};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 12px;
        font-weight: 600;
        flex-shrink: 0;
      ">\${dateStr}</div>
      
      <div style="flex: 1; min-width: 0;">
        <div style="
          font-size: 14px;
          font-weight: 500;
          color: \${themeColors.textColor};
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        ">\${conversation.title}</div>
        <div style="
          font-size: 12px;
          color: \${themeColors.textColor};
          opacity: 0.7;
        ">\${displayDate} • \${conversation.messageCount} beskeder</div>
      </div>
      
      <div style="display: flex; align-items: center; gap: 8px;">
        <button class="delete-conversation-btn" data-conversation-id="\${conversation.id}" style="
          background: none;
          border: none;
          color: #ef4444;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
        " onmouseover="this.style.backgroundColor='#fef2f2'; this.style.color='#dc2626'" onmouseout="this.style.backgroundColor='transparent'; this.style.color='#ef4444'">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        
        <div style="
          color: #9ca3af;
          font-size: 16px;
          flex-shrink: 0;
        ">></div>
      </div>
    \`;
    
    // Add hover effects
    item.onmouseover = () => {
      item.style.backgroundColor = themeColors.messageBg;
    };
    
    item.onmouseout = () => {
      item.style.backgroundColor = 'transparent';
    };
    
    // Handle click to load conversation
    item.onclick = () => {
      loadConversation(conversation);
    };
    
    // Add delete button event handler
    const deleteBtn = item.querySelector('.delete-conversation-btn');
    deleteBtn.onclick = (event) => {
      deleteConversation(conversation.id, event);
    };
    
    return item;
  }

  function loadConversation(conversation) {
    // Set current conversation ID
    currentConversationId = conversation.id;
    localStorage.setItem(\`conversationId_\${WIDGET_CONFIG.widgetId}\`, currentConversationId);
    
    // Clear current messages
    messages.innerHTML = '';
    
    // Clear conversation messages array
    currentConversationMessages = [];
    
    // Remove any existing suggested responses
    const existingResponses = inputContainer.querySelector('.suggested-responses');
    if (existingResponses) {
      inputContainer.removeChild(existingResponses);
    }
    
    // Load conversation messages
    conversation.messages.forEach(msg => {
      // Clean the content to remove any branding prefixes
      let cleanContent = msg.content;
      if (msg.role === 'assistant') {
        cleanContent = msg.content.replace(/^ECottonshoppen Ai-Kundeservice/, '').trim();
      }
      
      addMessage(msg.role, cleanContent, msg.imageUrl || null);
    });
    
    // Hide history view and show chat
    hideHistoryView();
    
    // Show notification
    showNotification('Samtale indlæst');
  }

  function deleteConversation(conversationId, event) {
    // Prevent event bubbling to avoid loading the conversation
    event.stopPropagation();
    
    // Show confirmation dialog
    const confirmed = confirm('Er du sikker på, at du vil slette denne samtale?');
    if (!confirmed) return;
    
    // Get current history
    const historyKey = \`conversationHistory_\${WIDGET_CONFIG.widgetId}\`;
    let history = JSON.parse(localStorage.getItem(historyKey) || '[]');
    
    // Remove the conversation
    history = history.filter(conv => conv.id !== conversationId);
    
    // Save updated history
    localStorage.setItem(historyKey, JSON.stringify(history));
    
    // If this was the current conversation, clear it
    if (currentConversationId === conversationId) {
      currentConversationId = null;
      localStorage.removeItem(\`conversationId_\${WIDGET_CONFIG.widgetId}\`);
      messages.innerHTML = '';
    }
    
    // Reload the history view
    loadConversationHistory();
    
    // Show notification
    showNotification('Samtale slettet');
  }

  function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = \`
      position: fixed;
      top: 20px;
      right: 20px;
      background: \${WIDGET_CONFIG.theme.buttonColor || '#4f46e5'};
      color: white;
      padding: 12px 4px 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 10003;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      opacity: 0;
      transform: translateY(-20px);
      transition: all 0.3s ease;
    \`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    requestAnimationFrame(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateY(0)';
    });
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(-20px)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  // Popup message functions
  function showPopup() {
    // Don't show popup if chat is open or if user has dismissed it
    if (chatIsOpen || popupDismissed) return;
    
    if (WIDGET_CONFIG.messages?.popupMessage) {
      popupMessage.innerHTML = \`
        <button id="popupCloseBtn_\${WIDGET_CONFIG.widgetId}" style="position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; border: none; background: none; color: #6b7280; cursor: pointer; font-size: 18px; line-height: 1; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s ease;">×</button>
        <div style="padding-right: 24px;">\${WIDGET_CONFIG.messages.popupMessage}</div>
      \`;
      popupMessage.style.opacity = '1';
      popupMessage.style.transform = 'translateY(0)';
      popupMessage.style.pointerEvents = 'auto';
      
      // Add event listener to close button
      const closeBtn = document.getElementById(\`popupCloseBtn_\${WIDGET_CONFIG.widgetId}\`);
      if (closeBtn) {
        closeBtn.onmouseover = () => {
          closeBtn.style.backgroundColor = '#f3f4f6';
          closeBtn.style.color = '#374151';
        };
        closeBtn.onmouseout = () => {
          closeBtn.style.backgroundColor = 'transparent';
          closeBtn.style.color = '#6b7280';
        };
        closeBtn.onclick = () => {
          hidePopup();
        };
      }
    }
  }
  
  function hidePopup() {
    popupMessage.style.opacity = '0';
    popupMessage.style.transform = 'translateY(20px)';
    popupMessage.style.pointerEvents = 'none';
    popupDismissed = true; // Mark popup as dismissed by user
  }
  
  // Make hidePopup globally accessible
  window.hidePopup = hidePopup;

  // Toggle chat box visibility with smooth animations
  chatBtn.onclick = () => {
    const isChatVisible = chatBox.style.display === "flex";
    const isHistoryVisible = historyView.style.display === "flex";

    if (isChatVisible || isHistoryVisible) {
      // Hide animation
      if (isChatVisible) {
        chatBox.style.transform = 'scale(0.95) translateY(10px)';
        chatBox.style.opacity = '0';
      }
      if (isHistoryVisible) {
        historyView.style.transform = 'scale(0.95) translateY(10px)';
        historyView.style.opacity = '0';
      }
      
      widgetIsMinimized = true;
      chatIsOpen = false;
      historyIsOpen = false;
      
      // Update online indicator visibility when chat closes
      updateOnlineIndicatorVisibility();
      
      // Animate icon back to minimized state (logo or chat bubble)
      animateIconChange(generateWidgetContent());
      
      setTimeout(() => {
        chatBox.style.display = "none";
        historyView.style.display = "none";
        // Show popup after hiding (only if not dismissed)
        setTimeout(() => {
          if (!popupDismissed) {
            showPopup();
          }
        }, 500);
      }, 300);
    } else {
      // Hide popup when opening chat
      hidePopup();
      widgetIsMinimized = false;
      chatIsOpen = true; // Update state

      // Update online indicator visibility when chat opens
      updateOnlineIndicatorVisibility();

      // Animate icon to chevron down (open state)
      animateIconChange(generateChevronIcon());

      // Show animation
      chatBox.style.display = "flex";
      updatePositioning(); // Update positioning when opening
      requestAnimationFrame(() => {
        chatBox.style.transform = 'scale(1) translateY(0)';
        chatBox.style.opacity = '1';
      });

      // Only show welcome message if there are no messages AND no suggested responses
      const hasMessages = messages.children.length > 0;
      const hasSuggestedResponses = inputContainer.querySelector('.suggested-responses');
      
      if (!hasMessages && !hasSuggestedResponses) {
        setTimeout(() => {
          showWelcomeMessage();
        }, 300);
      }
    }
  };

  function showTypingIndicatorForWelcome(callback) {
    // Create typing indicator for welcome message
    const typingDiv = document.createElement("div");
    typingDiv.style.cssText = \`
      margin-bottom: 16px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      animation: slideIn 0.3s ease-out;
    \`;
    
    // Create timestamp for typing indicator
    const timestamp = document.createElement("div");
    const now = new Date();
    const timeString = now.toLocaleTimeString('da-DK', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
    timestamp.textContent = timeString;
    timestamp.style.cssText = \`
      font-size: 10px;
      color: \${themeColors.textColor};
      opacity: 0.5;
      margin: 6px 8px 4px 44px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    \`;
    
    // Create message content container
    const messageContentDiv = document.createElement("div");
    messageContentDiv.style.cssText = \`
      display: flex;
      justify-content: flex-start;
      width: 100%;
    \`;
    
    const typingContainer = document.createElement("div");
    typingContainer.style.cssText = \`
      display: flex;
      align-items: flex-start;
      gap: 12px;
    \`;
    
    const typingAvatar = document.createElement("div");
    typingAvatar.style.cssText = \`
      width: \${WIDGET_CONFIG.branding?.iconSizes?.messageAvatar || 32}px;
      height: \${WIDGET_CONFIG.branding?.iconSizes?.messageAvatar || 32}px;
      background: \${WIDGET_CONFIG.theme.buttonColor || '#4f46e5'};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    \`;
    typingAvatar.innerHTML = WIDGET_CONFIG.branding?.avatarUrl ? 
      \`<img src="\${WIDGET_CONFIG.branding.avatarUrl}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; transform: scale(\${WIDGET_CONFIG.branding?.imageSettings?.avatarZoom || 1}) translate(\${WIDGET_CONFIG.branding?.imageSettings?.avatarOffsetX || 0}px, \${WIDGET_CONFIG.branding?.imageSettings?.avatarOffsetY || 0}px); transform-origin: center center;" />\` : 
      \`<span style="color: white; font-size: 12px; font-weight: 600;">\${generateAIIcon(WIDGET_CONFIG.name, WIDGET_CONFIG.branding?.title)}</span>\`;
    
    const typingContent = document.createElement("div");
    typingContent.style.cssText = \`
      display: flex;
      flex-direction: column;
    \`;
    
    const typingNameLabel = document.createElement("div");
    typingNameLabel.style.cssText = \`
      font-size: 12px;
      color: \${themeColors.textColor};
      margin-bottom: 8px;
      font-weight: 500;
      opacity: 0.7;
    \`;
    typingNameLabel.textContent = WIDGET_CONFIG.branding.assistantName || WIDGET_CONFIG.branding.title || 'AI Assistant';
    
    const typingBubble = document.createElement("div");
    const showTypingText = WIDGET_CONFIG.messages?.showTypingText !== false;
    const typingText = WIDGET_CONFIG.messages?.typingText || 'AI is thinking...';
    
    typingBubble.style.cssText = \`
      background: \${themeColors.messageBg};
      color: \${themeColors.textColor};
      padding: 12px \${showTypingText ? '16px' : '12px'} 12px 16px;
      border-radius: 18px 18px 18px 4px;
      font-size: 14px;
      max-width: \${showTypingText ? '320px' : 'fit-content'};
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border: 1px solid \${themeColors.borderColor};
      display: flex;
      align-items: center;
      width: fit-content;
    \`;
    
    typingBubble.innerHTML = \`
      <div style="display: flex; align-items: center; gap: 0; width: fit-content;">
        <div style="width: 6px; height: 6px; background: \${themeColors.textColor}; opacity: 0.6; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; animation-delay: -0.32s; margin-right: 4px;"></div>
        <div style="width: 6px; height: 6px; background: \${themeColors.textColor}; opacity: 0.6; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; animation-delay: -0.16s; margin-right: 4px;"></div>
        <div style="width: 6px; height: 6px; background: \${themeColors.textColor}; opacity: 0.6; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; margin-right: \${showTypingText ? '8px' : '0'};"></div>
        \${showTypingText ? \`<span style="font-weight: 500; margin: 0; padding: 0; display: inline-block;">\${typingText}</span>\` : ''}
      </div>
    \`;
    
    typingContent.appendChild(typingNameLabel);
    typingContent.appendChild(typingBubble);
    typingContainer.appendChild(typingAvatar);
    typingContainer.appendChild(typingContent);
    messageContentDiv.appendChild(typingContainer);
    
    typingDiv.appendChild(messageContentDiv);
    typingDiv.appendChild(timestamp);
    
    messages.appendChild(typingDiv);
    messages.scrollTop = messages.scrollHeight;
    
    // Remove typing indicator after 1.5 seconds and call callback
    setTimeout(() => {
      if (typingDiv.parentNode) {
        messages.removeChild(typingDiv);
      }
      callback();
    }, 1500);
  }

  function showWelcomeMessage() {
    // Check if welcome message already exists
    const existingWelcome = messages.querySelector('.messageBubble');
    if (existingWelcome) return; // Welcome message already exists
    
    const welcomeMsg = WIDGET_CONFIG.messages?.welcomeMessage || 'Hello! How can I help you today?';
    
    // Show typing indicator first, then typewriter effect
    showTypingIndicatorForWelcome(() => {
      addMessageWithTypewriter('assistant', welcomeMsg);
      
      // Show suggested responses after typewriter effect completes
      setTimeout(() => {
        if (WIDGET_CONFIG.messages?.suggestedResponses?.length > 0) {
          showSuggestedResponses();
        } else {
          // Show disclaimer even if no suggested responses
          showDisclaimer();
        }
      }, welcomeMsg.length * 5 + 500); // Wait for typewriter to finish
    });
  }

  function showDisclaimer() {
    // Remove any existing disclaimer
    const existingDisclaimer = inputContainer.querySelector('.disclaimer-text');
    if (existingDisclaimer) {
      inputContainer.removeChild(existingDisclaimer);
    }
    
    // Create disclaimer text
    const disclaimer = document.createElement("div");
    disclaimer.className = 'disclaimer-text';
    disclaimer.style.cssText = \`
      padding: 8px 16px;
      font-size: 10px;
      color: \${themeColors.textColor};
      opacity: 0.5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      text-align: center;
      font-style: italic;
      width: 100%;
    \`;
    disclaimer.textContent = WIDGET_CONFIG.messages.disclaimerText;
    
    // Add to input container above input field
    inputContainer.insertBefore(disclaimer, inputWrapper);
  }

  function showSuggestedResponses() {
    const suggestedResponses = WIDGET_CONFIG.messages?.suggestedResponses || [];
    const validResponses = suggestedResponses.filter(response => response && response.trim());
    if (validResponses.length === 0) return;
    
    // Remove any existing suggested responses and disclaimer first (they are in inputContainer)
    const existingResponses = inputContainer.querySelector('.suggested-responses');
    if (existingResponses) {
      inputContainer.removeChild(existingResponses);
    }
    const existingDisclaimer = inputContainer.querySelector('.disclaimer-text');
    if (existingDisclaimer) {
      inputContainer.removeChild(existingDisclaimer);
    }
    
    // Create suggested responses container
    const responsesContainer = document.createElement('div');
    responsesContainer.className = 'suggested-responses';
    responsesContainer.style.cssText = \`
      padding: 12px 16px 8px 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
    \`;
    
    validResponses.forEach((response, index) => {
      const button = document.createElement('button');
      button.textContent = response;
      button.style.cssText = \`
        padding: 6px 12px;
        font-size: 12px;
        color: \${themeColors.textColor};
        background: \${themeColors.messageBg};
        border: 1px solid \${themeColors.borderColor};
        border-radius: 9999px;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
      \`;
      
      button.onmouseover = () => {
        if (WIDGET_CONFIG.theme.themeMode === 'dark') {
          button.style.background = '#6b7280'; // gray-500 for dark mode hover
          button.style.borderColor = '#6b7280';
        } else {
          button.style.background = themeColors.borderColor;
          button.style.borderColor = themeColors.borderColor;
        }
      };
      
      button.onmouseout = () => {
        button.style.background = themeColors.messageBg;
        button.style.borderColor = themeColors.borderColor;
      };
      
      button.onclick = () => {
        input.value = response;
        sendMessage();
        // Remove suggested responses after clicking
        if (responsesContainer.parentNode) {
          responsesContainer.parentNode.removeChild(responsesContainer);
        }
      };
      
      responsesContainer.appendChild(button);
    });
    
    // Add to input container above input field
    inputContainer.insertBefore(responsesContainer, inputWrapper);
    
    // Create disclaimer text under suggested responses (outside responsesContainer for proper centering)
    const disclaimer = document.createElement("div");
    disclaimer.className = 'disclaimer-text';
    disclaimer.style.cssText = \`
      padding: 4px 0px 0px 0px;
      font-size: 10px;
      color: \${themeColors.textColor};
      opacity: 0.5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      text-align: center;
      font-style: italic;
      width: 100%;
    \`;
    disclaimer.textContent = WIDGET_CONFIG.messages.disclaimerText;
    
    // Add disclaimer after responsesContainer
    inputContainer.insertBefore(disclaimer, inputWrapper);
  }

  function formatMessage(content) {
    // Convert text to HTML with enhanced formatting
    let formatted = content;
    
    // Skip deduplication for now to ensure markdown links work properly
    // TODO: Implement smarter deduplication that doesn't break markdown links
    
    // Then, convert markdown-style links [text](url)
    formatted = formatted.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #4f46e5; text-decoration: underline;">$1</a>');
    
    // Convert email addresses to mailto links
    formatted = formatted.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})/g, '<a href="mailto:$1" style="color: #4f46e5; text-decoration: underline;">$1</a>');
    
    // Convert double line breaks to paragraph breaks for better readability
    formatted = formatted.replace(/\\n\\n+/g, '</p><p>');
    
    // Wrap content in paragraph tags
    formatted = '<p>' + formatted + '</p>';
    
    // Convert single line breaks to <br> (but not inside paragraphs)
    formatted = formatted.replace(/\\n/g, '<br>');
    
    // Clean up empty paragraphs
    formatted = formatted.replace(/<p><\\/p>/g, '');
    formatted = formatted.replace(/<p><br><\\/p>/g, '');
    
    // Convert bullet points (- item) to HTML list items
    formatted = formatted.replace(/^- (.+)$/gm, '<li>$1</li>');
    
    // Wrap consecutive list items in <ul> with better styling
    formatted = formatted.replace(/(<li>.*<\\/li>(\\s*<li>.*<\\/li>)*)/g, '<ul style="margin: 12px 0; padding-left: 24px; list-style-type: disc;">$1</ul>');
    
    // Convert numbered lists (1. item) to HTML ordered list
    formatted = formatted.replace(/^(\\d+)\\. (.+)$/gm, '<li>$2</li>');
    
    // Wrap numbered list items in <ol> with better styling
    formatted = formatted.replace(/(<li>.*<\\/li>(\\s*<li>.*<\\/li>)*)/g, '<ol style="margin: 12px 0; padding-left: 24px; list-style-type: decimal;">$1</ol>');
    
    // Convert bold text (**text** or __text__)
    formatted = formatted.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // Convert italic text (*text* or _text_)
    formatted = formatted.replace(/\\*(.*?)\\*/g, '<em>$1</em>');
    formatted = formatted.replace(/_(.*?)_/g, '<em>$1</em>');
    
    return formatted;
  }

  // PRODUCT CARDS PARSER AND RENDERING
  function parseProductCards(messageText) {
    const products = [];
    let cleanText = messageText;
    
    // Remove inline citations like ([cotonshoppen.dk](URL)) or (cotonshoppen.dk)
    cleanText = cleanText.replace(/\\s*\\(\\[?cotonshoppen\\.dk\\]?\\([^)]+\\)\\)/g, '');
    cleanText = cleanText.replace(/\\s*\\(cotonshoppen\\.dk\\)/g, '');
    
    // Find [PRODUCTS]...[/PRODUCTS] JSON blocks
    const productsJsonRegex = /\\[PRODUCTS\\]([\\s\\S]*?)\\[\\/PRODUCTS\\]/g;
    let match;
    
    while ((match = productsJsonRegex.exec(messageText)) !== null) {
      try {
        const jsonText = match[1].trim();
        if (!jsonText) continue;
        
        const productData = JSON.parse(jsonText);
        
        if (Array.isArray(productData)) {
          products.push(...productData);
        } else if (productData.url) {
          products.push(productData);
        }
        
        // Remove the JSON block from clean text
        cleanText = cleanText.replace(match[0], '');
      } catch (error) {
        console.error('Error parsing product cards JSON:', error);
        console.error('JSON text:', match[1]);
        // Still remove the block from clean text even if parsing fails
        cleanText = cleanText.replace(match[0], '');
      }
    }
    
    // Find single [PRODUCT:...] tags
    const productRegex = /\\[PRODUCT:url="([^"]+)"\\|image="([^"]+)"\\|name="([^"]+)"\\|price="([^"]+)"\\]/g;
    cleanText = cleanText.replace(productRegex, (match, url, image, name, price) => {
      products.push({
        url: url,
        image: image,
        name: name,
        price: price
      });
      return ''; // Remove the tag from clean text
    });
    
    // Find markdown links [text](url) from cotonshoppen.dk
    const linkRegex = /\\[([^\\]]+)\\]\\((https:\\/\\/cotonshoppen\\.dk\\/[^)]+)\\)/g;
    let linkMatch;
    
    while ((linkMatch = linkRegex.exec(messageText)) !== null) {
      const linkText = linkMatch[1];
      const url = linkMatch[2];
      
      // Mark for fetching metadata
      products.push({
        url: url,
        name: linkText,
        needsMetadata: true
      });
      
      // Replace the link with a clickable link (keep the product name clickable)
      cleanText = cleanText.replace(linkMatch[0], \`<a href="\${url}" target="_blank" style="color: \${WIDGET_CONFIG.theme.buttonColor || '#3b82f6'}; text-decoration: underline;">\${linkText}</a>\`);
    }
    
    // Deduplicate products by URL and normalize URLs
    const uniqueProducts = [];
    const seenUrls = new Set();
    
    for (const product of products) {
      // Normalize URL by removing query parameters and fragments for comparison
      const normalizedUrl = product.url.split('?')[0].split('#')[0];
      
      if (!seenUrls.has(normalizedUrl)) {
        seenUrls.add(normalizedUrl);
        uniqueProducts.push(product);
      }
    }
    
    return {
      cleanText: cleanText.trim(),
      products: uniqueProducts
    };
  }

  // Add fetch product metadata function
  async function fetchProductMetadata(url) {
    try {
      // Use platform API URL to work when embedded on customer sites
      const response = await fetch(
        \`\${WIDGET_CONFIG.apiUrl}/api/product-metadata\`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ url: url })
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle 404 gracefully - product doesn't exist
        if (response.status === 404) {
          console.warn('Product not found (404):', url);
          return null; // Return null instead of throwing
        }
        
        console.error('Failed to fetch product metadata:', response.status, url);
        return null;
      }
      
      const metadata = await response.json();
      return metadata;
    } catch (error) {
      console.error('Error fetching product metadata:', error.message);
      return null;
    }
  }

  function createProductCard(product) {
    const card = document.createElement('a');
    card.href = product.url;
    card.target = '_blank';
    card.className = 'product-card';
    card.style.cssText = \`
      display: flex;
      flex-direction: column;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: all 0.3s ease;
      text-decoration: none;
      color: inherit;
      min-width: 175px;
      max-width: 175px;
      width: 175px;
      margin: 4px;
      flex-shrink: 0;
    \`;
    
    // Product image - use proxy to avoid CORS issues
    const img = document.createElement('img');
    img.src = \`/api/image-proxy?url=\${encodeURIComponent(product.image)}\`;
    img.alt = product.name;
    img.style.cssText = \`
      width: 100%;
      height: 180px;
      object-fit: cover;
      background: #f3f4f6;
    \`;
    
    // Add error handling for image loading
    img.onerror = () => {
      console.error('Failed to load product image:', product.image);
      img.style.display = 'none';
      // Show placeholder instead
      const placeholder = document.createElement('div');
      placeholder.style.cssText = \`
        width: 100%;
        height: 180px;
        background: #f3f4f6;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #9ca3af;
        font-size: 14px;
      \`;
      placeholder.textContent = 'Billede ikke tilgængeligt';
      img.parentNode.replaceChild(placeholder, img);
    };
    
    img.onload = () => {
      // Image loaded successfully
    };
    
    // Product info
    const info = document.createElement('div');
    info.style.cssText = \`
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    \`;
    
    // Product name
    const name = document.createElement('div');
    name.textContent = product.name;
    name.style.cssText = \`
      font-size: 14px;
      font-weight: 600;
      color: #1f2937;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    \`;
    
    // Product price
    if (product.price && WIDGET_CONFIG.messages.productCards.showPrice) {
      const price = document.createElement('div');
      price.textContent = product.price;
      price.style.cssText = \`
        font-size: 16px;
        font-weight: 700;
        color: \${WIDGET_CONFIG.theme.buttonColor || '#3b82f6'};
        margin-top: 4px;
      \`;
      info.appendChild(name);
      info.appendChild(price);
    } else {
      info.appendChild(name);
    }
    
    card.appendChild(img);
    card.appendChild(info);
    
    // Simplified hover effect - only shadow change, no transform
    card.onmouseover = () => {
      card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    };
    
    card.onmouseout = () => {
      card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    };
    
    return card;
  }

  function createProductCardsContainer(products, layout) {
    if (layout === 'horizontal') {
      // Get widget width dynamically
      const widgetWidth = chatBox.offsetWidth || 450; // Fallback to 450px
      
      // Calculate optimal cards per view based on widget width
      const cardWidthPx = 175;
      const gap = 12;
      const arrowButtonSpace = 40; // Space for arrow button + padding
      const availableWidth = widgetWidth - arrowButtonSpace;
      const cardsPerView = Math.max(
        1,
        Math.floor((availableWidth + gap) / (cardWidthPx + gap))
      );
      const actualCardsPerView = Math.max(
        1,
        Math.min(cardsPerView, products.length)
      );
      
      // Create carousel wrapper
      const wrapper = document.createElement('div');
      wrapper.style.cssText = \`
        position: relative;
        margin-top: 8px;
        padding: 0 24px 0 0; /* Right padding for arrow button */
      \`;
      
      // Create carousel container with dynamic width
      const container = document.createElement('div');
      container.className = 'product-cards-carousel';
      container.style.cssText = \`
        display: flex;
        gap: 12px;
        overflow: hidden;
        padding: 8px 0;
        width: calc(\${cardWidthPx}px * \${actualCardsPerView} + \${gap}px * \${actualCardsPerView - 1});
        position: relative;
      \`;
      
      // Create inner container for smooth transform animation
      const innerContainer = document.createElement('div');
      innerContainer.style.cssText = \`
        display: flex;
        gap: 12px;
        transition: transform 0.3s ease-in-out;
        transform: translateX(0);
      \`;
      
      // Add products to inner container
      products.forEach(product => {
        innerContainer.appendChild(createProductCard(product));
      });
      
      container.appendChild(innerContainer);
      
      // Create navigation buttons
      const prevButton = document.createElement('button');
      prevButton.innerHTML = '‹';
      prevButton.style.cssText = \`
        position: absolute;
        left: -16px;
        top: 50%;
        transform: translateY(-50%);
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: none;
        background: white;
        color: #1f2937;
        font-size: 24px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        z-index: 10;
        transition: all 0.2s ease;
        opacity: 0.9;
      \`;
      
      const nextButton = document.createElement('button');
      nextButton.innerHTML = '›';
      nextButton.style.cssText = \`
        position: absolute;
        right: -8px;
        top: 50%;
        transform: translateY(-50%);
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: none;
        background: white;
        color: #1f2937;
        font-size: 24px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        z-index: 10;
        transition: all 0.2s ease;
        opacity: 0.9;
      \`;
      
      // Button hover effects
      prevButton.onmouseover = () => {
        prevButton.style.opacity = '1';
        prevButton.style.transform = 'translateY(-50%) scale(1.1)';
        prevButton.style.background = \`\${WIDGET_CONFIG.theme.buttonColor || '#3b82f6'}\`;
        prevButton.style.color = 'white';
      };
      prevButton.onmouseout = () => {
        prevButton.style.opacity = '0.9';
        prevButton.style.transform = 'translateY(-50%) scale(1)';
        prevButton.style.background = 'white';
        prevButton.style.color = '#1f2937';
      };
      
      nextButton.onmouseover = () => {
        nextButton.style.opacity = '1';
        nextButton.style.transform = 'translateY(-50%) scale(1.1)';
        nextButton.style.background = \`\${WIDGET_CONFIG.theme.buttonColor || '#3b82f6'}\`;
        nextButton.style.color = 'white';
      };
      nextButton.onmouseout = () => {
        nextButton.style.opacity = '0.9';
        nextButton.style.transform = 'translateY(-50%) scale(1)';
        nextButton.style.background = 'white';
        nextButton.style.color = '#1f2937';
      };
      
      // Robust navigation logic with dynamic cards per view
      let currentIndex = 0;
      const cardWidth = 187; // Width of card (175px) + gap (12px)
      let isAnimating = false;
      
      const updateButtonVisibility = () => {
        prevButton.style.display = currentIndex === 0 ? 'none' : 'flex';
        nextButton.style.display = currentIndex >= products.length - actualCardsPerView ? 'none' : 'flex';
      };
      
      const navigateToIndex = (newIndex) => {
        if (isAnimating) return; // Prevent multiple clicks during animation
        
        isAnimating = true;
        currentIndex = newIndex;
        
        // Use transform instead of scrollLeft for smoother animation
        const translateX = -currentIndex * cardWidth;
        innerContainer.style.transform = \`translateX(\${translateX}px)\`;
        
        updateButtonVisibility();
        
        // Reset animation flag after transition completes
        setTimeout(() => {
          isAnimating = false;
        }, 300);
      };
      
      prevButton.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (currentIndex > 0 && !isAnimating) {
          const newIndex = Math.max(0, currentIndex - actualCardsPerView);
          navigateToIndex(newIndex);
        }
      };
      
      nextButton.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (currentIndex < products.length - actualCardsPerView && !isAnimating) {
          const newIndex = Math.min(products.length - actualCardsPerView, currentIndex + actualCardsPerView);
          navigateToIndex(newIndex);
        }
      };
      
      // Initial button visibility
      updateButtonVisibility();
      
      // Add all elements to wrapper
      wrapper.appendChild(prevButton);
      wrapper.appendChild(container);
      wrapper.appendChild(nextButton);
      
      return wrapper;
    } else if (layout === 'grid') {
      const container = document.createElement('div');
      container.className = 'product-cards-container';
      container.style.cssText = \`
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 12px;
        padding: 8px 4px;
        margin-top: 8px;
      \`;
      
      products.forEach(product => {
        container.appendChild(createProductCard(product));
      });
      
      return container;
    } else if (layout === 'vertical') {
      const container = document.createElement('div');
      container.className = 'product-cards-container';
      container.style.cssText = \`
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 8px 4px;
        margin-top: 8px;
      \`;
      
      products.forEach(product => {
        container.appendChild(createProductCard(product));
      });
      
      return container;
    }
  }

  function addMessage(role, content, imageUrl = null) {
    const messageDiv = document.createElement("div");
    const isUser = role === 'user';
    
    // Parse product cards if enabled and this is an assistant message
    let parsedContent = content;
    let products = [];
    
    if (!isUser && WIDGET_CONFIG.messages.productCards.enabled) {
      const parsed = parseProductCards(content);
      parsedContent = parsed.cleanText;
      products = parsed.products;
    }
    
    // Store the original raw content for history saving
    messageDiv.setAttribute('data-original-content', content);
    messageDiv.setAttribute('data-role', role);
    
    // Also store in our conversation messages array
    const messageData = {
      role: role,
      content: content,
      timestamp: new Date().toISOString()
    };
    
    if (imageUrl) {
      messageData.imageUrl = imageUrl;
    }
    
    currentConversationMessages.push(messageData);
    
    messageDiv.style.cssText = \`
      margin-bottom: 16px;
      display: flex;
      flex-direction: column;
      align-items: \${isUser ? 'flex-end' : 'flex-start'};
      animation: slideIn 0.3s ease-out;
    \`;
    
    // Create timestamp
    const timestamp = document.createElement("div");
    const now = new Date();
    const timeString = now.toLocaleTimeString('da-DK', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
    timestamp.textContent = timeString;
    timestamp.style.cssText = \`
      font-size: 10px;
      color: \${themeColors.textColor};
      opacity: 0.5;
      margin: 6px 8px 4px \${isUser ? '8px' : '44px'};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    \`;
    
    // Create message content container
    const messageContentDiv = document.createElement("div");
    messageContentDiv.style.cssText = \`
      display: flex;
      justify-content: \${isUser ? 'flex-end' : 'flex-start'};
      width: 100%;
    \`;
    
    if (isUser) {
      // User message - simple bubble
      const messageBubble = document.createElement("div");
      messageBubble.style.cssText = \`
        background: \${WIDGET_CONFIG.theme.buttonColor || '#4f46e5'};
        color: white;
        padding: 12px 16px;
        border-radius: 18px 18px 4px 18px;
        font-size: 14px;
        max-width: 80%;
        box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
        word-wrap: break-word;
        text-align: left;
      \`;
      
      // Add image if present
      if (imageUrl) {
        const imageElement = document.createElement('img');
        imageElement.src = imageUrl;
        imageElement.style.cssText = \`
          max-width: 100%;
          border-radius: 8px;
          margin-bottom: 8px;
          display: block;
        \`;
        messageBubble.appendChild(imageElement);
      }
      
      const textDiv = document.createElement('div');
      textDiv.innerHTML = formatMessage(parsedContent);
      messageBubble.appendChild(textDiv);
      
      messageContentDiv.appendChild(messageBubble);
    } else {
      // Assistant message - with avatar and name like LivePreview
      const assistantContainer = document.createElement("div");
      assistantContainer.style.cssText = \`
        display: flex;
        align-items: flex-start;
        gap: 12px;
      \`;
      
      const avatar = document.createElement("div");
      avatar.style.cssText = \`
        width: \${WIDGET_CONFIG.branding?.iconSizes?.messageAvatar || 32}px;
        height: \${WIDGET_CONFIG.branding?.iconSizes?.messageAvatar || 32}px;
        background: \${WIDGET_CONFIG.theme.buttonColor || '#4f46e5'};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      \`;
      avatar.innerHTML = WIDGET_CONFIG.branding?.avatarUrl ? 
        \`<img src="\${WIDGET_CONFIG.branding.avatarUrl}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; transform: scale(\${WIDGET_CONFIG.branding?.imageSettings?.avatarZoom || 1}) translate(\${WIDGET_CONFIG.branding?.imageSettings?.avatarOffsetX || 0}px, \${WIDGET_CONFIG.branding?.imageSettings?.avatarOffsetY || 0}px); transform-origin: center center;" />\` : 
        \`<span style="color: white; font-size: 12px; font-weight: 600;">\${generateAIIcon(WIDGET_CONFIG.name, WIDGET_CONFIG.branding?.title)}</span>\`;
      
      const messageContent = document.createElement("div");
      messageContent.style.cssText = \`
        display: flex;
        flex-direction: column;
      \`;
      
      const nameLabel = document.createElement("div");
      nameLabel.style.cssText = \`
        font-size: 12px;
        color: \${themeColors.textColor};
        margin-bottom: 8px;
        font-weight: 500;
        opacity: 0.7;
      \`;
      nameLabel.textContent = WIDGET_CONFIG.branding.assistantName || WIDGET_CONFIG.branding.title || 'AI Assistant';
      
      const messageBubble = document.createElement("div");
      messageBubble.style.cssText = \`
        background: \${themeColors.messageBg};
        color: \${themeColors.textColor};
        padding: 12px 4px 12px 16px;
        border-radius: 18px 18px 18px 4px;
        font-size: 14px;
        max-width: 320px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        border: 1px solid \${themeColors.borderColor};
        word-wrap: break-word;
        line-height: 1.5;
      \`;
      messageBubble.className = 'messageBubble';
      messageBubble.innerHTML = formatMessage(parsedContent);
      
      messageContent.appendChild(nameLabel);
      messageContent.appendChild(messageBubble);
      
      // Add product cards if any were found
      if (products.length > 0) {
        // Check if any products need metadata fetching
        const needsMetadata = products.some(p => p.needsMetadata);
        
        if (needsMetadata) {
          // Fetch metadata for products that need it
          Promise.all(
            products.map(async (product) => {
              if (product.needsMetadata) {
                const metadata = await fetchProductMetadata(product.url);
                if (metadata) {
                  product.image = metadata.image;
                  product.price = metadata.price;
                  product.name = metadata.name || product.name;
                  delete product.needsMetadata;
                }
              }
              return product;
            })
          ).then((enrichedProducts) => {
            // Filter out products without images
            const validProducts = enrichedProducts.filter(p => p.image);
            
            // Add product cards container after metadata is fetched
            if (validProducts.length > 0) {
              const cardsContainer = createProductCardsContainer(
                validProducts,
                WIDGET_CONFIG.messages.productCards.layout
              );
              messageContent.appendChild(cardsContainer);
            }
          });
        } else {
          // Products already have all metadata, show immediately
          const cardsContainer = createProductCardsContainer(
            products, 
            WIDGET_CONFIG.messages.productCards.layout
          );
          messageContent.appendChild(cardsContainer);
        }
      }
      assistantContainer.appendChild(avatar);
      assistantContainer.appendChild(messageContent);
      messageContentDiv.appendChild(assistantContainer);
    }
    
    // Add message content and timestamp to main container
    messageDiv.appendChild(messageContentDiv);
    messageDiv.appendChild(timestamp);
    
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
  }

  function addMessageWithTypewriter(role, content) {
    const messageDiv = document.createElement("div");
    const isUser = role === 'user';
    
    // Parse product cards if enabled and this is an assistant message
    let parsedContent = content;
    let products = [];
    
    if (!isUser && WIDGET_CONFIG.messages.productCards.enabled) {
      const parsed = parseProductCards(content);
      parsedContent = parsed.cleanText;
      products = parsed.products;
    }
    
    // Store the original raw content for history saving
    messageDiv.setAttribute('data-original-content', content);
    messageDiv.setAttribute('data-role', role);
    
    // Also store in our conversation messages array
    currentConversationMessages.push({
      role: role,
      content: content,
      timestamp: new Date().toISOString()
    });
    
    messageDiv.style.cssText = \`
      margin-bottom: 16px;
      display: flex;
      flex-direction: column;
      align-items: \${isUser ? 'flex-end' : 'flex-start'};
      animation: slideIn 0.3s ease-out;
    \`;
    
    // Create timestamp
    const timestamp = document.createElement("div");
    const now = new Date();
    const timeString = now.toLocaleTimeString('da-DK', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
    timestamp.textContent = timeString;
    timestamp.style.cssText = \`
      font-size: 10px;
      color: \${themeColors.textColor};
      opacity: 0.5;
      margin: 6px 8px 4px \${isUser ? '8px' : '44px'};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    \`;
    
    // Create message content container
    const messageContentDiv = document.createElement("div");
    messageContentDiv.style.cssText = \`
      display: flex;
      justify-content: \${isUser ? 'flex-end' : 'flex-start'};
      width: 100%;
    \`;
    
    if (isUser) {
      // User messages don't need typewriter effect
      addMessage(role, content);
      return;
    } else {
      // Assistant message with typewriter effect
      const assistantContainer = document.createElement("div");
      assistantContainer.style.cssText = \`
        display: flex;
        align-items: flex-start;
        gap: 12px;
      \`;
      
      const avatar = document.createElement("div");
      avatar.style.cssText = \`
        width: \${WIDGET_CONFIG.branding?.iconSizes?.messageAvatar || 32}px;
        height: \${WIDGET_CONFIG.branding?.iconSizes?.messageAvatar || 32}px;
        background: \${WIDGET_CONFIG.theme.buttonColor || '#4f46e5'};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      \`;
      avatar.innerHTML = WIDGET_CONFIG.branding?.avatarUrl ? 
        \`<img src="\${WIDGET_CONFIG.branding.avatarUrl}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; transform: scale(\${WIDGET_CONFIG.branding?.imageSettings?.avatarZoom || 1}) translate(\${WIDGET_CONFIG.branding?.imageSettings?.avatarOffsetX || 0}px, \${WIDGET_CONFIG.branding?.imageSettings?.avatarOffsetY || 0}px); transform-origin: center center;" />\` : 
        \`<span style="color: white; font-size: 12px; font-weight: 600;">\${generateAIIcon(WIDGET_CONFIG.name, WIDGET_CONFIG.branding?.title)}</span>\`;
      
      const messageContent = document.createElement("div");
      messageContent.style.cssText = \`
        display: flex;
        flex-direction: column;
      \`;
      
      const nameLabel = document.createElement("div");
      nameLabel.style.cssText = \`
        font-size: 12px;
        color: \${themeColors.textColor};
        margin-bottom: 8px;
        font-weight: 500;
        opacity: 0.7;
      \`;
      nameLabel.textContent = WIDGET_CONFIG.branding.assistantName || WIDGET_CONFIG.branding.title || 'AI Assistant';
      
      const messageBubble = document.createElement("div");
      messageBubble.style.cssText = \`
        background: \${themeColors.messageBg};
        color: \${themeColors.textColor};
        padding: 12px 4px 12px 16px;
        border-radius: 18px 18px 18px 4px;
        font-size: 14px;
        max-width: 320px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        border: 1px solid \${themeColors.borderColor};
        word-wrap: break-word;
        line-height: 1.5;
        position: relative;
      \`;
      messageBubble.className = 'messageBubble';
      
      // Add blinking cursor
      const cursor = document.createElement("span");
      cursor.style.cssText = \`
        display: inline-block;
        width: 2px;
        height: 16px;
        background: \${themeColors.textColor};
        margin-left: 2px;
        animation: blink 1s infinite;
        vertical-align: middle;
      \`;
      
      messageContent.appendChild(nameLabel);
      messageContent.appendChild(messageBubble);
      
      // Add product cards if any were found (after typewriter completes)
      if (products.length > 0) {
        // Store products for later addition after typewriter effect
        messageBubble.setAttribute('data-products', JSON.stringify(products));
      }
      
      assistantContainer.appendChild(avatar);
      assistantContainer.appendChild(messageContent);
      messageContentDiv.appendChild(assistantContainer);
      
      // Add message content and timestamp to main container
      messageDiv.appendChild(messageContentDiv);
      messageDiv.appendChild(timestamp);
      
      messages.appendChild(messageDiv);
      messages.scrollTop = messages.scrollHeight;
      
      // Start typewriter effect with parsed content
      startTypewriterEffect(messageBubble, parsedContent, cursor, products);
    }
  }

  function startTypewriterEffect(element, text, cursor, products = []) {
    let currentText = '';
    const speed = 5; // milliseconds per character
    
    // Add cursor initially
    element.appendChild(cursor);
    
    // Helper function to format text while preserving incomplete links
    function formatTextSafely(text) {
      // Temporarily replace incomplete markdown links with placeholders
      let workingText = text;
      const incompleteLinkRegex = /\\[([^\\]]*?)(?:\\](?:\\(([^)]*?))?)?$/;
      const incompleteMatch = workingText.match(incompleteLinkRegex);
      let placeholder = null;
      let placeholderText = '';
      
      if (incompleteMatch && incompleteMatch[0]) {
        // Found incomplete link at end
        placeholderText = incompleteMatch[0];
        placeholder = '___INCOMPLETE_LINK___';
        workingText = workingText.slice(0, -placeholderText.length) + placeholder;
      }
      
      // Format the text with complete links
      let formatted = formatMessage(workingText);
      
      // Restore incomplete link as plain text
      if (placeholder && placeholderText) {
        formatted = formatted.replace(placeholder, placeholderText);
      }
      
      return formatted;
    }
    
    function typeNextCharacter() {
      if (currentText.length < text.length) {
        // Add next character
        currentText += text[currentText.length];
        
        // Format the text safely (avoiding incomplete links)
        try {
          const formatted = formatTextSafely(currentText);
          const cursorHTML = '<span style="display: inline-block; width: 2px; height: 16px; background: ' + themeColors.textColor + '; margin-left: 2px; animation: blink 1s infinite; vertical-align: middle;"></span>';
          element.innerHTML = formatted + cursorHTML;
        } catch (error) {
          // Fallback to plain text if formatting fails
          const cursorHTML = '<span style="display: inline-block; width: 2px; height: 16px; background: ' + themeColors.textColor + '; margin-left: 2px; animation: blink 1s infinite; vertical-align: middle;"></span>';
          element.textContent = currentText;
          element.innerHTML += cursorHTML;
        }
        
        // Scroll to bottom to keep up with typing
        messages.scrollTop = messages.scrollHeight;
        
        // Schedule next character
        setTimeout(typeNextCharacter, speed);
      } else {
        // Remove cursor and apply final formatting
        try {
          element.innerHTML = formatMessage(text);
        } catch (error) {
          element.textContent = text;
        }
        
        // Add product cards after typewriter effect completes
        if (products.length > 0) {
          const messageContent = element.parentElement;
          
          // Check if any products need metadata fetching
          const needsMetadata = products.some(p => p.needsMetadata);
          
          if (needsMetadata) {
            // Fetch metadata for products that need it
            Promise.all(
              products.map(async (product) => {
                if (product.needsMetadata) {
                  const metadata = await fetchProductMetadata(product.url);
                  if (metadata) {
                    product.image = metadata.image;
                    product.price = metadata.price;
                    product.name = metadata.name || product.name;
                    delete product.needsMetadata;
                  }
                }
                return product;
              })
            ).then((enrichedProducts) => {
              // Filter out products without images
              const validProducts = enrichedProducts.filter(p => p.image);
              
              // Add product cards container after metadata is fetched
              if (validProducts.length > 0) {
                const cardsContainer = createProductCardsContainer(
                  validProducts,
                  WIDGET_CONFIG.messages.productCards.layout
                );
                messageContent.appendChild(cardsContainer);
              }
            });
          } else {
            // Products already have all metadata, show immediately
            const cardsContainer = createProductCardsContainer(
              products, 
              WIDGET_CONFIG.messages.productCards.layout
            );
            messageContent.appendChild(cardsContainer);
          }
        }
      }
    }
    
    // Start typing after a short delay
    setTimeout(typeNextCharacter, 100);
  }

  // Satisfaction rating functionality
  let satisfactionRatingShown = false;
  let inactivityTimer = null;
  let lastActivityTime = Date.now();
  
  // Support request form state
  let manualReviewFormOpen = false;
  
  function checkAndShowSatisfactionRating() {
    console.log('🔍 checkAndShowSatisfactionRating called, satisfactionRatingShown:', satisfactionRatingShown);
    console.log('🔧 WIDGET_CONFIG.satisfaction:', WIDGET_CONFIG.satisfaction);
    console.log('📊 Current conversation ID:', currentConversationId);
    console.log('🌐 API URL:', WIDGET_CONFIG.apiUrl);
    console.log('📝 Current conversation messages length:', currentConversationMessages.length);
    
    // Don't show if already shown for this conversation
    if (satisfactionRatingShown) {
      console.log('🚫 Satisfaction rating already shown for this conversation');
      return;
    }
    
    // Check if satisfaction rating is enabled in widget config
    const satisfactionConfig = WIDGET_CONFIG.satisfaction || {};
    console.log('📊 Satisfaction Config Debug:', satisfactionConfig);
    
    if (!satisfactionConfig.enabled) {
      console.log('❌ Satisfaction rating is disabled');
      return;
    }
    
    // Check message count threshold
    const messageCount = currentConversationMessages.length;
    const triggerAfter = satisfactionConfig.triggerAfter || 3;
    
    console.log('📈 Message Count Check:', {
      messageCount,
      triggerAfter,
      shouldTrigger: messageCount >= triggerAfter
    });
    
    if (messageCount >= triggerAfter) {
      console.log('✅ Message count threshold reached, starting inactivity timer');
      startInactivityTimer();
    } else {
      console.log('⏳ Message count not yet reached, waiting for more messages');
    }
  }
  
  function startInactivityTimer() {
    console.log('⏰ startInactivityTimer called');
    console.log('📊 satisfactionRatingShown:', satisfactionRatingShown);
    console.log('🔧 WIDGET_CONFIG.satisfaction:', WIDGET_CONFIG.satisfaction);
    
    // Don't start timer if rating already shown
    if (satisfactionRatingShown) {
      console.log('🚫 Satisfaction rating already shown, skipping timer');
      return;
    }
    
    // Clear any existing timer before starting new one
    if (inactivityTimer) {
      console.log('⏰ Clearing existing timer before starting new one');
      clearTimeout(inactivityTimer);
    }
    
    const satisfactionConfig = WIDGET_CONFIG.satisfaction || {};
    const inactivityDelay = satisfactionConfig.inactivityDelay || 30000; // 30 seconds default
    
    console.log('⏱️ Starting inactivity timer:', {
      inactivityDelay,
      delayInSeconds: inactivityDelay / 1000
    });
    
    inactivityTimer = setTimeout(() => {
      console.log('🔔 Inactivity timer triggered - showing satisfaction rating');
      console.log('🔍 Timer ID:', inactivityTimer);
      console.log('🔍 satisfactionRatingShown before showing:', satisfactionRatingShown);
      showSatisfactionRating();
      // Set the flag after showing the rating to prevent multiple ratings
      satisfactionRatingShown = true;
      console.log('✅ Set satisfactionRatingShown = true after showing rating');
      inactivityTimer = null; // Clear timer reference after completion
    }, inactivityDelay);
    
    console.log('⏰ Timer scheduled with ID:', inactivityTimer);
  }
  
  // Debounce timer for input events
  let inputDebounceTimer = null;
  
  function resetInactivityTimer() {
    lastActivityTime = Date.now();
    
    // Clear any existing debounce timer
    if (inputDebounceTimer) {
      clearTimeout(inputDebounceTimer);
    }
    
    // Debounce the timer reset to avoid constant restarts
    inputDebounceTimer = setTimeout(() => {
      if (inactivityTimer) {
        console.log('🔄 Resetting inactivity timer due to user activity');
        clearTimeout(inactivityTimer);
        startInactivityTimer();
      }
    }, 1000); // Wait 1 second after last input before resetting timer
  }
  
  function showSatisfactionRating() {
    console.log('🎯 showSatisfactionRating called');
    console.log('🔧 WIDGET_CONFIG.satisfaction:', WIDGET_CONFIG.satisfaction);
    console.log('📊 Current conversation ID:', currentConversationId);
    console.log('🌐 API URL:', WIDGET_CONFIG.apiUrl);
    
    const satisfactionConfig = WIDGET_CONFIG.satisfaction || {};
    
    console.log('⭐ Showing satisfaction rating with config:', {
      promptText: satisfactionConfig.promptText,
      allowFeedback: satisfactionConfig.allowFeedback,
      feedbackPlaceholder: satisfactionConfig.feedbackPlaceholder
    });
    
    // Create the rating as an AI message
    const messageDiv = document.createElement("div");
    const isUser = false; // This is an AI message
    
    // Store the original raw content for history saving
    messageDiv.setAttribute('data-original-content', 'satisfaction_rating');
    messageDiv.setAttribute('data-role', 'assistant');
    
    // Also store in our conversation messages array
    currentConversationMessages.push({
      role: 'assistant',
      content: 'satisfaction_rating',
      timestamp: new Date()
    });
    
    messageDiv.style.cssText = \`
      margin-bottom: 16px;
      display: flex;
      justify-content: flex-start;
      animation: slideIn 0.3s ease-out;
    \`;
    
    const messageContentDiv = document.createElement("div");
    messageContentDiv.style.cssText = \`
      display: flex;
      align-items: flex-start;
      gap: 12px;
      max-width: 85%;
    \`;
    
    // AI Avatar
    const assistantAvatar = document.createElement("div");
    assistantAvatar.style.cssText = \`
      width: 32px;
      height: 32px;
      background: \${WIDGET_CONFIG.theme.buttonColor || '#4f46e5'};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    \`;
    assistantAvatar.innerHTML = WIDGET_CONFIG.branding?.avatarUrl ? 
      \`<img src="\${WIDGET_CONFIG.branding.avatarUrl}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; transform: scale(\${WIDGET_CONFIG.branding?.imageSettings?.avatarZoom || 1}) translate(\${WIDGET_CONFIG.branding?.imageSettings?.avatarOffsetX || 0}px, \${WIDGET_CONFIG.branding?.imageSettings?.avatarOffsetY || 0}px); transform-origin: center center;" />\` : 
      \`<span style="color: white; font-size: 12px; font-weight: 600;">\${generateAIIcon(WIDGET_CONFIG.name, WIDGET_CONFIG.branding?.title)}</span>\`;
    
    const assistantContainer = document.createElement("div");
    assistantContainer.style.cssText = \`
      display: flex;
      flex-direction: column;
    \`;
    
    // AI Name Label
    const assistantNameLabel = document.createElement("div");
    assistantNameLabel.style.cssText = \`
      font-size: 12px;
      color: \${themeColors.textColor};
      margin-bottom: 8px;
      font-weight: 500;
      opacity: 0.7;
    \`;
    assistantNameLabel.textContent = WIDGET_CONFIG.branding.title || 'AI Assistant';
    
    // Rating Message Bubble
    const ratingBubble = document.createElement("div");
    ratingBubble.className = 'satisfaction-rating-bubble';
    ratingBubble.style.cssText = \`
      background: \${themeColors.messageBg};
      color: \${themeColors.textColor};
      padding: 16px;
      border-radius: 18px 18px 18px 4px;
      font-size: 14px;
      max-width: 320px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border: 1px solid \${themeColors.borderColor};
    \`;
    
    const promptText = satisfactionConfig.promptText || 'How would you rate this conversation so far?';
    const allowFeedback = satisfactionConfig.allowFeedback === true;
    const feedbackPlaceholder = satisfactionConfig.feedbackPlaceholder || 'Optional feedback...';
    
    ratingBubble.innerHTML = \`
      <div style="margin-bottom: 16px; color: \${themeColors.textColor}; font-size: 14px; line-height: 1.4;">
        \${promptText}
      </div>
      <div class="rating-emojis" style="display: flex; gap: 12px; justify-content: center; margin-bottom: \${allowFeedback ? '16px' : '0'};">
        \${[1,2,3,4,5].map(rating => \`
          <button class="rating-btn" data-rating="\${rating}" style="
            background: none;
            border: none;
            font-size: 28px;
            cursor: pointer;
            padding: 8px;
            border-radius: 12px;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
          " onmouseover="this.style.transform='scale(1.15)'; this.style.backgroundColor='rgba(0,0,0,0.05)'" onmouseout="this.style.transform='scale(1)'; this.style.backgroundColor='transparent'">\${getEmojiForRating(rating)}</button>
        \`).join('')}
      </div>
      \${allowFeedback ? \`
        <textarea class="feedback-input" placeholder="\${feedbackPlaceholder}" 
          style="width: 100%; padding: 12px; border: 1px solid \${themeColors.borderColor}; border-radius: 8px; resize: vertical; min-height: 60px; font-size: 14px; font-family: inherit; background: white; outline: none; transition: border-color 0.2s ease;" 
          onfocus="this.style.borderColor='\${WIDGET_CONFIG.theme.buttonColor || '#4f46e5'}'" 
          onblur="this.style.borderColor='\${themeColors.borderColor}'"></textarea>
      \` : ''}
    \`;
    
    // Add event listeners
    ratingBubble.querySelectorAll('.rating-btn').forEach(btn => {
      btn.addEventListener('click', () => submitRating(parseInt(btn.dataset.rating)));
    });
    
    // Assemble the message
    assistantContainer.appendChild(assistantNameLabel);
    assistantContainer.appendChild(ratingBubble);
    messageContentDiv.appendChild(assistantAvatar);
    messageContentDiv.appendChild(assistantContainer);
    messageDiv.appendChild(messageContentDiv);
    
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
    
    console.log('✅ Satisfaction rating message added to DOM');
  }
  
  function getEmojiForRating(rating) {
    const emojis = {
      1: '☹️',
      2: '😞', 
      3: '😐',
      4: '😊',
      5: '🤩'
    };
    return emojis[rating] || '😐';
  }
  
  async function submitRating(rating) {
    console.log('🚀 submitRating called with rating:', rating);
    console.log('📊 Current conversation ID:', currentConversationId);
    console.log('🔧 Widget ID:', WIDGET_CONFIG.widgetId);
    console.log('🌐 API URL:', WIDGET_CONFIG.apiUrl);
    
    try {
      const feedbackInput = document.querySelector('.feedback-input');
      const feedback = feedbackInput ? feedbackInput.value.trim() : '';
      console.log('💬 Feedback:', feedback);
      
      const requestBody = {
        conversationId: currentConversationId,
        widgetId: WIDGET_CONFIG.widgetId,
        rating: rating,
        feedback: feedback
      };
      
      console.log('📤 Request body:', requestBody);
      console.log('🎯 Full API URL:', \`\${WIDGET_CONFIG.apiUrl}/api/satisfaction/rate\`);
      
      const response = await fetch(\`\${WIDGET_CONFIG.apiUrl}/api/satisfaction/rate\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response status text:', response.statusText);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Rating submitted successfully:', data);
        showThankYouMessage();
        // Keep satisfactionRatingShown = true to prevent multiple ratings in same conversation
        console.log('✅ Rating submitted successfully, keeping satisfactionRatingShown = true');
      } else {
        console.error('❌ Failed to submit rating:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error('Error details:', errorData);
        console.error('Full response:', response);
        showErrorMessage('Failed to submit rating. Please try again.');
      }
      
    } catch (error) {
      console.error('❌ Error submitting rating:', error);
      console.error('Error stack:', error.stack);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      showErrorMessage('Failed to submit rating. Please try again.');
    }
  }
  
  function showThankYouMessage() {
    // Remove the rating bubble
    const ratingBubble = document.querySelector('.satisfaction-rating-bubble');
    if (ratingBubble) {
      ratingBubble.remove();
    }
    
    // Show thank you message as AI message
    const messageDiv = document.createElement("div");
    messageDiv.style.cssText = \`
      margin-bottom: 16px;
      display: flex;
      justify-content: flex-start;
      animation: slideIn 0.3s ease-out;
    \`;
    
    const messageContentDiv = document.createElement("div");
    messageContentDiv.style.cssText = \`
      display: flex;
      align-items: flex-start;
      gap: 12px;
      max-width: 85%;
    \`;
    
    // AI Avatar
    const assistantAvatar = document.createElement("div");
    assistantAvatar.style.cssText = \`
      width: 32px;
      height: 32px;
      background: \${WIDGET_CONFIG.theme.buttonColor || '#4f46e5'};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    \`;
    assistantAvatar.innerHTML = '<span style="color: white; font-size: 12px; font-weight: 600;">E</span>';
    
    const assistantContainer = document.createElement("div");
    assistantContainer.style.cssText = \`
      display: flex;
      flex-direction: column;
    \`;
    
    // AI Name Label
    const assistantNameLabel = document.createElement("div");
    assistantNameLabel.style.cssText = \`
      font-size: 12px;
      color: \${themeColors.textColor};
      margin-bottom: 8px;
      font-weight: 500;
      opacity: 0.7;
    \`;
    assistantNameLabel.textContent = WIDGET_CONFIG.branding.title || 'AI Assistant';
    
    // Thank you message bubble
    const thankYouBubble = document.createElement("div");
    thankYouBubble.style.cssText = \`
      background: #f0f9ff;
      color: #0369a1;
      padding: 12px 16px;
      border-radius: 18px 18px 18px 4px;
      font-size: 14px;
      max-width: 320px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border: 1px solid #bae6fd;
      text-align: center;
    \`;
    thankYouBubble.innerHTML = 'Thank you for your feedback! 🙏';
    
    // Assemble the message
    assistantContainer.appendChild(assistantNameLabel);
    assistantContainer.appendChild(thankYouBubble);
    messageContentDiv.appendChild(assistantAvatar);
    messageContentDiv.appendChild(assistantContainer);
    messageDiv.appendChild(messageContentDiv);
    
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
    
    // Remove thank you message after 3 seconds
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, 3000);
  }
  
  function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = \`
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 12px;
      padding: 12px 16px;
      margin: 12px 0;
      text-align: center;
      color: #dc2626;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
    \`;
    errorDiv.innerHTML = message;
    
    messages.appendChild(errorDiv);
    messages.scrollTop = messages.scrollHeight;
    
    // Remove error message after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, 5000);
  }

  // Handle message sending
  let isSending = false;
  async function sendMessage() {
    // Check if widget is blocked
    if (WIDGET_CONFIG.isBlocked) {
      const blockMessage = WIDGET_CONFIG.blockReason || 'This chat is temporarily unavailable.';
      addMessage('assistant', blockMessage + ' Please contact support for assistance.');
      return;
    }
    
    const msg = input.value.trim();
    if (msg === "" || isSending) return;
    
    isSending = true;
    
    // Remove suggested responses if they exist (they are in inputContainer, not messages)
    const existingResponses = inputContainer.querySelector('.suggested-responses');
    if (existingResponses) {
      inputContainer.removeChild(existingResponses);
    }
    
    // Add user message to UI
    addMessage('user', msg, currentImageAttachment);
    input.value = "";
    
    // Show typing indicator matching LivePreview
    const typingDiv = document.createElement("div");
    typingDiv.style.cssText = \`
      margin-bottom: 16px;
      display: flex;
      justify-content: flex-start;
      animation: slideIn 0.3s ease-out;
    \`;
    
    const typingContainer = document.createElement("div");
    typingContainer.style.cssText = \`
      display: flex;
      align-items: flex-start;
      gap: 12px;
    \`;
    
    const typingAvatar = document.createElement("div");
    typingAvatar.style.cssText = \`
      width: 32px;
      height: 32px;
      background: \${WIDGET_CONFIG.theme.buttonColor || '#4f46e5'};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    \`;
    typingAvatar.innerHTML = WIDGET_CONFIG.branding?.avatarUrl ? 
      \`<img src="\${WIDGET_CONFIG.branding.avatarUrl}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; transform: scale(\${WIDGET_CONFIG.branding?.imageSettings?.avatarZoom || 1}) translate(\${WIDGET_CONFIG.branding?.imageSettings?.avatarOffsetX || 0}px, \${WIDGET_CONFIG.branding?.imageSettings?.avatarOffsetY || 0}px); transform-origin: center center;" />\` : 
      \`<span style="color: white; font-size: 12px; font-weight: 600;">\${generateAIIcon(WIDGET_CONFIG.name, WIDGET_CONFIG.branding?.title)}</span>\`;
    
    const typingContent = document.createElement("div");
    typingContent.style.cssText = \`
      display: flex;
      flex-direction: column;
    \`;
    
    const typingNameLabel = document.createElement("div");
    typingNameLabel.style.cssText = \`
      font-size: 12px;
      color: \${themeColors.textColor};
      margin-bottom: 8px;
      font-weight: 500;
      opacity: 0.7;
    \`;
    typingNameLabel.textContent = WIDGET_CONFIG.branding.title || 'AI Assistant';
    
    const typingBubble = document.createElement("div");
    const showTypingText = WIDGET_CONFIG.messages?.showTypingText !== false;
    const typingText = WIDGET_CONFIG.messages?.typingText || 'AI is thinking...';
    
    typingBubble.style.cssText = \`
      background: \${themeColors.messageBg};
      color: \${themeColors.textColor};
      padding: 12px \${showTypingText ? '16px' : '12px'} 12px 16px;
      border-radius: 18px 18px 18px 4px;
      font-size: 14px;
      max-width: \${showTypingText ? '320px' : 'fit-content'};
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border: 1px solid \${themeColors.borderColor};
      display: flex;
      align-items: center;
      width: fit-content;
    \`;
    
    typingBubble.innerHTML = \`
      <div style="display: flex; align-items: center; gap: 0; width: fit-content;">
        <div style="width: 6px; height: 6px; background: \${themeColors.textColor}; opacity: 0.6; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; animation-delay: -0.32s; margin-right: 4px;"></div>
        <div style="width: 6px; height: 6px; background: \${themeColors.textColor}; opacity: 0.6; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; animation-delay: -0.16s; margin-right: 4px;"></div>
        <div style="width: 6px; height: 6px; background: \${themeColors.textColor}; opacity: 0.6; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; margin-right: \${showTypingText ? '8px' : '0'};"></div>
        \${showTypingText ? \`<span style="font-weight: 500; margin: 0; padding: 0; display: inline-block;">\${typingText}</span>\` : ''}
      </div>
    \`;
    
    typingContent.appendChild(typingNameLabel);
    typingContent.appendChild(typingBubble);
    typingContainer.appendChild(typingAvatar);
    typingContainer.appendChild(typingContent);
    typingDiv.appendChild(typingContainer);
    
    messages.appendChild(typingDiv);
    messages.scrollTop = messages.scrollHeight;

    // Use appropriate API endpoint based on widget type
    const apiEndpoint = WIDGET_CONFIG.apiType === 'responses' ? 
      \`\${WIDGET_CONFIG.apiUrl}/api/respond-responses\` : 
      \`\${WIDGET_CONFIG.apiUrl}/api/respond\`;

    try {
        
      // Debug log to see what URL is being used
      console.log('🚀 Sending request to:', apiEndpoint);
      console.log('📋 Request payload:', {
        widgetId: WIDGET_CONFIG.widgetId,
        message: msg.substring(0, 50) + '...',
        userId,
        conversationId: currentConversationId
      });
      console.log('🔧 WIDGET_CONFIG.apiUrl:', WIDGET_CONFIG.apiUrl);
      console.log('🌍 Environment NEXT_PUBLIC_API_URL: Not available in browser');
      console.log('⚠️ WARNING: If widget is loaded from localhost but apiUrl is Vercel, conversations will be created on different servers!');
        
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      // GDPR: Send consent status to backend
      const analyticsConsent = ElvaConsent.hasConsent('analytics');
      
      const requestBody = {
        widgetId: WIDGET_CONFIG.widgetId,
        message: msg,
        userId,
        conversationId: currentConversationId
      };

      // Add image URL if there's an attachment
      if (currentImageAttachment) {
        requestBody.imageUrl = currentImageAttachment;
      }
      
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Elva-Consent-Analytics": analyticsConsent ? 'true' : 'false'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      // Clear timeout if request completes
      clearTimeout(timeoutId);
      
      // Remove typing indicator
      messages.removeChild(typingDiv);
      
      if (res.ok) {
        const data = await res.json();
        
        console.log('✅ Message sent successfully, response:', data);
        console.log('📊 Response conversation ID:', data.conversationId);
        console.log('📊 Current conversation ID before update:', currentConversationId);
        
        // Update conversation ID if new conversation was created
        if (data.conversationId && data.conversationId !== currentConversationId) {
          console.log('🆕 New conversation created, updating ID from', currentConversationId, 'to', data.conversationId);
          currentConversationId = data.conversationId;
          localStorage.setItem(\`conversationId_\${WIDGET_CONFIG.widgetId}\`, currentConversationId);
          console.log('💾 Saved conversation ID to localStorage');
          
          // Reset satisfaction rating state for new conversation
          console.log('🔄 Resetting satisfaction rating state for new conversation');
          satisfactionRatingShown = false;
          if (inactivityTimer) {
            clearTimeout(inactivityTimer);
            inactivityTimer = null;
            console.log('⏰ Cleared inactivity timer for new conversation');
          }
          
          // Reset support request form state for new conversation
          manualReviewFormOpen = false;
        } else {
          console.log('📝 Using existing conversation ID:', currentConversationId);
        }

        // Add message with typewriter effect
        addMessageWithTypewriter('assistant', data.reply);
        
        // Clear image attachment and preview after successful send
        if (currentImageAttachment) {
          currentImageAttachment = null;
          const preview = inputContainer.querySelector('.elva-image-preview');
          if (preview) {
            preview.remove();
          }
        }
        
        // Check if we should show satisfaction rating
        checkAndShowSatisfactionRating();
        
        // Save conversation to history
        // Use the stored raw messages to preserve formatting for history
        const allMessages = currentConversationMessages.map(msg => {
          // Clean the content to remove any branding prefixes
          let cleanContent = msg.content;
          if (msg.role === 'assistant') {
            cleanContent = msg.content.replace(/^ECottonshoppen Ai-Kundeservice/, '').trim();
          }
          
          const messageData = {
            role: msg.role,
            content: cleanContent || ''
          };
          
          // Include imageUrl if present
          if (msg.imageUrl) {
            messageData.imageUrl = msg.imageUrl;
          }
          
          return messageData;
        }).filter(msg => msg.content && msg.content.trim());
        
        if (allMessages.length > 0) {
          saveConversationToHistory(currentConversationId, allMessages);
        }
        
        // Optional: Log metadata for debugging
        if (data.metadata && WIDGET_CONFIG.apiUrl.includes('localhost')) {
          console.log('API metadata:', data.metadata);
        }
        
        // Check for specific error conditions in the response
        if (data.reply && data.reply.includes('connection error')) {
          console.warn('AI response contains connection error message - this might indicate an API issue');
        }
      } else {
        // Handle specific error responses from the API
        console.error('🚨 HTTP Error Response:', {
          status: res.status,
          statusText: res.statusText,
          url: apiEndpoint,
          headers: Object.fromEntries(res.headers.entries())
        });
        
        let errorMessage = 'Sorry, I encountered an error. Please try again.';
        
        try {
          const errorData = await res.json();
          console.error('📄 Error response body:', errorData);
          
          if (errorData.error) {
            // Use specific error message from API
            errorMessage = errorData.error;
            
            // Add details if available and in development
            if (errorData.details && WIDGET_CONFIG.apiUrl.includes('localhost')) {
              errorMessage += ' (' + errorData.details + ')';
            }
          }
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', parseError);
          // If we can't parse the error response, use status-based messages
          if (res.status === 400) {
            errorMessage = 'Invalid request. Please check your message and try again.';
          } else if (res.status === 404) {
            errorMessage = 'Widget not found. Please refresh the page.';
          } else if (res.status === 429) {
            errorMessage = 'Too many requests. Please wait a moment and try again.';
          } else if (res.status >= 500) {
            errorMessage = 'Server error. Please try again in a moment.';
          }
        }
        
        addMessage('assistant', errorMessage);
      }
    } catch (error) {
      // Remove typing indicator
      if (typingDiv.parentNode) {
        messages.removeChild(typingDiv);
      }
      
      // Detailed error logging
      console.error('❌ Fetch error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        apiEndpoint: apiEndpoint,
        widgetId: WIDGET_CONFIG.widgetId,
        timestamp: new Date().toISOString()
      });
      
      // Provide more specific error messages based on error type
      let errorMessage = 'Sorry, I encountered a connection error. Please try again.';
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Network connection failed. Please check your internet connection and try again.';
        console.error('🌐 Network error - possible CORS or connectivity issue');
      } else if (error.name === 'AbortError') {
        errorMessage = 'Request was cancelled. Please try again.';
        console.error('⏹️ Request was aborted (timeout or manual cancellation)');
      } else if (error.message && error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
        console.error('⏰ Request timed out after 30 seconds');
      } else {
        console.error('🔍 Unexpected error type:', error.name, error.message);
      }
      
      addMessage('assistant', errorMessage);
    } finally {
      isSending = false;
    }
  }

  // Enter key to send message
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !isSending) {
      sendMessage();
    }
  });

  // Send button click with debouncing
  sendButton.onclick = () => {
    if (isSending) return;
    sendMessage();
  };

  // Reset inactivity timer on user activity
  input.addEventListener('input', resetInactivityTimer);
  input.addEventListener('focus', resetInactivityTimer);
  messages.addEventListener('scroll', resetInactivityTimer);
  
  // Reset timer when user sends a message
  const originalSendMessage = sendMessage;
  sendMessage = function() {
    resetInactivityTimer();
    return originalSendMessage.apply(this, arguments);
  };

  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = \`
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
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
    
    @keyframes pulse {
      0% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.2);
        opacity: 0.7;
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }
    
    .widget-typing div:nth-child(1) {
      animation-delay: -0.32s;
    }
    
    .widget-typing div:nth-child(2) {
      animation-delay: -0.16s;
    }
    
    .widget-typing div:nth-child(3) {
      animation-delay: 0s;
    }
    
    /* Enhanced message formatting styles */
    .messageBubble a {
      color: #4f46e5 !important;
      text-decoration: underline !important;
      transition: all 0.2s ease;
    }
    
    .messageBubble a:hover {
      color: #3730a3 !important;
      text-decoration: none !important;
    }
    
    .messageBubble ul, .messageBubble ol {
      margin: 12px 0 !important;
      padding-left: 24px !important;
    }
    
    .messageBubble ul {
      list-style-type: disc !important;
    }
    
    .messageBubble ol {
      list-style-type: decimal !important;
    }
    
    .messageBubble li {
      margin: 6px 0 !important;
      line-height: 1.5 !important;
    }
    
    .messageBubble strong {
      font-weight: 600 !important;
    }
    
    .messageBubble em {
      font-style: italic !important;
    }
    
    .messageBubble p {
      margin: 12px 0 !important;
      line-height: 1.6 !important;
    }
    
    .messageBubble p:first-child {
      margin-top: 0 !important;
    }
    
    .messageBubble p:last-child {
      margin-bottom: 0 !important;
    }
    
    .messageBubble br {
      line-height: 1.2 !important;
    }
    
    /* Theme-aware input */
    .widget-input {
      font-size: 16px !important;
    }
    
    /* Mobile-optimized animations */
    @media (max-width: 768px) {
      @keyframes mobileSlideIn {
        from {
          opacity: 0;
          transform: translateY(100%);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes mobileSlideOut {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(100%);
        }
      }
      
      @keyframes mobileBounce {
        0%, 20%, 53%, 80%, 100% {
          transform: translate3d(0,0,0);
        }
        40%, 43% {
          transform: translate3d(0, -8px, 0);
        }
        70% {
          transform: translate3d(0, -4px, 0);
        }
        90% {
          transform: translate3d(0, -2px, 0);
        }
      }
      
      /* Mobile-specific styles */
      .mobile-chat-box {
        animation: mobileSlideIn 0.3s ease-out;
        will-change: transform, opacity;
      }
      
      .mobile-chat-box.closing {
        animation: mobileSlideOut 0.2s ease-in;
      }
      
      /* Bottom sheet handle styles removed per user request */
      
      /* Improved touch targets for mobile */
      button, input, .clickable {
        min-height: 44px;
        min-width: 44px;
        touch-action: manipulation;
      }
      
      /* Prevent text selection on mobile */
      .no-select {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        -webkit-touch-callout: none;
      }
      
      /* Smooth scrolling for mobile */
      .mobile-scroll {
        -webkit-overflow-scrolling: touch;
        scroll-behavior: smooth;
      }
      
      /* Mobile-optimized shadows */
      .mobile-shadow {
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      }
      
      /* Reduce motion for users who prefer it */
      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    }
    
    /* Safe area support for iOS */
    @supports (padding: max(0px)) {
      .safe-area-top {
        padding-top: max(20px, env(safe-area-inset-top));
      }
      
      .safe-area-bottom {
        padding-bottom: max(20px, env(safe-area-inset-bottom));
      }
      
      .safe-area-left {
        padding-left: max(20px, env(safe-area-inset-left));
      }
      
      .safe-area-right {
        padding-right: max(20px, env(safe-area-inset-right));
      }
    }
  \`;
  document.head.appendChild(style);

  // Enhanced mobile detection and safe area handling
  function isMobile() {
    return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  
  function getSafeAreaInsets() {
    // Get CSS environment variables for safe areas (iOS)
    const style = getComputedStyle(document.documentElement);
    const top = parseInt(style.getPropertyValue('--sat') || '0');
    const bottom = parseInt(style.getPropertyValue('--sab') || '0');
    const left = parseInt(style.getPropertyValue('--sal') || '0');
    const right = parseInt(style.getPropertyValue('--sar') || '0');
    
    return { top, bottom, left, right };
  }
  
  function getViewportHeight() {
    // Use visual viewport API for better mobile keyboard handling
    if (window.visualViewport) {
      return window.visualViewport.height;
    }
    return window.innerHeight;
  }
  
  function getViewportWidth() {
    if (window.visualViewport) {
      return window.visualViewport.width;
    }
    return window.innerWidth;
  }

  // Update online indicator position based on chat button placement
  function updateOnlineIndicatorPosition() {
    const placement = WIDGET_CONFIG.appearance?.placement || 'bottom-right';
    const buttonSize = WIDGET_CONFIG.branding?.iconSizes?.chatButton || 60;
    
    // Position indicator in top-right area of chat button (moved more to the left)
    if (placement === 'bottom-left') {
      onlineIndicator.style.bottom = \`\${24 + buttonSize - 14}px\`;
      onlineIndicator.style.left = \`\${24 + buttonSize - 22}px\`;
      onlineIndicator.style.right = 'auto';
      onlineIndicator.style.top = 'auto';
    } else if (placement === 'top-right') {
      onlineIndicator.style.top = '14px';
      onlineIndicator.style.right = '22px';
      onlineIndicator.style.bottom = 'auto';
      onlineIndicator.style.left = 'auto';
    } else if (placement === 'top-left') {
      onlineIndicator.style.top = '14px';
      onlineIndicator.style.left = \`\${24 + buttonSize - 22}px\`;
      onlineIndicator.style.right = 'auto';
      onlineIndicator.style.bottom = 'auto';
    } else {
      // bottom-right (default)
      onlineIndicator.style.bottom = \`\${24 + buttonSize - 18}px\`;
      onlineIndicator.style.right = '22px';
      onlineIndicator.style.top = 'auto';
      onlineIndicator.style.left = 'auto';
    }
  }

  // Update positioning based on placement with enhanced mobile support
  function updatePositioning() {
    const placement = WIDGET_CONFIG.appearance?.placement || 'bottom-right';
    const mobile = isMobile();
    const safeArea = getSafeAreaInsets();
    const vh = getViewportHeight();
    const vw = getViewportWidth();
    
    // console.log('updatePositioning called:', { placement, mobile, safeArea, vh, vw });
    
    // Clear all positioning properties first
    chatBox.style.left = '';
    chatBox.style.right = '';
    chatBox.style.top = '';
    chatBox.style.bottom = '';
    historyView.style.left = '';
    historyView.style.right = '';
    historyView.style.top = '';
    historyView.style.bottom = '';
    
    if (mobile) {
      // Enhanced mobile positioning with safe areas and keyboard handling
      const buttonSize = WIDGET_CONFIG.branding?.iconSizes?.chatButton || 60;
      const margin = Math.max(20, safeArea.left, safeArea.right);
      const topMargin = Math.max(20, safeArea.top);
      const bottomMargin = Math.max(20, safeArea.bottom);
      
      // Calculate available space accounting for safe areas
      const availableWidth = vw - (margin * 2);
      const availableHeight = vh - (topMargin + bottomMargin + buttonSize + 20);
      
      // Set responsive dimensions
      chatBox.style.width = \`\${Math.min(availableWidth, 400)}px\`;
      chatBox.style.height = \`\${Math.min(availableHeight, 700)}px\`;
      historyView.style.width = \`\${Math.min(availableWidth, 400)}px\`;
      historyView.style.height = \`\${Math.min(availableHeight, 700)}px\`;
      
      // Mobile bottom sheet positioning (always at bottom for mobile)
      chatBox.style.borderRadius = '20px 20px 0 0'; // Bottom sheet style
      chatBox.style.bottom = '0'; // Always at bottom for mobile
      chatBox.style.left = '0';
      chatBox.style.right = '0';
      chatBox.style.top = 'auto';
      chatBox.style.width = '100%';
      chatBox.style.height = \`\${Math.min(availableHeight, 80)}vh\`; // Max 80% of viewport height
      
      historyView.style.borderRadius = '20px 20px 0 0';
      historyView.style.bottom = '0';
      historyView.style.left = '0';
      historyView.style.right = '0';
      historyView.style.top = 'auto';
      historyView.style.width = '100%';
      historyView.style.height = \`\${Math.min(availableHeight, 80)}vh\`;
      
      // Bottom sheet handle removed per user request
      
    } else {
      // Desktop positioning with intelligent height scaling
      const configuredWidth = WIDGET_CONFIG.theme.width || 400;
      const configuredHeight = WIDGET_CONFIG.theme.height || 700;
      
      // Calculate available height accounting for margins and button
      const availableHeight = vh - 180; // 90px top/bottom margins + button space
      
      // Use the smaller of configured height or available height
      const actualHeight = Math.min(configuredHeight, availableHeight);
      
      // Also ensure minimum height for usability
      const finalHeight = Math.max(actualHeight, 300); // Minimum 300px
      
      chatBox.style.width = \`\${configuredWidth}px\`;
      chatBox.style.height = \`\${finalHeight}px\`;
      chatBox.style.maxHeight = \`calc(100vh - 180px)\`; // CSS fallback
      
      historyView.style.width = \`\${configuredWidth}px\`;
      historyView.style.height = \`\${finalHeight}px\`;
      historyView.style.maxHeight = \`calc(100vh - 180px)\`;
      
      if (placement === 'bottom-left') {
        chatBox.style.left = '24px';
        chatBox.style.bottom = '90px';
        historyView.style.left = '24px';
        historyView.style.bottom = '90px';
      } else if (placement === 'top-right') {
        chatBox.style.right = '24px';
        chatBox.style.top = '90px';
        historyView.style.right = '24px';
        historyView.style.top = '90px';
      } else if (placement === 'top-left') {
        chatBox.style.left = '24px';
        chatBox.style.top = '90px';
        historyView.style.left = '24px';
        historyView.style.top = '90px';
      } else {
        chatBox.style.right = '24px';
        chatBox.style.bottom = '90px';
        historyView.style.right = '24px';
        historyView.style.bottom = '90px';
      }
      
      // Reset mobile-specific styles for desktop
      chatBox.style.borderRadius = \`\${WIDGET_CONFIG.theme.borderRadius || 20}px\`;
      historyView.style.borderRadius = \`\${WIDGET_CONFIG.theme.borderRadius || 20}px\`;
    }
  }

  // Enhanced mobile responsiveness with visual viewport support
  function updateMobileStyles() {
    // Update positioning based on placement
    updatePositioning();
    updateOnlineIndicatorPosition();
    
    // Only update online indicator visibility if chatIsOpen is defined
    if (typeof updateOnlineIndicatorVisibility === 'function' && typeof chatIsOpen !== 'undefined') {
      updateOnlineIndicatorVisibility();
    }
    
    const mobile = isMobile();
    
    if (mobile) {
      // Enhanced mobile dropdown adjustments
      menuDropdown.style.minWidth = '240px';
      menuDropdown.style.right = '-10px';
      
      // Add mobile-specific touch improvements
      chatBox.style.touchAction = 'pan-y';
      historyView.style.touchAction = 'pan-y';
      
      // Improve touch targets
      const buttons = chatBox.querySelectorAll('button');
      buttons.forEach(btn => {
        btn.style.minHeight = '44px';
        btn.style.minWidth = '44px';
      });
      
      // Add mobile-specific input improvements
      const inputs = chatBox.querySelectorAll('input');
      inputs.forEach(input => {
        input.style.fontSize = '16px'; // Prevent zoom on iOS
        input.style.minHeight = '44px';
      });
      
    } else {
      // Reset desktop styles
      menuDropdown.style.minWidth = '280px';
      menuDropdown.style.right = '0';
      
      chatBox.style.touchAction = '';
      historyView.style.touchAction = '';
      
      const buttons = chatBox.querySelectorAll('button');
      buttons.forEach(btn => {
        btn.style.minHeight = '';
        btn.style.minWidth = '';
      });
      
      const inputs = chatBox.querySelectorAll('input');
      inputs.forEach(input => {
        input.style.fontSize = '';
        input.style.minHeight = '';
      });
    }
  }

  // Enhanced event listeners for mobile responsiveness
  window.addEventListener('resize', updateMobileStyles);
  
  // Visual viewport API for better mobile keyboard handling
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateMobileStyles);
  }
  
  // Orientation change handling
  window.addEventListener('orientationchange', () => {
    setTimeout(updateMobileStyles, 100); // Small delay for orientation change
  });
  
  updateMobileStyles();
  updateOnlineIndicatorPosition();

  // Enhanced mobile touch gestures
  function addTouchGestures() {
    if (!isMobile()) return;
    
    let startY = 0;
    let startX = 0;
    let isDragging = false;
    let dragThreshold = 50;
    
    // Add touch event listeners to chat box
    chatBox.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      isDragging = false;
    }, { passive: true });
    
    chatBox.addEventListener('touchmove', (e) => {
      if (!startY) return;
      
      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = currentY - startY;
      const deltaX = currentX - startX;
      
      // Detect swipe direction
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
        isDragging = true;
        
        // Swipe down to close (only if scrolled to top)
        if (deltaY > 0 && chatBox.scrollTop === 0) {
          const opacity = Math.max(0.3, 1 - (deltaY / 200));
          chatBox.style.opacity = opacity;
          chatBox.style.transform = \`translateY(\${Math.min(deltaY * 0.5, 100)}px)\`;
        }
      }
    }, { passive: true });
    
    chatBox.addEventListener('touchend', (e) => {
      if (!isDragging || !startY) {
        // Reset styles
        chatBox.style.opacity = '';
        chatBox.style.transform = '';
        return;
      }
      
      const deltaY = e.changedTouches[0].clientY - startY;
      
      // Close widget if swiped down enough
      if (deltaY > dragThreshold && chatBox.scrollTop === 0) {
        chatBox.style.display = 'none';
        widgetIsMinimized = true;
        chatIsOpen = false;
        
        // Animate icon back to minimized state
        animateIconChange(generateWidgetContent());
        
        // Show popup after closing (only if not dismissed)
        setTimeout(() => {
          if (!popupDismissed) {
            showPopup();
          }
        }, 500);
      } else {
        // Reset styles if not enough swipe
        chatBox.style.opacity = '';
        chatBox.style.transform = '';
      }
      
      isDragging = false;
      startY = 0;
    }, { passive: true });
    
    // Add similar gestures to history view
    historyView.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      isDragging = false;
    }, { passive: true });
    
    historyView.addEventListener('touchmove', (e) => {
      if (!startY) return;
      
      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = currentY - startY;
      const deltaX = currentX - startX;
      
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
        isDragging = true;
        
        if (deltaY > 0 && historyView.scrollTop === 0) {
          const opacity = Math.max(0.3, 1 - (deltaY / 200));
          historyView.style.opacity = opacity;
          historyView.style.transform = \`translateY(\${Math.min(deltaY * 0.5, 100)}px)\`;
        }
      }
    }, { passive: true });
    
    historyView.addEventListener('touchend', (e) => {
      if (!isDragging || !startY) {
        historyView.style.opacity = '';
        historyView.style.transform = '';
        return;
      }
      
      const deltaY = e.changedTouches[0].clientY - startY;
      
      if (deltaY > dragThreshold && historyView.scrollTop === 0) {
        historyView.style.display = 'none';
        widgetIsMinimized = true;
        historyIsOpen = false;
        
        // Animate icon back to minimized state
        animateIconChange(generateWidgetContent());
        
        setTimeout(() => {
          if (!popupDismissed) {
            showPopup();
          }
        }, 500);
      } else {
        historyView.style.opacity = '';
        historyView.style.transform = '';
      }
      
      isDragging = false;
      startY = 0;
    }, { passive: true });
  }
  
  // Initialize touch gestures after a short delay to ensure elements are ready
  setTimeout(addTouchGestures, 1000);

  // Initialize online indicator visibility after everything is set up
  setTimeout(() => {
    if (typeof updateOnlineIndicatorVisibility === 'function') {
      updateOnlineIndicatorVisibility();
    }
  }, 100);

  // Support Request Functions
  function setupManualReviewButton() {
    const manualReviewConfig = WIDGET_CONFIG.manualReview || {};
    
    if (!manualReviewConfig.enabled) {
      // Hide support request button if disabled
      manualReviewButton.style.display = 'none';
      return;
    }

    // Show support request button and add click handler
    manualReviewButton.style.display = 'flex';
    manualReviewButton.addEventListener('click', showManualReviewForm);
  }

  function showManualReviewForm() {
    console.log('📧 showManualReviewForm called');
    
    // Check if support request form is already open
    if (manualReviewFormOpen) {
      console.log('🚫 Support request form already open, ignoring click');
      return;
    }
    
    const manualReviewConfig = WIDGET_CONFIG.manualReview || {};
    
    // Mark form as open
    manualReviewFormOpen = true;
    
    // Create the form as an AI message
    const messageDiv = document.createElement("div");
    const isUser = false; // This is an AI message
    
    // Store the original raw content for history saving
    messageDiv.setAttribute('data-original-content', 'manual_review_form');
    messageDiv.setAttribute('data-role', 'assistant');
    
    // Also store in our conversation messages array
    currentConversationMessages.push({
      role: 'assistant',
      content: 'manual_review_form',
      timestamp: new Date()
    });
    
    messageDiv.style.cssText = \`
      margin-bottom: 16px;
      display: flex;
      justify-content: flex-start;
      animation: slideIn 0.3s ease-out;
    \`;
    
    const messageContentDiv = document.createElement("div");
    messageContentDiv.style.cssText = \`
      display: flex;
      align-items: flex-start;
      gap: 12px;
      width: 100%;
    \`;
    
    // AI Avatar
    const assistantAvatar = document.createElement("div");
    assistantAvatar.style.cssText = \`
      width: 32px;
      height: 32px;
      background: \${WIDGET_CONFIG.theme.buttonColor || '#4f46e5'};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    \`;
    assistantAvatar.innerHTML = WIDGET_CONFIG.branding?.avatarUrl ? 
      \`<img src="\${WIDGET_CONFIG.branding.avatarUrl}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; transform: scale(\${WIDGET_CONFIG.branding?.imageSettings?.avatarZoom || 1}) translate(\${WIDGET_CONFIG.branding?.imageSettings?.avatarOffsetX || 0}px, \${WIDGET_CONFIG.branding?.imageSettings?.avatarOffsetY || 0}px); transform-origin: center center;" />\` : 
      \`<span style="color: white; font-size: 12px; font-weight: 600;">\${generateAIIcon(WIDGET_CONFIG.name, WIDGET_CONFIG.branding?.title)}</span>\`;
    
    const assistantContainer = document.createElement("div");
    assistantContainer.style.cssText = \`
      display: flex;
      flex-direction: column;
      flex: 1;
    \`;
    
    // AI Name Label
    const assistantNameLabel = document.createElement("div");
    assistantNameLabel.style.cssText = \`
      font-size: 12px;
      color: \${themeColors.textColor};
      margin-bottom: 8px;
      font-weight: 500;
      opacity: 0.7;
    \`;
    assistantNameLabel.textContent = WIDGET_CONFIG.branding.title || 'AI Assistant';
    
    // Form Bubble
    const formBubble = document.createElement("div");
    formBubble.className = 'manual-review-form-bubble';
    formBubble.style.cssText = \`
      background: \${themeColors.messageBg};
      color: \${themeColors.textColor};
      padding: 20px;
      border-radius: 18px 18px 18px 4px;
      font-size: 14px;
      width: 320px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border: 1px solid \${themeColors.borderColor};
    \`;
    
    // Form
    const form = document.createElement('form');
    form.style.cssText = \`
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
    \`;
    
    // Conversation attachment notice
    const attachmentNotice = document.createElement('div');
    attachmentNotice.style.cssText = \`
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
      font-size: 13px;
      color: #0369a1;
      display: flex;
      align-items: center;
      gap: 8px;
    \`;
    attachmentNotice.innerHTML = \`
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span><strong>Samtalen vedhæftes:</strong> Din nuværende samtale med AI'en vil automatisk blive vedhæftet til denne anmodning.</span>
    \`;
    
    // Name field
    const nameLabel = document.createElement('label');
    nameLabel.style.cssText = \`
      font-size: 14px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 8px;
      display: block;
    \`;
    nameLabel.textContent = 'Dit navn (valgfri)';
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.required = false;
    nameInput.placeholder = 'Skriv dit navn her';
    nameInput.style.cssText = \`
      height: 50px;
      padding: 0 16px;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      transition: all 0.3s ease;
      background: #ffffff;
      width: 100%;
      box-sizing: border-box;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    \`;
    nameInput.addEventListener('focus', () => {
      nameInput.style.borderColor = WIDGET_CONFIG.theme.buttonColor || '#4f46e5';
      nameInput.style.boxShadow = \`0 0 0 3px \${WIDGET_CONFIG.theme.buttonColor || '#4f46e5'}20\`;
      nameInput.style.transform = 'translateY(-1px)';
    });
    nameInput.addEventListener('blur', () => {
      nameInput.style.borderColor = '#e5e7eb';
      nameInput.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
      nameInput.style.transform = 'translateY(0)';
    });
    
    // Email field
    const emailLabel = document.createElement('label');
    emailLabel.style.cssText = \`
      font-size: 14px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 8px;
      display: block;
    \`;
    emailLabel.textContent = 'Din email';
    
    const emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.required = true;
    emailInput.placeholder = 'Skriv din email her';
    emailInput.style.cssText = nameInput.style.cssText;
    emailInput.addEventListener('focus', () => {
      emailInput.style.borderColor = WIDGET_CONFIG.theme.buttonColor || '#4f46e5';
      emailInput.style.boxShadow = \`0 0 0 3px \${WIDGET_CONFIG.theme.buttonColor || '#4f46e5'}20\`;
      emailInput.style.transform = 'translateY(-1px)';
    });
    emailInput.addEventListener('blur', () => {
      emailInput.style.borderColor = '#e5e7eb';
      emailInput.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
      emailInput.style.transform = 'translateY(0)';
    });
    
    
    // Message field
    const messageLabel = document.createElement('label');
    messageLabel.style.cssText = \`
      font-size: 14px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 8px;
      display: block;
    \`;
    messageLabel.textContent = 'Efterlad en besked (valgfri)';
    
    const messageTextarea = document.createElement('textarea');
    messageTextarea.required = false;
    messageTextarea.rows = 4;
    messageTextarea.placeholder = 'Skriv din besked her';
    messageTextarea.style.cssText = \`
      padding: 14px 16px;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      resize: vertical;
      min-height: 100px;
      background: #ffffff;
      width: 100%;
      box-sizing: border-box;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
    \`;
    messageTextarea.addEventListener('focus', () => {
      messageTextarea.style.borderColor = WIDGET_CONFIG.theme.buttonColor || '#4f46e5';
      messageTextarea.style.boxShadow = \`0 0 0 3px \${WIDGET_CONFIG.theme.buttonColor || '#4f46e5'}20\`;
      messageTextarea.style.transform = 'translateY(-1px)';
    });
    messageTextarea.addEventListener('blur', () => {
      messageTextarea.style.borderColor = '#e5e7eb';
      messageTextarea.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
      messageTextarea.style.transform = 'translateY(0)';
    });
    
    // Buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = \`
      display: flex;
      gap: 12px;
      margin-top: 8px;
      width: 100%;
    \`;
    
    // Cancel button
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.style.cssText = \`
      flex: 1;
      padding: 14px 20px;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      background: white;
      color: #6b7280;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    \`;
    cancelButton.textContent = 'Annuller';
    cancelButton.addEventListener('mouseenter', () => {
      cancelButton.style.backgroundColor = '#f9fafb';
      cancelButton.style.borderColor = '#d1d5db';
      cancelButton.style.transform = 'translateY(-1px)';
      cancelButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
    });
    cancelButton.addEventListener('mouseleave', () => {
      cancelButton.style.backgroundColor = 'white';
      cancelButton.style.borderColor = '#e5e7eb';
      cancelButton.style.transform = 'translateY(0)';
      cancelButton.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
    });
    cancelButton.addEventListener('click', () => {
      manualReviewFormOpen = false;
      messageDiv.remove();
    });
    
    // Submit button
    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.style.cssText = \`
      flex: 1;
      padding: 14px 20px;
      border: none;
      border-radius: 12px;
      background: linear-gradient(135deg, \${themeColors.buttonColor} 0%, \${themeColors.buttonColor}dd 100%);
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 12px \${themeColors.buttonColor}50;
    \`;
    submitButton.innerHTML = \`
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
      </svg>
      Send
    \`;
    submitButton.addEventListener('mouseenter', () => {
      submitButton.style.transform = 'translateY(-2px)';
      submitButton.style.boxShadow = \`0 6px 20px \${themeColors.buttonColor}60\`;
    });
    submitButton.addEventListener('mouseleave', () => {
      submitButton.style.transform = 'translateY(0)';
      submitButton.style.boxShadow = \`0 4px 12px \${themeColors.buttonColor}50\`;
    });
    
    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitButtonText = submitButton.textContent;
      submitButton.textContent = 'Submitting...';
      submitButton.disabled = true;
      
      try {
        const response = await fetch(\`\${WIDGET_CONFIG.apiUrl}/api/support-request/submit\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            widgetId: WIDGET_CONFIG.widgetId,
            conversationId: currentConversationId,
            contactInfo: {
              name: nameInput.value.trim(),
              email: emailInput.value.trim()
            },
            message: messageTextarea.value.trim()
          })
        });
        
        if (response.ok) {
          // Show success message
          formBubble.innerHTML = \`
            <div style="text-align: center; padding: 20px;">
              <div style="width: 48px; height: 48px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                <svg style="width: 24px; height: 24px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #1f2937;">Anmodning sendt</h3>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #6b7280; line-height: 1.5;">\${manualReviewConfig.successMessage || 'Tak for din anmodning! Vores team vil gennemgå din samtale og kontakte dig inden for 24 timer.'}</p>
            </div>
          \`;
          
          // Auto-remove success message after 3 seconds
          setTimeout(() => {
            manualReviewFormOpen = false;
            messageDiv.remove();
          }, 3000);
        } else {
          throw new Error('Failed to submit request');
        }
      } catch (error) {
        console.error('Error submitting support request:', error);
        submitButton.textContent = submitButtonText;
        submitButton.disabled = false;
        
        // Show error message
        const errorMsg = document.createElement('div');
        errorMsg.style.cssText = \`
          padding: 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
          font-size: 14px;
          margin-top: 16px;
        \`;
        errorMsg.textContent = 'Failed to submit request. Please try again.';
        form.appendChild(errorMsg);
        
        // Reset form state on error
        manualReviewFormOpen = false;
        
        setTimeout(() => {
          if (errorMsg.parentNode) {
            errorMsg.parentNode.removeChild(errorMsg);
          }
        }, 5000);
      }
    });
    
    // Assemble form
    form.appendChild(attachmentNotice);
    form.appendChild(nameLabel);
    form.appendChild(nameInput);
    form.appendChild(emailLabel);
    form.appendChild(emailInput);
    form.appendChild(messageLabel);
    form.appendChild(messageTextarea);
    
    buttonsContainer.appendChild(cancelButton);
    buttonsContainer.appendChild(submitButton);
    form.appendChild(buttonsContainer);
    
    // Assemble the message
    formBubble.appendChild(form);
    assistantContainer.appendChild(assistantNameLabel);
    assistantContainer.appendChild(formBubble);
    messageContentDiv.appendChild(assistantAvatar);
    messageContentDiv.appendChild(assistantContainer);
    messageDiv.appendChild(messageContentDiv);
    
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
    
    // Close on cancel button click
    cancelButton.addEventListener('click', () => {
      messageDiv.remove();
    });
    
    // Focus first input
    nameInput.focus();
  }

  // Setup support request button after initialization
  setTimeout(() => {
    setupManualReviewButton();
  }, 100);

})();
`;

    res.send(widgetScript);

  } catch (error) {
    console.error('Error serving widget:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

import clientPromise from '../../../lib/mongodb.js';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
      const db = client.db('chatwidgets');
      
      // Convert string ID to ObjectId if it's a valid ObjectId string
      let queryId = widgetId;
      if (ObjectId.isValid(widgetId)) {
        queryId = new ObjectId(widgetId);
      }
      
      widget = await db.collection('widgets').findOne({ _id: queryId });
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

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/javascript');
    
    // Smart caching based on environment and widget update time
    const isDevelopment = process.env.NODE_ENV === 'development';
    const cacheTime = isDevelopment ? 10 : 300; // 10 seconds in dev, 5 minutes in production
    
    // Use ETag based on widget's updatedAt timestamp for better cache invalidation
    const etag = `"${widget.updatedAt ? new Date(widget.updatedAt).getTime() : Date.now()}"`;
    res.setHeader('ETag', etag);
    
    // Check if client has cached version
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }
    
    res.setHeader('Cache-Control', `public, max-age=${cacheTime}, must-revalidate`);

    // Auto-detect if this should use Responses API or legacy
    const useResponsesAPI = widget.openai?.promptId && widget.openai?.promptId !== 'demo-prompt';
    
    // Generate the widget JavaScript with embedded configuration
    const widgetScript = `
(function() {
  const WIDGET_CONFIG = ${JSON.stringify({
    widgetId: widgetId,
    theme: {
      buttonColor: widget.appearance?.themeColor || widget.theme?.buttonColor || '#4f46e5',
      chatBg: widget.appearance?.chatBg || widget.theme?.chatBg || '#ffffff',
      width: widget.appearance?.width || widget.theme?.width || 450,
      height: widget.appearance?.height || widget.theme?.height || 600,
      borderRadius: widget.appearance?.borderRadius || widget.theme?.borderRadius || 20,
      shadow: widget.appearance?.shadow || widget.theme?.shadow || '0 20px 60px rgba(0,0,0,0.15)',
      backdropBlur: widget.appearance?.backdropBlur || widget.theme?.backdropBlur || false
    },
    messages: {
      welcomeMessage: widget.messages?.welcomeMessage || 'Hello! How can I help you today?',
      popupMessage: widget.messages?.popupMessage || 'Hi! Need help?',
      typingText: widget.messages?.typingText || 'AI is thinking...',
      inputPlaceholder: widget.messages?.inputPlaceholder || 'Type your message...',
      suggestedResponses: widget.messages?.suggestedResponses || []
    },
    branding: {
      title: widget.branding?.title || widget.name || 'AI Assistant',
      assistantName: widget.branding?.assistantName || 'Assistant',
      companyName: widget.branding?.companyName || 'Company',
      showBranding: widget.branding?.showBranding !== undefined ? widget.branding.showBranding : true
    },
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    apiType: useResponsesAPI ? 'responses' : 'legacy',
    openai: useResponsesAPI ? {
      promptId: widget.openai.promptId,
      version: widget.openai.version || 'latest'
    } : null
  })};

  // Generate or retrieve user ID
  let userId = localStorage.getItem(\`chatUserId_\${WIDGET_CONFIG.widgetId}\`);
  if (!userId) {
    userId = \`user_\${Math.random().toString(36).substr(2, 9)}_\${Date.now()}\`;
    localStorage.setItem(\`chatUserId_\${WIDGET_CONFIG.widgetId}\`, userId);
  }
  
  // Current conversation ID
  let currentConversationId = localStorage.getItem(\`conversationId_\${WIDGET_CONFIG.widgetId}\`) || null;
  
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

  // Create chat button with modern design matching LivePreview
  const chatBtn = document.createElement("button");
  chatBtn.innerHTML = \`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-circle transition-transform duration-300" style="width: 27.5px; height: 27.5px;">
      <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"></path>
    </svg>
  \`;
  chatBtn.style.cssText = \`
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 60px;
    height: 60px;
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
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
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

  // Create popup message (initially hidden)
  const popupMessage = document.createElement("div");
  popupMessage.style.cssText = \`
    position: fixed;
    bottom: 100px;
    right: 24px;
    max-width: 280px;
    background: white;
    border-radius: 16px;
    padding: 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.1);
    border: 1px solid #e5e7eb;
    z-index: 10001;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    color: #1f2937;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.3s ease;
    pointer-events: none;
  \`;
  
  document.body.appendChild(popupMessage);

  // Create chat box with modern design matching LivePreview
  const chatBox = document.createElement("div");
  chatBox.style.cssText = \`
    display: none;
    position: fixed;
    bottom: 80px;
    right: 24px;
    width: \${WIDGET_CONFIG.theme.width || 450}px;
    height: \${WIDGET_CONFIG.theme.height || 600}px;
    background: \${WIDGET_CONFIG.theme.chatBg || '#ffffff'};
    border-radius: \${WIDGET_CONFIG.theme.borderRadius || 20}px;
    flex-direction: column;
    z-index: 10000;
    box-shadow: \${WIDGET_CONFIG.theme.shadow || '0 20px 60px rgba(0,0,0,0.15), 0 8px 32px rgba(0,0,0,0.1)'};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    backdrop-filter: \${WIDGET_CONFIG.theme.backdropBlur ? 'blur(20px)' : 'none'};
    overflow: visible;
    transition: all 0.3s ease;
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
      <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; backdrop-filter: blur(10px);">
        E
      </div>
      <div>
        <div style="font-weight: 600; font-size: 16px;">\${WIDGET_CONFIG.branding.title || 'AI Assistant'}</div>
        <div style="font-size: 12px; opacity: 0.9;">Online now</div>
      </div>
    </div>
    
    <div style="display: flex; align-items: center; gap: 8px; position: relative; z-index: 10;">
      <div style="position: relative;">
        <button id="menuBtn_\${WIDGET_CONFIG.widgetId}" style="background: none; border: none; color: white; font-size: 16px; cursor: pointer; padding: 4px; border-radius: 50%; transition: all 0.2s ease;" onmouseover="this.style.backgroundColor='rgba(255,255,255,0.1)'" onmouseout="this.style.backgroundColor='transparent'">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
        
        <!-- Dropdown Menu -->
         <div id="menuDropdown_\${WIDGET_CONFIG.widgetId}" style="
           position: absolute;
           top: 100%;
           right: 0;
           background: white;
           border-radius: 12px;
           box-shadow: 0 8px 32px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.1);
           border: 1px solid #e5e7eb;
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
              padding: 12px 16px;
              background: none;
              border: none;
              text-align: left;
              font-size: 14px;
              color: #1f2937;
              cursor: pointer;
              transition: all 0.2s ease;
              display: flex;
              align-items: center;
              gap: 12px;
            " onmouseover="this.style.backgroundColor='#f3f4f6'" onmouseout="this.style.backgroundColor='transparent'">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Ny samtale
            </button>
            <button class="menu-option" data-action="view-conversations" style="
              width: 100%;
              padding: 12px 16px;
              background: none;
              border: none;
              text-align: left;
              font-size: 14px;
              color: #1f2937;
              cursor: pointer;
              transition: all 0.2s ease;
              display: flex;
              align-items: center;
              gap: 12px;
            " onmouseover="this.style.backgroundColor='#f3f4f6'" onmouseout="this.style.backgroundColor='transparent'">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Tidligere samtaler
            </button>
          </div>
        </div>
      </div>
      
      <button id="closeBtn_\${WIDGET_CONFIG.widgetId}" style="background: none; border: none; color: white; font-size: 16px; cursor: pointer; padding: 4px; border-radius: 50%; transition: all 0.2s ease;" onmouseover="this.style.backgroundColor='rgba(255,255,255,0.1)'" onmouseout="this.style.backgroundColor='transparent'">
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    background: #f9fafb;
    scrollbar-width: thin;
    scrollbar-color: #cbd5e0 transparent;
    height: calc(100% - 200px);
  \`;

  // Create input container matching LivePreview
  const inputContainer = document.createElement("div");
  inputContainer.style.cssText = \`
    padding: 16px;
    border-top: 1px solid #e5e7eb;
    background: white;
    border-radius: 0 0 \${WIDGET_CONFIG.theme.borderRadius || 20}px \${WIDGET_CONFIG.theme.borderRadius || 20}px;
  \`;

  const inputWrapper = document.createElement("div");
  inputWrapper.style.cssText = \`
    display: flex;
    gap: 12px;
    align-items: center;
  \`;

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = WIDGET_CONFIG.messages.inputPlaceholder || "Type your message...";
  input.style.cssText = \`
    flex: 1;
    padding: 12px 16px;
    border: 1px solid #d1d5db;
    border-radius: 24px;
    outline: none;
    font-size: 14px;
    background: #f9fafb;
    transition: all 0.2s ease;
  \`;

  const sendButton = document.createElement("button");
  sendButton.innerHTML = \`
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z"></path>
      <path d="M22 2 11 13"></path>
    </svg>
  \`;
  sendButton.style.cssText = \`
    width: 44px;
    height: 44px;
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

  // Add hover effects
  input.onfocus = () => {
    input.style.borderColor = WIDGET_CONFIG.theme.buttonColor || '#4f46e5';
    input.style.background = 'white';
  };
  
  input.onblur = () => {
    input.style.borderColor = '#d1d5db';
    input.style.background = '#f9fafb';
  };

  sendButton.onmouseover = () => {
    sendButton.style.transform = 'scale(1.05)';
    sendButton.style.boxShadow = '0 6px 16px rgba(79, 70, 229, 0.4)';
  };
  
  sendButton.onmouseout = () => {
    sendButton.style.transform = 'scale(1)';
    sendButton.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)';
  };

  inputWrapper.appendChild(input);
  inputWrapper.appendChild(sendButton);
  inputContainer.appendChild(inputWrapper);
  
  chatBox.appendChild(header);
  chatBox.appendChild(messages);
  chatBox.appendChild(inputContainer);
  
  document.body.appendChild(chatBox);

  // Create conversation history view
  const historyView = document.createElement("div");
  historyView.style.cssText = \`
    display: none;
    position: fixed;
    bottom: 80px;
    right: 24px;
    width: \${WIDGET_CONFIG.theme.width || 450}px;
    height: \${WIDGET_CONFIG.theme.height || 600}px;
    background: white;
    border-radius: \${WIDGET_CONFIG.theme.borderRadius || 20}px;
    flex-direction: column;
    z-index: 10000;
    box-shadow: \${WIDGET_CONFIG.theme.shadow || '0 20px 60px rgba(0,0,0,0.15), 0 8px 32px rgba(0,0,0,0.1)'};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    backdrop-filter: \${WIDGET_CONFIG.theme.backdropBlur ? 'blur(20px)' : 'none'};
    overflow: hidden;
    transition: all 0.3s ease;
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
    background: white;
    scrollbar-width: thin;
    scrollbar-color: #cbd5e0 transparent;
  \`;

  historyView.appendChild(historyHeader);
  historyView.appendChild(historyContent);
  document.body.appendChild(historyView);

  // Track chat state to prevent popup conflicts
  let chatIsOpen = false;
  let historyIsOpen = false;
  
  // Show initial popup message after a short delay (only if chat is closed)
  setTimeout(() => {
    if (!chatIsOpen) {
      showPopup();
    }
  }, 2000);

  // Close button functionality
  document.getElementById(\`closeBtn_\${WIDGET_CONFIG.widgetId}\`).onclick = () => {
    chatBox.style.display = "none";
    chatIsOpen = false; // Update state
    // Show popup after closing chat
    setTimeout(() => {
      showPopup();
    }, 500);
  };

  // History view button functionality
  document.getElementById(\`backBtn_\${WIDGET_CONFIG.widgetId}\`).onclick = () => {
    hideHistoryView();
  };

  document.getElementById(\`closeHistoryBtn_\${WIDGET_CONFIG.widgetId}\`).onclick = () => {
    historyView.style.display = "none";
    historyIsOpen = false;
    // Show popup after closing history
    setTimeout(() => {
      showPopup();
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
    
    // Load and display conversation history
    loadConversationHistory();
  }

  function hideHistoryView() {
    historyView.style.display = 'none';
    historyIsOpen = false;
    
    // Show chat view
    chatBox.style.display = 'flex';
    chatIsOpen = true;
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
        color: #6b7280;
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
          color: #1f2937;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        ">\${conversation.title}</div>
        <div style="
          font-size: 12px;
          color: #6b7280;
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
      item.style.backgroundColor = '#f9fafb';
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
    
    // Load conversation messages
    conversation.messages.forEach(msg => {
      // Clean the content to remove any branding prefixes
      let cleanContent = msg.content;
      if (msg.role === 'assistant') {
        cleanContent = msg.content.replace(/^ECottonshoppen Ai-Kundeservice/, '').trim();
      }
      
      addMessage(msg.role, cleanContent);
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
      padding: 12px 16px;
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
    // Don't show popup if chat is open
    if (chatIsOpen) return;
    
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
      
      chatIsOpen = false;
      historyIsOpen = false;
      
      setTimeout(() => {
        chatBox.style.display = "none";
        historyView.style.display = "none";
        // Show popup after hiding
        setTimeout(() => {
          showPopup();
        }, 500);
      }, 300);
    } else {
      // Hide popup when opening chat
      hidePopup();
      chatIsOpen = true; // Update state

      // Show animation
      chatBox.style.display = "flex";
      requestAnimationFrame(() => {
        chatBox.style.transform = 'scale(1) translateY(0)';
        chatBox.style.opacity = '1';
      });

      if (messages.children.length === 0) {
        setTimeout(() => {
          showWelcomeMessage();
        }, 300);
      }
    }
  };

  function showWelcomeMessage() {
    const welcomeMsg = WIDGET_CONFIG.messages?.welcomeMessage || 'Hello! How can I help you today?';
    addMessage('assistant', welcomeMsg);
    
    // Show suggested responses if available and no messages yet
    if (WIDGET_CONFIG.messages?.suggestedResponses?.length > 0) {
      showSuggestedResponses();
    }
  }

  function showSuggestedResponses() {
    const suggestedResponses = WIDGET_CONFIG.messages?.suggestedResponses || [];
    if (suggestedResponses.length === 0) return;
    
    // Create suggested responses container
    const responsesContainer = document.createElement('div');
    responsesContainer.style.cssText = \`
      margin: 12px 0;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
    \`;
    
    suggestedResponses.forEach((response, index) => {
      const button = document.createElement('button');
      button.textContent = response;
      button.style.cssText = \`
        padding: 6px 12px;
        font-size: 12px;
        color: #6b7280;
        background: #f3f4f6;
        border: 1px solid #d1d5db;
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
      \`;
      
      button.onmouseover = () => {
        button.style.background = '#e5e7eb';
        button.style.borderColor = '#9ca3af';
      };
      
      button.onmouseout = () => {
        button.style.background = '#f3f4f6';
        button.style.borderColor = '#d1d5db';
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
    
    // Add to messages container
    messages.appendChild(responsesContainer);
    messages.scrollTop = messages.scrollHeight;
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

  function addMessage(role, content) {
    const messageDiv = document.createElement("div");
    const isUser = role === 'user';
    
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
      justify-content: \${isUser ? 'flex-end' : 'flex-start'};
      animation: slideIn 0.3s ease-out;
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
      \`;
      messageBubble.innerHTML = formatMessage(content);
      messageDiv.appendChild(messageBubble);
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
      avatar.innerHTML = '<span style="color: white; font-size: 12px; font-weight: 600;">E</span>';
      
      const messageContent = document.createElement("div");
      messageContent.style.cssText = \`
        display: flex;
        flex-direction: column;
      \`;
      
      const nameLabel = document.createElement("div");
      nameLabel.style.cssText = \`
        font-size: 12px;
        color: #6b7280;
        margin-bottom: 8px;
        font-weight: 500;
      \`;
      nameLabel.textContent = WIDGET_CONFIG.branding.title || 'AI Assistant';
      
      const messageBubble = document.createElement("div");
      messageBubble.style.cssText = \`
        background: #f9fafb;
        color: #1f2937;
        padding: 12px 16px;
        border-radius: 18px 18px 18px 4px;
        font-size: 14px;
        max-width: 320px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        border: 1px solid #e5e7eb;
        word-wrap: break-word;
        line-height: 1.5;
      \`;
      messageBubble.className = 'messageBubble';
      messageBubble.innerHTML = formatMessage(content);
      
      messageContent.appendChild(nameLabel);
      messageContent.appendChild(messageBubble);
      assistantContainer.appendChild(avatar);
      assistantContainer.appendChild(messageContent);
      messageDiv.appendChild(assistantContainer);
    }
    
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
  }

  // Handle message sending
  async function sendMessage() {
    const msg = input.value.trim();
    if (msg === "") return;
    
    // Add user message to UI
    addMessage('user', msg);
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
    typingAvatar.innerHTML = '<span style="color: white; font-size: 12px; font-weight: 600;">E</span>';
    
    const typingContent = document.createElement("div");
    typingContent.style.cssText = \`
      display: flex;
      flex-direction: column;
    \`;
    
    const typingNameLabel = document.createElement("div");
    typingNameLabel.style.cssText = \`
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 8px;
      font-weight: 500;
    \`;
    typingNameLabel.textContent = WIDGET_CONFIG.branding.title || 'AI Assistant';
    
    const typingBubble = document.createElement("div");
    typingBubble.style.cssText = \`
      background: #f9fafb;
      color: #1f2937;
      padding: 12px 16px;
      border-radius: 18px 18px 18px 4px;
      font-size: 14px;
      max-width: 320px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      gap: 8px;
    \`;
    typingBubble.innerHTML = \`
      <div style="display: flex; gap: 4px;">
        <div style="width: 6px; height: 6px; background: #9ca3af; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; animation-delay: -0.32s;"></div>
        <div style="width: 6px; height: 6px; background: #9ca3af; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; animation-delay: -0.16s;"></div>
        <div style="width: 6px; height: 6px; background: #9ca3af; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both;"></div>
      </div>
      <span style="font-weight: 500;">\${WIDGET_CONFIG.messages?.typingText || 'AI is thinking...'}</span>
    \`;
    
    typingContent.appendChild(typingNameLabel);
    typingContent.appendChild(typingBubble);
    typingContainer.appendChild(typingAvatar);
    typingContainer.appendChild(typingContent);
    typingDiv.appendChild(typingContainer);
    
    messages.appendChild(typingDiv);
    messages.scrollTop = messages.scrollHeight;

    try {
      // Use appropriate API endpoint based on widget type
      const apiEndpoint = WIDGET_CONFIG.apiType === 'responses' ? 
        \`\${WIDGET_CONFIG.apiUrl}/api/respond-responses\` : 
        \`\${WIDGET_CONFIG.apiUrl}/api/respond\`;
        
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          widgetId: WIDGET_CONFIG.widgetId, 
          message: msg, 
          userId,
          conversationId: currentConversationId 
        }),
        signal: controller.signal
      });
      
      // Clear timeout if request completes
      clearTimeout(timeoutId);
      
      // Remove typing indicator
      messages.removeChild(typingDiv);
      
      if (res.ok) {
        const data = await res.json();
        
        // Update conversation ID if new conversation was created
        if (data.conversationId && data.conversationId !== currentConversationId) {
          currentConversationId = data.conversationId;
          localStorage.setItem(\`conversationId_\${WIDGET_CONFIG.widgetId}\`, currentConversationId);
        }

        addMessage('assistant', data.reply);
        
        // Save conversation to history
        // Use the stored raw messages to preserve formatting for history
        const allMessages = currentConversationMessages.map(msg => {
          // Clean the content to remove any branding prefixes
          let cleanContent = msg.content;
          if (msg.role === 'assistant') {
            cleanContent = msg.content.replace(/^ECottonshoppen Ai-Kundeservice/, '').trim();
          }
          
          return {
            role: msg.role,
            content: cleanContent || ''
          };
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
        let errorMessage = 'Sorry, I encountered an error. Please try again.';
        
        try {
          const errorData = await res.json();
          if (errorData.error) {
            // Use specific error message from API
            errorMessage = errorData.error;
            
            // Add details if available and in development
            if (errorData.details && WIDGET_CONFIG.apiUrl.includes('localhost')) {
              errorMessage += ' (' + errorData.details + ')';
            }
          }
        } catch (parseError) {
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
      
      // Provide more specific error messages based on error type
      let errorMessage = 'Sorry, I encountered a connection error. Please try again.';
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Network connection failed. Please check your internet connection and try again.';
      } else if (error.name === 'AbortError') {
        errorMessage = 'Request was cancelled. Please try again.';
      } else if (error.message && error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      } else if (WIDGET_CONFIG.apiUrl.includes('localhost')) {
        // In development, show more details
        errorMessage = 'Connection error: ' + error.message;
      }
      
      addMessage('assistant', errorMessage);
    }
  }

  // Enter key to send message
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });

  // Send button click
  sendButton.onclick = sendMessage;

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
  \`;
  document.head.appendChild(style);

  // Handle mobile responsiveness
  function updateMobileStyles() {
    if (window.innerWidth <= 480) {
      chatBox.style.width = 'calc(100vw - 40px)';
      chatBox.style.height = 'calc(100vh - 120px)';
      chatBox.style.right = '20px';
      chatBox.style.bottom = '70px';
      
      historyView.style.width = 'calc(100vw - 40px)';
      historyView.style.height = 'calc(100vh - 120px)';
      historyView.style.right = '20px';
      historyView.style.bottom = '70px';
      
      // Adjust dropdown menu for mobile
      menuDropdown.style.minWidth = '240px';
      menuDropdown.style.right = '-10px';
    } else {
      chatBox.style.width = '\${WIDGET_CONFIG.theme.width || 400}px';
      chatBox.style.height = '\${WIDGET_CONFIG.theme.height || 600}px';
      chatBox.style.right = '24px';
      chatBox.style.bottom = '80px';
      
      historyView.style.width = '\${WIDGET_CONFIG.theme.width || 400}px';
      historyView.style.height = '\${WIDGET_CONFIG.theme.height || 600}px';
      historyView.style.right = '24px';
      historyView.style.bottom = '80px';
      
      // Reset dropdown menu for desktop
      menuDropdown.style.minWidth = '280px';
      menuDropdown.style.right = '0';
    }
  }

  window.addEventListener('resize', updateMobileStyles);
  updateMobileStyles();

})();
`;

    res.send(widgetScript);

  } catch (error) {
    console.error('Error serving widget:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

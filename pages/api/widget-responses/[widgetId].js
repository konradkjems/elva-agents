import clientPromise from "../../../lib/mongodb";
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Handle HEAD requests (Chrome compatibility)
  if (req.method === 'HEAD') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { widgetId } = req.query;

    if (!widgetId) {
      return res.status(400).json({ error: 'Widget ID required' });
    }

    const client = await clientPromise;
    const db = client.db("chatwidgets");
    
    // Convert string ID to ObjectId if it's a valid ObjectId string
    let queryId = widgetId;
    if (ObjectId.isValid(widgetId)) {
      queryId = new ObjectId(widgetId);
    }
    
    // Get widget configuration to verify it exists and get theme
    const widget = await db.collection("widgets").findOne({ _id: queryId });
    if (!widget) {
      return res.status(404).json({ error: "Widget not found" });
    }

    // Check if widget is configured for Responses API
    if (!widget.openai || !widget.openai.promptId) {
      return res.status(400).json({ 
        error: "Widget not configured for Responses API",
        details: "This widget needs openai.promptId configuration"
      });
    }

    // Set content type to JavaScript
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

    // Debug log for showTypingText setting
    console.log('🔧 Widget Responses Debug:', {
      widgetId: widgetId,
      showTypingText: widget.messages?.showTypingText,
      typingText: widget.messages?.typingText,
      updatedAt: widget.updatedAt
    });

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
      showTypingText: widget.messages?.showTypingText !== false,
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
    apiType: 'responses', // Indicate this uses Responses API
    openai: {
      promptId: widget.openai.promptId,
      version: widget.openai.version || 'latest'
    }
  })};

  // Generate or retrieve user ID
  let userId = localStorage.getItem(\`chatUserId_\${WIDGET_CONFIG.widgetId}\`);
  if (!userId) {
    userId = \`user_\${Math.random().toString(36).substr(2, 9)}_\${Date.now()}\`;
    localStorage.setItem(\`chatUserId_\${WIDGET_CONFIG.widgetId}\`, userId);
  }
  
  // Current conversation ID
  let currentConversationId = localStorage.getItem(\`conversationId_\${WIDGET_CONFIG.widgetId}\`) || null;

  // Create chat button with modern design matching LivePreview
  const chatBtn = document.createElement("button");
  chatBtn.innerHTML = \`
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
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
    chatBtn.style.transform = 'scale(1.05) translateY(-2px)';
    chatBtn.style.boxShadow = '0 12px 35px rgba(79, 70, 229, 0.4)';
  };
  
  chatBtn.onmouseout = () => {
    chatBtn.style.transform = 'scale(1) translateY(0)';
    chatBtn.style.boxShadow = '0 8px 25px rgba(79, 70, 229, 0.3)';
  };
  
  document.body.appendChild(chatBtn);

  // Create chat box with modern design
  const chatBox = document.createElement("div");
  chatBox.style.cssText = \`
    display: none;
    position: fixed;
    bottom: 100px;
    right: 24px;
    width: 450px;
    height: 600px;
    background: \${WIDGET_CONFIG.theme.chatBg || '#ffffff'};
    border: none;
    border-radius: 20px;
    flex-direction: column;
    z-index: 10000;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    backdrop-filter: blur(20px);
    transform: scale(0.95) translateY(10px);
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    overflow: hidden;
  \`;
  document.body.appendChild(chatBox);

  // Chat header with modern design
  const header = document.createElement("div");
  header.style.cssText = \`
    padding: 20px 20px 16px 20px;
    border-bottom: 1px solid rgba(229, 231, 235, 0.3);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(135deg, rgba(249, 250, 251, 0.9), rgba(243, 244, 246, 0.9));
    border-radius: 20px 20px 0 0;
    backdrop-filter: blur(10px);
  \`;
  header.innerHTML = \`
    <div>
      <div style="display: flex; align-items: center; margin-bottom: 4px;">
        <div style="width: 8px; height: 8px; background: #10b981; border-radius: 50%; margin-right: 8px; animation: pulse 2s infinite;"></div>
        <span style="font-weight: 700; color: #111827; font-size: 16px;">AI Assistant</span>
      </div>
      <div style="font-size: 11px; color: #6b7280; font-weight: 500;">
        Powered by OpenAI • Online
      </div>
    </div>
    <button id="newChatBtn_\${WIDGET_CONFIG.widgetId}" style="
      background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
      border: none;
      border-radius: 12px;
      padding: 8px 12px;
      cursor: pointer;
      font-size: 12px;
      color: #374151;
      font-weight: 600;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    ">New Chat</button>
  \`;
  chatBox.appendChild(header);

  // Messages container with modern scrollbar
  const messages = document.createElement("div");
  messages.style.cssText = \`
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    scroll-behavior: smooth;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(248, 250, 252, 0.05));
  \`;
  
  // Add custom scrollbar styles
  const scrollbarStyle = document.createElement('style');
  scrollbarStyle.textContent = \`
    .widget-messages::-webkit-scrollbar {
      width: 6px;
    }
    .widget-messages::-webkit-scrollbar-track {
      background: rgba(243, 244, 246, 0.5);
      border-radius: 3px;
    }
    .widget-messages::-webkit-scrollbar-thumb {
      background: rgba(156, 163, 175, 0.5);
      border-radius: 3px;
    }
    .widget-messages::-webkit-scrollbar-thumb:hover {
      background: rgba(156, 163, 175, 0.8);
    }
  \`;
  document.head.appendChild(scrollbarStyle);
  messages.className = 'widget-messages';
  
  chatBox.appendChild(messages);

  // Input container with modern design
  const inputContainer = document.createElement("div");
  inputContainer.style.cssText = \`
    border-top: 1px solid rgba(229, 231, 235, 0.3);
    padding: 16px 20px 20px 20px;
    background: linear-gradient(135deg, rgba(249, 250, 251, 0.9), rgba(243, 244, 246, 0.9));
    border-radius: 0 0 20px 20px;
    backdrop-filter: blur(10px);
  \`;

  const inputWrapper = document.createElement("div");
  inputWrapper.style.cssText = \`
    position: relative;
    display: flex;
    align-items: center;
    background: white;
    border-radius: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
  \`;

  const input = document.createElement("input");
  input.placeholder = "Type your message...";
  input.style.cssText = \`
    flex: 1;
    padding: 12px 16px;
    border: none;
    border-radius: 16px;
    outline: none;
    font-size: 14px;
    background: transparent;
    color: #1f2937;
    font-family: inherit;
  \`;

  const sendButton = document.createElement("button");
  sendButton.innerHTML = \`
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  \`;
  sendButton.style.cssText = \`
    padding: 8px;
    margin-right: 4px;
    border: none;
    border-radius: 12px;
    background: \${WIDGET_CONFIG.theme.buttonColor || '#4f46e5'};
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    opacity: 0.7;
  \`;
  
  input.onfocus = () => {
    inputWrapper.style.boxShadow = \`0 4px 12px rgba(79, 70, 229, 0.15)\`;
    inputWrapper.style.transform = 'translateY(-1px)';
  };
  
  input.onblur = () => {
    inputWrapper.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
    inputWrapper.style.transform = 'translateY(0)';
  };

  input.oninput = () => {
    sendButton.style.opacity = input.value.trim() ? '1' : '0.7';
  };
  
  inputWrapper.appendChild(input);
  inputWrapper.appendChild(sendButton);
  inputContainer.appendChild(inputWrapper);
  chatBox.appendChild(inputContainer);

  // New conversation button functionality
  document.getElementById(\`newChatBtn_\${WIDGET_CONFIG.widgetId}\`).onclick = () => {
    currentConversationId = null;
    localStorage.removeItem(\`conversationId_\${WIDGET_CONFIG.widgetId}\`);
    messages.innerHTML = '';
    showWelcomeMessage();
  };

  // Load previous conversation if exists
  if (currentConversationId) {
    loadConversationHistory();
  } else {
    // Show welcome message for new conversations
    showWelcomeMessage();
  }

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
    // Convert text to HTML with basic formatting
    return content
      // Convert line breaks to <br>
      .replace(/\\n/g, '<br>')
      // Convert bullet points (- item) to HTML list items
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      // Wrap consecutive list items in <ul>
      .replace(/(<li>.*<\\/li>(\\s*<li>.*<\\/li>)*)/g, '<ul>$1</ul>')
      // Convert numbered lists (1. item) to HTML ordered list
      .replace(/^(\\d+)\\. (.+)$/gm, '<li>$2</li>')
      // Wrap numbered list items in <ol>
      .replace(/(<li>.*<\\/li>(\\s*<li>.*<\\/li>)*)/g, '<ol>$1</ol>')
      // Convert bold text (**text** or __text__)
      .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      // Convert italic text (*text* or _text_)
      .replace(/\\*(.*?)\\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      // Convert code blocks (temporarily disabled due to syntax issues)
  }

  function addMessage(role, content) {
    const messageDiv = document.createElement("div");
    const isUser = role === 'user';
    
    messageDiv.style.cssText = \`
      margin-bottom: 16px;
      display: flex;
      justify-content: \${isUser ? 'flex-end' : 'flex-start'};
      animation: slideIn 0.3s ease-out;
    \`;
    
    const messageBubble = document.createElement("div");
    messageBubble.style.cssText = \`
      max-width: 85%;
      padding: 12px 16px;
      border-radius: \${isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px'};
      font-size: 14px;
      line-height: 1.5;
      background: \${isUser ? 
        \`linear-gradient(135deg, \${WIDGET_CONFIG.theme.buttonColor || '#4f46e5'}, \${adjustColor(WIDGET_CONFIG.theme.buttonColor || '#4f46e5', -20)})\` : 
        'linear-gradient(135deg, #ffffff, #f8fafc)'};
      color: \${isUser ? 'white' : '#1f2937'};
      word-wrap: break-word;
      box-shadow: \${isUser ? 
        '0 2px 8px rgba(79, 70, 229, 0.3)' : 
        '0 2px 8px rgba(0, 0, 0, 0.1)'};
      border: \${isUser ? 'none' : '1px solid #e5e7eb'};
      position: relative;
    \`;
    
    // Convert markdown to formatted HTML
    const htmlContent = convertMarkdownToHTML(content);
    messageBubble.innerHTML = htmlContent;
    
    // Style markdown elements
    
    // Style links
    const links = messageBubble.querySelectorAll('a');
    links.forEach(link => {
      link.style.cssText = \`
        color: \${isUser ? '#bfdbfe' : WIDGET_CONFIG.theme.buttonColor || '#4f46e5'};
        text-decoration: underline;
        font-weight: 500;
        transition: opacity 0.2s ease;
      \`;
      
      link.onmouseover = () => {
        link.style.opacity = '0.8';
      };
      link.onmouseout = () => {
        link.style.opacity = '1';
      };
    });
    
    // Style lists
    const lists = messageBubble.querySelectorAll('ul');
    lists.forEach(list => {
      list.style.cssText = \`
        margin: 6px 0;
        padding-left: 16px;
        list-style: none;
      \`;
    });
    
    // Style list items
    const listItems = messageBubble.querySelectorAll('li');
    listItems.forEach(item => {
      item.style.cssText = \`
        margin: 0px 0;
        position: relative;
        line-height: 1.5;
        padding-left: 0px;
      \`;
      
      // Add custom bullet point
      item.innerHTML = '• ' + item.innerHTML;
    });
    
    // Style paragraphs
    const paragraphs = messageBubble.querySelectorAll('p');
    paragraphs.forEach(p => {
      p.style.cssText = \`
        margin: 6px 0;
        line-height: 1.5;
      \`;
    });
    
    // Style bold text
    const boldElements = messageBubble.querySelectorAll('strong');
    boldElements.forEach(bold => {
      bold.style.cssText = \`
        font-weight: 700;
        color: \${isUser ? '#ffffff' : '#1f2937'};
      \`;
    });
    
    // Style italic text
    const italicElements = messageBubble.querySelectorAll('em');
    italicElements.forEach(italic => {
      italic.style.cssText = \`
        font-style: italic;
        color: \${isUser ? '#e5e7eb' : '#4b5563'};
      \`;
    });
    
    messageDiv.appendChild(messageBubble);
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
  }

  // Helper function to convert markdown to HTML
  function convertMarkdownToHTML(text) {
    let html = text;
    
    // Convert bullet points (• or - or *)
    html = html.replace(/^[•\\-\\*]\\s+(.+)$/gm, '<li>$1</li>');
    
    // Wrap consecutive list items in <ul> tags
    html = html.replace(/((<li>.*<\\/li>\\s*)+)/g, '<ul>$1</ul>');
    
    // Convert markdown links [text](url) to HTML <a> tags
    html = html.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Convert **bold** text
    html = html.replace(/\\*\\*([^\\*]+)\\*\\*/g, '<strong>$1</strong>');
    
    // Convert *italic* text
    html = html.replace(/\\*([^\\*]+)\\*/g, '<em>$1</em>');
    
    // Convert line breaks to <br> tags but preserve paragraph structure
    html = html.replace(/\\n\\n/g, '</p><p>');
    html = html.replace(/\\n/g, '<br>');
    
    // Wrap in paragraph tags if not already wrapped
    if (!html.includes('<p>') && !html.includes('<ul>')) {
      html = '<p>' + html + '</p>';
    } else if (html.includes('<ul>')) {
      // Handle mixed content with lists
      html = html.replace(/^(?!<ul>|<li>)(.+?)(?=<ul>|$)/gm, '<p>$1</p>');
    }
    
    // Clean up empty paragraphs
    html = html.replace(/<p><\\/p>/g, '');
    html = html.replace(/<p>\\s*<\\/p>/g, '');
    
    return html;
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
    return (usePound ? '#' : '') + String('000000' + (r << 16 | g << 8 | b).toString(16)).slice(-6);
  }

  async function loadConversationHistory() {
    try {
      const res = await fetch(\`\${WIDGET_CONFIG.apiUrl}/api/conversation\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: currentConversationId })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          messages.innerHTML = '';
          data.messages.forEach(msg => {
            addMessage(msg.role, msg.content);
          });
        } else {
          showWelcomeMessage();
        }
      } else {
        // Conversation not found, start fresh
        currentConversationId = null;
        localStorage.removeItem(\`conversationId_\${WIDGET_CONFIG.widgetId}\`);
        showWelcomeMessage();
      }
    } catch (error) {
      console.log('Could not load conversation history');
      showWelcomeMessage();
    }
  }

  // Toggle chat box visibility with smooth animations
  chatBtn.onclick = () => {
    const isVisible = chatBox.style.display === "flex";
    
    if (isVisible) {
      // Hide animation
      chatBox.style.transform = 'scale(0.95) translateY(10px)';
      chatBox.style.opacity = '0';
      setTimeout(() => {
        chatBox.style.display = "none";
      }, 300);
    } else {
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

  // Handle message sending
  async function sendMessage() {
    const msg = input.value.trim();
    if (msg === "") return;
    
    // Add user message to UI
    addMessage('user', msg);
    input.value = "";
    
    // Show modern typing indicator
    const typingDiv = document.createElement("div");
    typingDiv.style.cssText = \`
      margin-bottom: 16px;
      display: flex;
      justify-content: flex-start;
      animation: slideIn 0.3s ease-out;
    \`;
    
    const showTypingText = WIDGET_CONFIG.messages?.showTypingText !== false;
    const typingText = WIDGET_CONFIG.messages?.typingText || 'AI is thinking...';
    
    typingDiv.innerHTML = \`
      <div class="widget-typing" style="
        background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
        padding: 12px 16px;
        border-radius: 18px 18px 18px 4px;
        font-size: 14px;
        color: #6b7280;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        border: 1px solid #e5e7eb;
        display: flex;
        align-items: center;
        \${showTypingText ? 'gap: 8px;' : ''}
      ">
        <div style="display: flex;">
          <div style="width: 6px; height: 6px; background: #9ca3af; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; animation-delay: -0.32s; margin-right: 4px;"></div>
          <div style="width: 6px; height: 6px; background: #9ca3af; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; animation-delay: -0.16s; margin-right: 4px;"></div>
          <div style="width: 6px; height: 6px; background: #9ca3af; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both;"></div>
        </div>
        \${showTypingText ? \`<span style="font-weight: 500;">\${typingText}</span>\` : ''}
      </div>
    \`;
    messages.appendChild(typingDiv);
    messages.scrollTop = messages.scrollHeight;

    try {
      // Use Responses API endpoint
      const res = await fetch(\`\${WIDGET_CONFIG.apiUrl}/api/respond-responses\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          widgetId: WIDGET_CONFIG.widgetId, 
          message: msg, 
          userId,
          conversationId: currentConversationId 
        })
      });
      
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
        
        // Optional: Log metadata for debugging
        if (data.metadata && WIDGET_CONFIG.apiUrl.includes('localhost')) {
          console.log('Responses API metadata:', data.metadata);
        }
      } else {
        const errorData = await res.json();
        addMessage('assistant', \`Sorry, I encountered an error: \${errorData.error || 'Unknown error'}\`);
      }
    } catch (error) {
      // Remove typing indicator
      if (typingDiv.parentNode) {
        messages.removeChild(typingDiv);
      }
      addMessage('assistant', 'Sorry, I encountered a connection error. Please try again.');
      console.error('Widget error:', error);
    }
  }

  // Send message on enter key or send button
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });

  sendButton.onclick = () => {
    sendMessage();
  };

  // Handle mobile responsiveness
  function updateMobileStyles() {
    if (window.innerWidth <= 480) {
      chatBox.style.width = 'calc(100vw - 40px)';
      chatBox.style.height = 'calc(100vh - 140px)';
      chatBox.style.right = '20px';
      chatBox.style.bottom = '70px';
    } else if (window.innerWidth <= 768) {
      chatBox.style.width = '400px';
      chatBox.style.height = '550px';
      chatBox.style.right = '20px';
      chatBox.style.bottom = '90px';
    } else {
      chatBox.style.width = '450px';
      chatBox.style.height = '600px';
      chatBox.style.right = '24px';
      chatBox.style.bottom = '100px';
    }
  }

  window.addEventListener('resize', updateMobileStyles);
  updateMobileStyles();

  // Add CSS animations and modern styling
  const style = document.createElement('style');
  style.textContent = \`
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes bounce {
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
    
    .widget-typing {
      animation: pulse 1.5s ease-in-out infinite;
    }
    
    .widget-message-enter {
      animation: slideIn 0.3s ease-out;
    }
    
    .widget-online-indicator {
      animation: pulse 2s infinite;
    }
  \`;
  document.head.appendChild(style);

})();
`;

    // Set proper JavaScript headers and send the script
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(widgetScript);

  } catch (error) {
    console.error('Error serving Responses API widget:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

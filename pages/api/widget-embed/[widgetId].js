import clientPromise from '../../../lib/mongodb.js';

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
      const db = client.db('elva-agents');
      widget = await db.collection('widgets').findOne({ _id: widgetId });
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
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    // Auto-detect if this should use Responses API or legacy
    const useResponsesAPI = widget.openai?.promptId && widget.openai?.promptId !== 'demo-prompt';
    
    // Generate the widget JavaScript with embedded configuration
    const widgetScript = `
(function() {
  const WIDGET_CONFIG = ${JSON.stringify({
    widgetId: widgetId,
    theme: widget.theme || {},
    messages: widget.messages || {},
    branding: widget.branding || {},
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

  // Create chat button with modern design
  const chatBtn = document.createElement("button");
  chatBtn.innerHTML = \`
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 2H4C2.9 2 2 2.9 2 4V18L6 14H20C21.1 14 22 13.1 22 12V4C22 2.9 21.1 2 20 2Z" fill="currentColor"/>
      <circle cx="7" cy="8" r="1" fill="white"/>
      <circle cx="12" cy="8" r="1" fill="white"/>
      <circle cx="17" cy="8" r="1" fill="white"/>
    </svg>
    <span style="margin-left: 8px;">Chat</span>
  \`;
  chatBtn.style.cssText = \`
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 14px 20px;
    border-radius: 50px;
    background: linear-gradient(135deg, \${WIDGET_CONFIG.theme.buttonColor || '#4f46e5'}, \${adjustColor(WIDGET_CONFIG.theme.buttonColor || '#4f46e5', -20)});
    color: white;
    border: none;
    cursor: pointer;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 8px 25px rgba(79, 70, 229, 0.3);
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
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
    border: 1px solid rgba(255, 255, 255, 0.2);
    overflow: hidden;
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
    overflow: hidden;
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
      <button style="background: none; border: none; color: white; font-size: 16px; cursor: pointer; padding: 4px; border-radius: 50%; transition: all 0.2s ease;" onmouseover="this.style.backgroundColor='rgba(255,255,255,0.1)'" onmouseout="this.style.backgroundColor='transparent'">
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>
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
  sendButton.innerHTML = '→';
  sendButton.style.cssText = \`
    width: 44px;
    height: 44px;
    background: \${WIDGET_CONFIG.theme.buttonColor || '#4f46e5'};
    color: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    font-size: 18px;
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

  // Close button functionality
  document.getElementById(\`closeBtn_\${WIDGET_CONFIG.widgetId}\`).onclick = () => {
    chatBox.style.display = "none";
  };

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

  function addMessage(role, content) {
    const messageDiv = document.createElement("div");
    const isUser = role === 'user';
    
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
      messageBubble.textContent = content;
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
      \`;
      messageBubble.textContent = content;
      
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
        
      const res = await fetch(apiEndpoint, {
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
          console.log('API metadata:', data.metadata);
        }
      } else {
        addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
      }
    } catch (error) {
      // Remove typing indicator
      if (typingDiv.parentNode) {
        messages.removeChild(typingDiv);
      }
      addMessage('assistant', 'Sorry, I encountered a connection error. Please try again.');
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
  \`;
  document.head.appendChild(style);

  // Handle mobile responsiveness
  function updateMobileStyles() {
    if (window.innerWidth <= 480) {
      chatBox.style.width = 'calc(100vw - 40px)';
      chatBox.style.height = 'calc(100vh - 120px)';
      chatBox.style.right = '20px';
      chatBox.style.bottom = '70px';
    } else {
      chatBox.style.width = '\${WIDGET_CONFIG.theme.width || 400}px';
      chatBox.style.height = '\${WIDGET_CONFIG.theme.height || 600}px';
      chatBox.style.right = '24px';
      chatBox.style.bottom = '80px';
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

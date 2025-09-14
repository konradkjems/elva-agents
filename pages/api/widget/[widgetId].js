import clientPromise from "../../../lib/mongodb";

export default async function handler(req, res) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
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
    
    // Get widget configuration to verify it exists and get theme
    const widget = await db.collection("widgets").findOne({ _id: widgetId });
    if (!widget) {
      return res.status(404).json({ error: "Widget not found" });
    }

    // Set content type to JavaScript
    res.setHeader('Content-Type', 'application/javascript');
    
    // Smart caching based on environment and widget update time
    const isDevelopment = process.env.NODE_ENV === 'development';
    const cacheTime = isDevelopment ? 10 : 3600; // 10 seconds in dev, 1 hour in production
    
    // Use ETag based on widget's updatedAt timestamp for better cache invalidation
    const etag = `"${widget.updatedAt ? new Date(widget.updatedAt).getTime() : Date.now()}"`;
    res.setHeader('ETag', etag);
    
    // Check if client has cached version
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }
    
    res.setHeader('Cache-Control', `public, max-age=${cacheTime}, must-revalidate`);

    // Generate the widget JavaScript with embedded configuration
    const widgetScript = `
(function() {
  const WIDGET_CONFIG = ${JSON.stringify({
    widgetId: widgetId,
    theme: widget.theme || {},
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  })};

  // Generate or retrieve user ID
  let userId = localStorage.getItem(\`chatUserId_\${WIDGET_CONFIG.widgetId}\`);
  if (!userId) {
    userId = \`user_\${Math.random().toString(36).substr(2, 9)}_\${Date.now()}\`;
    localStorage.setItem(\`chatUserId_\${WIDGET_CONFIG.widgetId}\`, userId);
  }
  
  // Current conversation ID
  let currentConversationId = localStorage.getItem(\`conversationId_\${WIDGET_CONFIG.widgetId}\`) || null;

  // Create chat button
  const chatBtn = document.createElement("button");
  chatBtn.innerText = "Chat 💬";
  chatBtn.style.cssText = \`
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 10px 15px;
    border-radius: 10px;
    background: \${WIDGET_CONFIG.theme.buttonColor || '#4f46e5'};
    color: white;
    border: none;
    cursor: pointer;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: transform 0.2s ease;
  \`;
  
  chatBtn.onmouseover = () => {
    chatBtn.style.transform = 'scale(1.05)';
  };
  
  chatBtn.onmouseout = () => {
    chatBtn.style.transform = 'scale(1)';
  };
  
  document.body.appendChild(chatBtn);

  // Create chat box
  const chatBox = document.createElement("div");
  chatBox.style.cssText = \`
    display: none;
    position: fixed;
    bottom: 70px;
    right: 20px;
    width: 350px;
    height: 500px;
    background: \${WIDGET_CONFIG.theme.chatBg || '#ffffff'};
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    flex-direction: column;
    z-index: 10000;
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  \`;
  document.body.appendChild(chatBox);

  // Chat header with new conversation button
  const header = document.createElement("div");
  header.style.cssText = \`
    padding: 15px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f9fafb;
    border-radius: 12px 12px 0 0;
  \`;
  header.innerHTML = \`
    <span style="font-weight: 600; color: #374151;">Chat Assistant</span>
    <button id="newChatBtn_\${WIDGET_CONFIG.widgetId}" style="
      background: #e5e7eb;
      border: none;
      border-radius: 6px;
      padding: 6px 10px;
      cursor: pointer;
      font-size: 12px;
      color: #6b7280;
      transition: background-color 0.2s ease;
    ">New Chat</button>
  \`;
  chatBox.appendChild(header);

  // Messages container
  const messages = document.createElement("div");
  messages.style.cssText = \`
    flex: 1;
    overflow-y: auto;
    padding: 15px;
    scroll-behavior: smooth;
  \`;
  chatBox.appendChild(messages);

  // Input container
  const inputContainer = document.createElement("div");
  inputContainer.style.cssText = \`
    border-top: 1px solid #e5e7eb;
    padding: 15px;
    background: #f9fafb;
    border-radius: 0 0 12px 12px;
  \`;

  const input = document.createElement("input");
  input.placeholder = "Type your message...";
  input.style.cssText = \`
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    outline: none;
    font-size: 14px;
    background: white;
    transition: border-color 0.2s ease;
  \`;
  
  input.onfocus = () => {
    input.style.borderColor = WIDGET_CONFIG.theme.buttonColor || '#4f46e5';
  };
  
  input.onblur = () => {
    input.style.borderColor = '#d1d5db';
  };
  
  inputContainer.appendChild(input);
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

  function addMessage(role, content) {
    const messageDiv = document.createElement("div");
    const isUser = role === 'user';
    
    messageDiv.style.cssText = \`
      margin-bottom: 12px;
      display: flex;
      justify-content: \${isUser ? 'flex-end' : 'flex-start'};
    \`;
    
    const messageBubble = document.createElement("div");
    messageBubble.style.cssText = \`
      max-width: 80%;
      padding: 10px 12px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.4;
      background: \${isUser ? (WIDGET_CONFIG.theme.buttonColor || '#4f46e5') : '#f3f4f6'};
      color: \${isUser ? 'white' : '#374151'};
      word-wrap: break-word;
    \`;
    
    messageBubble.textContent = content;
    messageDiv.appendChild(messageBubble);
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
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

  // Toggle chat box visibility
  chatBtn.onclick = () => {
    const isVisible = chatBox.style.display === "flex";
    chatBox.style.display = isVisible ? "none" : "flex";
    
    if (!isVisible && messages.children.length === 0) {
      showWelcomeMessage();
    }
  };

  // Handle message sending
  async function sendMessage() {
    const msg = input.value.trim();
    if (msg === "") return;
    
    // Add user message to UI
    addMessage('user', msg);
    input.value = "";
    
    // Show typing indicator
    const typingDiv = document.createElement("div");
    typingDiv.style.cssText = \`
      margin-bottom: 12px;
      display: flex;
      justify-content: flex-start;
    \`;
    typingDiv.innerHTML = \`
      <div style="
        background: #f3f4f6;
        padding: 10px 12px;
        border-radius: 12px;
        font-size: 14px;
        color: #6b7280;
      ">Typing...</div>
    \`;
    messages.appendChild(typingDiv);
    messages.scrollTop = messages.scrollHeight;

    try {
      const res = await fetch(\`\${WIDGET_CONFIG.apiUrl}/api/respond\`, {
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

  // Handle mobile responsiveness
  function updateMobileStyles() {
    if (window.innerWidth <= 480) {
      chatBox.style.width = 'calc(100vw - 40px)';
      chatBox.style.height = 'calc(100vh - 120px)';
      chatBox.style.right = '20px';
      chatBox.style.bottom = '70px';
    } else {
      chatBox.style.width = '350px';
      chatBox.style.height = '500px';
      chatBox.style.right = '20px';
      chatBox.style.bottom = '70px';
    }
  }

  window.addEventListener('resize', updateMobileStyles);
  updateMobileStyles();

})();
`;

    res.send(widgetScript);

  } catch (error) {
    console.error('Error serving widget:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

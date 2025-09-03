
# Product Requirements Document (PRD)

## Projekt: AI Chat Widget Platform

### Baggrund
Målet er at bygge en AI-baseret chatwidget, som nemt kan integreres på kunders hjemmesider via et enkelt script-tag. Chatwidgeten skal bruge OpenAI Responses API på backend og understøtte konfigurerbare widgets gennem et widgetId.

---

## 1. Overordnet Arkitektur

1. **Frontend Widget**  
   - Hostes som `widget.js` via CDN eller egen server.  
   - Kunden indsætter i HTML:  
     ```html
     <script src="https://elva-solutions.com/widget/[widgetId]/widget.js"></script>
     ```  
   - Scriptet bygger en chat-knap i hjørnet af siden, åbner en chatboks, sender input til backend og viser AI-svar.

2. **Backend API**  
   - Node.js/Express eller Next.js API routes (fx hostet på Vercel).  
   - Endpoint: `POST /api/respond`  
   - Input: `{ widgetId, message }`  
   - Henter widget-konfiguration fra database, kalder OpenAI Responses API og returnerer `{ reply: string }`.

3. **Database (MongoDB Atlas)**  
   - Collection: `widgets`  
   - Indeholder widget-konfigurationer: prompt, styling, metadata.  

---

## 2. Funktionelle Krav

- Kunden indsætter kun ét script-tag.  
- Chatwidgeten skal virke på både mobil og desktop.  
- OpenAI API-nøgle må ikke eksponeres (brug backend-proxy).  
- Brug `gpt-5-mini` model i Responses API.  
- Start simpelt uden streaming, men arkitektur skal understøtte streaming senere.  

---

## 3. System Design

### Backend
- **Route**: `/api/respond`
- **Flow**:
  1. Modtag `{ widgetId, message }`.
  2. Slå `widgetId` op i MongoDB for at hente konfiguration.  
  3. Kald `openai.responses.create()` med developer instructions + user message.  
  4. Returnér AI-svaret.

### Frontend Widget (`widget.js`)
- Læs `widgetId` fra script-URL.  
- Injectér chatknap og chatboks i DOM.  
- Ved input → send fetch til backend.  
- Vis både bruger- og AI-svar i UI.  

### Database
Eksempel på dokument i `widgets` collection:
```json
{
  "_id": "68a56dea29c6cff52d64463d",
  "name": "TapFeed Widget",
  "prompt": "You are a helpful AI assistant for TapFeed customers.",
  "theme": {
    "buttonColor": "#4f46e5",
    "chatBg": "#ffffff"
  }
}
```

Eksempel på dokument i `conversations` collection:
```json
{
  "_id": "conv_68a56dea29c6cff52d64463d",
  "widgetId": "68a56dea29c6cff52d64463d",
  "userId": "user_a1b2c3d4e5f6",
  "sessionId": "session_123456789",
  "messages": [
    {
      "role": "user",
      "content": "Hello, I need help with my order",
      "timestamp": "2024-01-15T10:30:00Z"
    },
    {
      "role": "assistant",
      "content": "Hi! I'd be happy to help you with your order. Could you please provide your order number?",
      "timestamp": "2024-01-15T10:30:05Z"
    }
  ],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:32:15Z"
}
```

---

## 4. Conversation Management

### Approach
Systemet støtter persistente samtaler, så brugere kan fortsætte tidligere samtaler og få kontekst-bevidste svar fra AI'en.

### User Identification
- **UserId**: Unik identifikator genereret i frontend og gemt i localStorage
- **SessionId**: Kortere session-identifikator for at gruppere relaterede samtaler
- **ConversationId**: Specifik samtale-identifikator returneret fra backend

### Flow
1. **Første besøg**: Frontend genererer `userId` og gemmer i localStorage
2. **Ny samtale**: Backend opretter ny conversation i database og returnerer `conversationId`
3. **Efterfølgende beskeder**: Frontend sender `conversationId` med hver besked
4. **AI Context**: Backend inkluderer hele samtalehistorik når der kaldes til OpenAI

### Privacy & Storage
- Conversations slettes automatisk efter 30 dage (konfigurerbart per widget)
- Kun anonyme user IDs gemmes - ingen personlige data
- Widget-ejere kan konfigurere data retention policies

---

## 5. Implementation Steps

1. Opsæt backend (Next.js API routes).  
2. Implementer `/api/respond` med conversation support.  
3. Opsæt MongoDB Atlas med `widgets` og `conversations` collections.  
4. Implementer user session management i `widget.js`.
5. Lav hosted `widget.js`, der bygger UI og sender requests med conversation context.  
6. Implementer conversation persistence og retrieval.
7. Test integration med en test-widgetId og conversation flow.  

---

## 6. Eksempelkode

### Backend (`/api/respond.js`)
```js
import OpenAI from "openai";
import { ObjectId } from "mongodb";
import clientPromise from "../../lib/mongodb";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  const { widgetId, message, userId, conversationId } = req.body;
  const client = await clientPromise;
  const db = client.db("chatwidgets");
  
  // Get widget configuration
  const widget = await db.collection("widgets").findOne({ _id: widgetId });
  if (!widget) return res.status(404).json({ error: "Widget not found" });

  // Get or create conversation
  let conversation;
  if (conversationId) {
    conversation = await db.collection("conversations").findOne({ _id: conversationId });
  }
  
  if (!conversation) {
    // Create new conversation
    const newConversation = {
      widgetId,
      userId,
      sessionId: `session_${Date.now()}`,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const result = await db.collection("conversations").insertOne(newConversation);
    conversation = { ...newConversation, _id: result.insertedId };
  }

  // Add user message to conversation
  const userMessage = {
    role: "user",
    content: message,
    timestamp: new Date()
  };
  conversation.messages.push(userMessage);

  // Build conversation context for AI
  const conversationInput = [
    { role: "developer", content: widget.prompt },
    ...conversation.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  ];

  // Get AI response
  const response = await openai.responses.create({
    model: "gpt-5-mini",
    input: conversationInput
  });

  const aiReply = response.output[0].content[0].text;

  // Add AI response to conversation
  const aiMessage = {
    role: "assistant",
    content: aiReply,
    timestamp: new Date()
  };
  conversation.messages.push(aiMessage);

  // Update conversation in database
  await db.collection("conversations").updateOne(
    { _id: conversation._id },
    { 
      $set: { 
        messages: conversation.messages, 
        updatedAt: new Date() 
      } 
    }
  );

  res.json({ 
    reply: aiReply,
    conversationId: conversation._id.toString()
  });
}
```

### Frontend Widget (`widget.js`)
```js
(function() {
  const widgetId = new URLSearchParams(document.currentScript.src.split("?")[1]).get("widgetId");
  
  // Generate or retrieve user ID
  let userId = localStorage.getItem(`chatUserId_${widgetId}`);
  if (!userId) {
    userId = `user_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
    localStorage.setItem(`chatUserId_${widgetId}`, userId);
  }
  
  // Current conversation ID
  let currentConversationId = localStorage.getItem(`conversationId_${widgetId}`) || null;

  const chatBtn = document.createElement("button");
  chatBtn.innerText = "Chat 💬";
  chatBtn.style.cssText = "position:fixed;bottom:20px;right:20px;padding:10px 15px;border-radius:10px;background:#4f46e5;color:white;border:none;cursor:pointer;z-index:10000;";
  document.body.appendChild(chatBtn);

  const chatBox = document.createElement("div");
  chatBox.style.cssText = "display:none;position:fixed;bottom:70px;right:20px;width:300px;height:400px;background:white;border:1px solid #ccc;border-radius:10px;flex-direction:column;z-index:10000;box-shadow:0 4px 12px rgba(0,0,0,0.15);";
  document.body.appendChild(chatBox);

  // Chat header with new conversation button
  const header = document.createElement("div");
  header.style.cssText = "padding:10px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;";
  header.innerHTML = `
    <span style="font-weight:bold;">Chat</span>
    <button id="newChatBtn" style="background:#f0f0f0;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:12px;">Ny samtale</button>
  `;
  chatBox.appendChild(header);

  const messages = document.createElement("div");
  messages.style.cssText = "flex:1;overflow-y:auto;padding:10px;";
  chatBox.appendChild(messages);

  const input = document.createElement("input");
  input.placeholder = "Skriv her...";
  input.style.cssText = "border-top:1px solid #ccc;padding:10px;border:none;outline:none;";
  chatBox.appendChild(input);

  // New conversation button functionality
  document.getElementById('newChatBtn').onclick = () => {
    currentConversationId = null;
    localStorage.removeItem(`conversationId_${widgetId}`);
    messages.innerHTML = '';
  };

  // Load previous conversation if exists
  if (currentConversationId) {
    loadConversationHistory();
  }

  async function loadConversationHistory() {
    try {
      const res = await fetch("https://yourdomain.com/api/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: currentConversationId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.messages) {
          messages.innerHTML = '';
          data.messages.forEach(msg => {
            const icon = msg.role === 'user' ? '🧑' : '🤖';
            messages.innerHTML += `<div style="margin-bottom:8px;"><strong>${icon}:</strong> ${msg.content}</div>`;
          });
          messages.scrollTop = messages.scrollHeight;
        }
      }
    } catch (error) {
      console.log('Could not load conversation history');
    }
  }

  chatBtn.onclick = () => {
    chatBox.style.display = chatBox.style.display === "none" ? "flex" : "none";
  };

  input.addEventListener("keypress", async (e) => {
    if (e.key === "Enter" && input.value.trim() !== "") {
      const msg = input.value;
      messages.innerHTML += `<div style="margin-bottom:8px;"><strong>🧑:</strong> ${msg}</div>`;
      input.value = "";
      messages.scrollTop = messages.scrollHeight;

      try {
        const res = await fetch("https://yourdomain.com/api/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            widgetId, 
            message: msg, 
            userId,
            conversationId: currentConversationId 
          })
        });
        const data = await res.json();
        
        // Update conversation ID if new conversation was created
        if (data.conversationId && data.conversationId !== currentConversationId) {
          currentConversationId = data.conversationId;
          localStorage.setItem(`conversationId_${widgetId}`, currentConversationId);
        }
        
        messages.innerHTML += `<div style="margin-bottom:8px;"><strong>🤖:</strong> ${data.reply}</div>`;
        messages.scrollTop = messages.scrollHeight;
      } catch (error) {
        messages.innerHTML += `<div style="margin-bottom:8px;color:red;"><strong>⚠️:</strong> Der opstod en fejl. Prøv igen.</div>`;
      }
    }
  });
})();
```

### Additional Backend Endpoint (`/api/conversation.js`)
```js
import clientPromise from "../../lib/mongodb";

export default async function handler(req, res) {
  const { conversationId } = req.body;
  
  if (!conversationId) {
    return res.status(400).json({ error: "Conversation ID required" });
  }

  const client = await clientPromise;
  const db = client.db("chatwidgets");
  
  const conversation = await db.collection("conversations").findOne({ _id: conversationId });
  
  if (!conversation) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  res.json({ 
    messages: conversation.messages || [],
    conversationId: conversation._id.toString()
  });
}
```

---

## 7. Fremtidige Udvidelser

- Streaming af svar (server-sent events / websockets).  
- Tilpasningsmuligheder for design og branding.  
- Analytics (antal samtaler, mest stillede spørgsmål).  
- Admin-dashboard til widget-administration.
- Conversation list UI for browsing previous chats.
- Export/import af conversation data.

---

## 8. Succes-kriterier

- Kunden kan tilføje widget med ét script-tag.  
- Chat virker på mobil og desktop.  
- Backend beskytter OpenAI API-nøgle.  
- Systemet kan skalere til mange widgets via widgetId lookup.
- Conversations gemmes og kan fortsættes på tværs af sessioner.
- Brugere kan starte nye samtaler og se tidligere beskeder.
- Systemet understøtter anonyme brugere med persistent identity.  

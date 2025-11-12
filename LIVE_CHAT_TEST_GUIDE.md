# Live Chat Test Guide

## Setup

1. **Aktivér din agent-profil:**
   - Gå til `/admin/settings/agent-profile`
   - Udfyld "Display Name" (f.eks. "Konrad Kjems")
   - Udfyld "Title / Role" (f.eks. "DdD Retail Germany Support")
   - Tænd "Available for Live Chat" til ON
   - Klik "Save Profile"

2. **Aktivér live chat på widget:**
   - Gå til din widget under `/admin/widgets`
   - Klik på Settings
   - Under "Support Request", tænd "Enable Live Chat" til ON
   - Gem indstillingerne

## Test Flow

### 1. Bruger-side (Widget):

1. Åbn widgetten på din hjemmeside
2. Klik på mail-ikonet (📧) i nederste højre hjørne
3. Vælg "Live Chat" i stedet for "Email Support"
4. Skriv en grund (f.eks. "Jeg har brug for hjælp med et produkt")
5. Klik "Send"
6. Du skulle se: **"Live chat requested! An agent will join shortly."**

**Åbn browser console (F12) og se efter:**
```
🔌 Starting SSE connection for conversation: [ID]
🔗 SSE URL: http://localhost:3000/api/live-chat/stream?conversationId=[ID]
✅ SSE connection opened successfully
✅ Live chat SSE connected
📊 Status update received: requested
```

### 2. Agent-side (Admin Dashboard):

1. Åbn `/admin/support-requests?tab=live-chat` i en ny fane/browser
2. Du skulle se chatten i "Live Chat Queue"
3. Klik "Accept Chat"
4. Du skulle nu se chat-interfacet med beskeder
5. Skriv en besked og tryk "Send"

**Åbn server console og se efter:**
```
SSE connection established for conversation: [ID]
Broadcasting agent message to conversation: [ID]
Found 1 active connections for conversation [ID]
Successfully broadcasted message to connection
```

### 3. Tilbage til Bruger-side:

**Åbn browser console og se efter:**
```
📊 Status update received: active Agent: {displayName: "...", title: "..."}
✅ Live chat is now active, agent: {...}
Received message via SSE: {type: 'agent', content: '...'}
Adding agent message: {...}
```

**I widgetten skulle du nu se:**
- En grøn banner øverst: "Konrad Kjems - DdD Retail Germany Support is now chatting with you"
- Besked: "[Navn] har accepteret chatten og vil svare dig nu."
- Agent's velkomstbesked: "Hej! Jeg er [Navn] - [Titel]. Hvordan kan jeg hjælpe dig?"

### 4. Chat mellem agent og bruger:

- Agent sender beskeder fra dashboard
- Bruger ser beskederne i widgetten med grøn baggrund
- Bruger sender beskeder fra widgetten
- Agent ser beskederne i dashboard

## Debugging

### Hvis SSE ikke forbinder:

**Check browser console:**
```javascript
// Tjek om SSE er aktiv
console.log('liveChatEventSource:', liveChatEventSource);
console.log('liveChatStatus:', liveChatStatus);
console.log('currentConversationId:', currentConversationId);
```

### Hvis beskeder ikke vises:

**Check server console for:**
- "Broadcasting agent message to conversation: [ID]"
- "Found X active connections for conversation [ID]"
- "Successfully broadcasted message to connection"

**Check browser console for:**
- "Received message via SSE: {...}"
- "Adding agent message: {...}"

### Common Issues:

1. **"No active connections found"** → SSE er ikke startet korrekt
   - Refresh widgetten
   - Tjek at conversationId er sat

2. **"SSE already active"** men ingen beskeder → Connection mismatch
   - Tjek at conversationId matcher i logs
   - Tjek at beskeder broadcaste til korrekt ID

3. **"Cannot start SSE: No conversation ID"** → Conversation ikke oprettet
   - Send en besked først for at oprette conversation
   - Tjek at currentConversationId er sat

## Expected Console Output

### Widget (Browser Console):
```
🔌 Starting SSE connection for conversation: 67890abc...
🔗 SSE URL: http://localhost:3000/api/live-chat/stream?conversationId=67890abc...
✅ SSE connection opened successfully
✅ Live chat SSE connected
📊 Status update received: requested
📊 Status update received: active Agent: {displayName: "Konrad Kjems", title: "DdD Retail Germany Support"}
✅ Live chat is now active, agent: {displayName: "Konrad Kjems", ...}
Received message via SSE: {type: 'agent', content: 'Hej! Jeg er...'}
Adding agent message: {type: 'agent', content: 'Hej! Jeg er...'}
```

### Server (Terminal):
```
SSE connection established for conversation: 67890abc...
Total connections for conversation 67890abc...: 1
Broadcasting agent message to conversation: 67890abc...
Active connections keys: [ '67890abc...' ]
Found 1 active connections for conversation 67890abc...
Successfully broadcasted message to connection
```


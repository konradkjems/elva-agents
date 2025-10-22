# 🔄 Session Management - Conversation Handling

## Problem
Widgetten fortsatte samtaler efter page refresh, selvom UI'et viste en "ny" samtale. Dette skabte forvirring, da brugere troede de startede en ny samtale, men i databasen blev deres beskeder tilføjet til den gamle samtale.

**Eksempel på problemet:**
1. Bruger åbner widget og starter samtale → `conversationId: abc123` oprettes
2. Bruger refresher siden
3. Bruger åbner widget igen → Ser tom chat (ser ud som ny samtale)
4. Bruger sender besked → Beskeden tilføjes til `conversationId: abc123` (den gamle samtale!)
5. I databasen fortsætter samtalen i stedet for at starte ny

## Root Cause
ConversationId blev gemt i `localStorage`, som bevares permanent indtil brugeren:
- Manuelt clearer browser data
- Klikker på "Ny samtale" knappen

Dette betyder at selv efter page refresh, blev den samme conversationId genbrugt.

## Løsning
Fjernede al persistence af conversation ID - holdes nu **kun i memory**.

### Storage Strategier

| Strategy | Levetid | Problem |
|---------|---------|---------|
| **localStorage** | Permanent (indtil manuel sletning) | ❌ Bevares efter refresh - fortsætter gammel samtale |
| **sessionStorage** | Tab session (cleared ved tab close) | ❌ Bevares efter page refresh - fortsætter gammel samtale |
| **Memory only** ✅ | Page load session | ✅ Cleares ved page refresh - starter ny samtale |

### Hvorfor Memory Only?
- **Page refresh cleares memory** → Automatisk ny samtale
- **Widget close/open på samme side bevarer samtale** → Bedre UX
- **Ingen cleanup nødvendig** → Simplere kode
- **Tab isolation** → Hver tab har separat samtale

### Implementering

Fjernede al storage interaction for `conversationId` - holdes nu kun i memory:

#### 1. Initialization (ved page load)
```javascript
// FØR
let currentConversationId = null;
if (consent && consent.functional) {
  currentConversationId = localStorage.getItem(`conversationId_${WIDGET_CONFIG.widgetId}`) || null;
}

// EFTER
let currentConversationId = null;
// Ingen loading fra storage - starter altid som null ved page load
```

#### 2. Når ny conversation oprettes (fra server response)
```javascript
// FØR
currentConversationId = data.conversationId;
localStorage.setItem(`conversationId_${WIDGET_CONFIG.widgetId}`, currentConversationId);

// EFTER
currentConversationId = data.conversationId;
// Ingen storage - kun opdateret i memory
```

#### 3. Ved "Ny samtale" button click
```javascript
// FØR
currentConversationId = null;
localStorage.removeItem(`conversationId_${WIDGET_CONFIG.widgetId}`);

// EFTER
currentConversationId = null;
// Ingen storage at cleare - bare nulstil variabel
```

#### 4. Ved load conversation (fra historie)
```javascript
// FØR
currentConversationId = conversation.id;
localStorage.setItem(`conversationId_${WIDGET_CONFIG.widgetId}`, currentConversationId);

// EFTER
currentConversationId = conversation.id;
// Ingen storage - kun i memory (clears ved refresh)
```

#### 5. Ved delete conversation
```javascript
// FØR
if (currentConversationId === conversationId) {
  currentConversationId = null;
  localStorage.removeItem(`conversationId_${WIDGET_CONFIG.widgetId}`);
}

// EFTER
if (currentConversationId === conversationId) {
  currentConversationId = null;
  // Ingen storage at cleare
}
```

## Resultater

### ✅ Hvad virker nu
- **Page refresh starter ny samtale**: Hver gang brugeren refresher siden, startes en helt ny samtale
- **Tab isolation**: Forskellige tabs har separate samtaler
- **Conversation history bevaret**: Gamle samtaler gemmes stadig i localStorage via `conversationHistory_${widgetId}`
- **"Load conversation" virker**: Brugere kan stadig loade gamle samtaler fra historikken

### 📊 Bruger Flow (Efter Fix)

#### Scenario 1: Page Refresh
1. Bruger åbner widget → Ny samtale oprettes: `conversationId: abc123`
2. Bruger sender nogle beskeder
3. **Bruger refresher siden**
4. `sessionStorage` cleares → `conversationId: abc123` fjernes
5. Bruger åbner widget → `conversationId = null`
6. Bruger sender besked → **NY samtale oprettes**: `conversationId: xyz789` ✅

#### Scenario 2: Multiple Tabs
1. Bruger åbner widget i Tab 1 → `conversationId: abc123`
2. Bruger åbner widget i Tab 2 → `conversationId: xyz789` (separat!)
3. Hver tab har sin egen session ✅

#### Scenario 3: Load Old Conversation
1. Bruger klikker på gammel samtale i historie
2. `conversationId` sættes til den gamle samtale
3. Bruger kan fortsætte den gamle samtale
4. **Ved page refresh**: Samtalen nulstilles, starter ny samtale ✅

## Considerations

### Hvad bevares stadig i localStorage?
Disse data bevares permanent (som ønsket):
- ✅ **Conversation History**: `conversationHistory_${widgetId}` - Alle gamle samtaler
- ✅ **User ID**: `userId_${widgetId}` - Bruger identifikation
- ✅ **Consent Settings**: Cookie/GDPR samtykke
- ✅ **Widget State**: Om widgetten er åben/lukket

### Hvad sker der ved forskellige actions?

| Action | currentConversationId | Effekt |
|--------|----------------------|--------|
| **Page load** | `null` | Starter med ingen aktiv samtale |
| **Første besked** | Sættes af server | Ny samtale oprettes |
| **Flere beskeder** | Bevares i memory | Fortsætter samme samtale |
| **Widget close/open** | Bevares i memory | Samme samtale fortsætter ✅ |
| **Page refresh** | Nulstilles til `null` | Ny samtale starter ✅ |
| **Load old conversation** | Sættes til conversation.id | Gamle samtale fortsættes |
| **"Ny samtale" click** | Nulstilles til `null` | Ny samtale starter |

### Migration Notes
- **Ingen data tab**: Eksisterende conversation history i localStorage bevares
- **Cleanup**: Gamle `conversationId_${widgetId}` entries i localStorage/sessionStorage kan ignoreres - de bruges ikke længere
- **Backward compatible**: Widget virker stadig på samme måde, bare med korrekt session handling

## Testing

### Test 1: Page Refresh
1. Åbn widget og send besked
2. Refresh siden
3. Åbn widget og send ny besked
4. **Forventet**: Ny samtale oprettes (tjek database for 2 separate conversation IDs)

### Test 2: Load Old Conversation
1. Start samtale og luk widget
2. Åbn widget igen → Klik på samtale i historikken
3. Send besked i den loadede samtale
4. **Forventet**: Besked tilføjes til den gamle samtale

### Test 3: Multiple Tabs
1. Åbn widget i Tab 1, send besked
2. Åbn widget i Tab 2, send besked
3. **Forventet**: 2 separate samtaler i database

## Filer Ændret
- `pages/api/widget-embed/[widgetId].js`
  - Linje ~266: Initialization - Fjernet loading fra storage
  - Linje ~1549: handleNewConversation() - Fjernet storage removal
  - Linje ~1767: loadConversation() - Fjernet storage set
  - Linje ~1819: deleteConversation() - Fjernet storage removal
  - Linje ~3863: Message send - Fjernet storage set ved ny conversation

## Relaterede Features
- Conversation History (bevares i localStorage)
- GDPR Consent (påvirker om User ID gemmes i localStorage)
- User ID tracking (separat fra conversation ID)
- Widget State persistence (om widget er åben/lukket)


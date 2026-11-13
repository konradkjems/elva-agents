---
version: 1
slug: "widget-app-src-app-jsx"
primary_target: "widget-app/src/App.jsx"
related_targets: ["pages/api/widget-embed/[widgetId].js"]
---

# Surface: Elva chat widget (frame app)

Scope: the customer-facing chat widget rendered inside the iframe (`widget-app/`), its launcher, teaser popup and every in-panel state. Mode: **Operate**: the visitor's success is an answered question or a reached human, fast. Code-led.

Audience: visitors on Danish SMB sites, mobile and desktop, Danish-first copy. Constraints: full parity with every admin setting; customer brand leads, Elva quiet; light on the host page; no generic AI-chat look.

## Direction contract

THESIS: A receptionist's desk, not a chatbot toy. The panel is a calm, paper-white BoardUI surface where the customer's colour appears only where it means something: the launcher, the visitor's own messages, the send action and focus. Refuses the category default of gradient headers, sparkle avatars, glowing bubbles and a purple AI tint.

OWN-WORLD: BoardUI semantic neutrals (background-primary/secondary, separator hairlines, rounded-3xl panel, rounded-2xl bubbles), Inter via the composite type scale, Remix line icons. The customer's theme colour is mapped onto BoardUI's accent-50…950 ramp at runtime, so every BoardUI control inherits it. The assistant speaks in plain text on the ground with no bubble; the visitor speaks in filled accent bubbles.

STORY: The visitor sees who they're talking to (logo, name, online), reads a short welcome, taps a suggested question or types, watches the answer stream in, and can escalate to a human, rate the chat or reopen past chats, all without leaving the panel.

FIRST VIEWPORT: Closed state: a 56px accent launcher in the configured corner, plus an optional teaser card above it. Open state: a 400×640 panel with the header (avatar, name, status, menu, close), the welcome text and suggested replies as outlined pills in the lower third near the thumb, and the composer pinned at the bottom (auto-growing textarea, attach, mic, send).

FORM: BoardUI app-surface grammar applied to a messaging panel; position 1 (pinned by the user's choice of BoardUI). seed: none (unavailable)

Signature interaction: streamed text blurs in word by word from the cursor line (BoardUI's agent-log blur-in), with the agent-thinking dot wave until the first token arrives. Panel open/close is a 220ms scale+fade from the launcher corner with an exponential ease-out.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

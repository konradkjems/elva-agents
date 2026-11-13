# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Widget visitors (primary for the widget surface):** end customers of Danish SMBs (webshops, service businesses) who open the Elva chat widget on a customer's site, on mobile or desktop, to get a quick answer, find a product, or reach a human. The widget UI is Danish first, with English supported.
- **Organization teams (admin surface):** owners, admins, editors and viewers at those SMBs who configure widgets, read conversations, take over live chats and watch quota and analytics.
- **Elva platform admins:** the Elva team, who manage organizations and sales demos.

## Product Purpose

Elva is a multi-tenant AI chat widget platform. An organization configures an AI assistant once (prompt, knowledge base built from its own website, look, texts) and embeds it on its site with one script tag. Visitors get answers grounded in that business's content, product cards, image upload, a satisfaction rating and a handoff to a human agent through live chat. Success means visitors get answered without leaving the page, and the business sees the conversations, quota and satisfaction.

## Positioning

Built for Danish SMBs: Danish-first copy, GDPR controls (consent headers, IP anonymization, retention), auto-creation of an assistant and knowledge base from the customer's own website, and human live-chat handoff in the same widget.

## Brand Commitments

- Inside the widget, the **customer's** brand leads: the widget's configured colours, logo, assistant name and texts. Elva stays quiet, visible only as the small "Powered by Elva" mark when branding is enabled.
- Elva's own accent is cobalt `#075EF0` (admin and Elva-owned surfaces only).
- Every existing admin widget setting must keep having an effect; losing a customer's configuration counts as a regression.
- The widget must be light on the host page: small loader, no layout shift, a launcher that appears fast.
- Avoid the generic AI-chat look (gradient blobs, sparkle icons, purple glow).

## Stack

The existing codebase is Next.js (Pages Router, JavaScript) with Supabase. The customer-facing widget is being rebuilt as an isolated iframe app (Vite + React + Tailwind v4 + BoardUI free components) behind a tiny loader script, so host-site CSS can't affect it and the admin's Tailwind v3 setup is left alone.

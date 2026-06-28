# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Elva Chat Widget Platform** (`elva-chat-widget`) is a multi-tenant AI chat widget platform: Next.js (Pages Router) + OpenAI + Supabase (Postgres + Auth + Storage). Organizations deploy embeddable AI chat widgets on their sites with conversation persistence, team collaboration, analytics, quota enforcement, GDPR controls, and a human live-chat handoff.

> Migrated June 2026 from MongoDB + NextAuth + Cloudinary to Supabase. References to those services in older `/docs/` are historical.

> A detailed companion doc exists at `WARP.md` (same purpose, written for WARP). It overlaps heavily with this file — prefer this file, but `WARP.md` has extra migration notes and an expanded script list.

## Commands

```bash
npm run dev            # Dev server with Turbopack (localhost:3000)
npm run build          # Production build
npm start              # Production server
npm run lint           # next lint (ESLint 9 + eslint-config-next)

# Schema is managed via SQL migrations in supabase/migrations/*.sql
# (apply with `supabase db push`, or paste into the dashboard SQL editor).

npm run create-admin        # Create a bootstrap admin user
# then: node scripts/set-platform-admin.js <email>   # promote to platform admin
```

**No automated test runner.** Tests are manual HTML pages in `/tests/` (e.g. `test.html`, `test-widget-da.html`). Start `npm run dev`, then open `http://localhost:3000/tests/<file>.html`. Live-chat manual test steps are in `LIVE_CHAT_TEST_GUIDE.md`.

**Operational scripts** live in `/scripts/` — admin bootstrap (`create-admin`, `set-platform-admin.js`), GDPR (`gdpr:process-deletions`, `gdpr:apply-retention`), Redis cache (`clear-redis-cache.js`), and deploy helpers. Supabase-side tooling (storage buckets, asset + Google-OAuth setup) is in `scripts/supabase/`. Run one-offs with `node scripts/<name>.js`. (Database backups are Supabase-native; the MongoDB-era init/backup/migration scripts were removed with the Supabase migration.)

## Conventions

- **JavaScript, not TypeScript** — files are `.js`/`.jsx` (`tsx: false` in `components.json`). Don't introduce `.ts`/`.tsx`.
- **Pages Router**, not App Router. Pages in `pages/`, API in `pages/api/`. No React Server Components (`rsc: false`).
- **Import alias `@/*`** maps to repo root (`jsconfig.json`). UI lives under `@/components/ui`, helpers under `@/lib`.
- **shadcn/ui** (new-york style, lucide icons) — 32 components in `components/ui/`. Tailwind config is `tailwind.config.js`, global CSS `styles/globals.css`.
- API helpers in `lib/` use a mix of `export`/`module.exports` (CommonJS `require` works at runtime); match the style of the file you're editing.

## Architecture

### Tenancy model
```
Platform Admin (Elva team, role: 'platform_admin')
  ├── Demos (platform-level sales demos)
  └── Organizations (client subaccounts) ── isolated data
        ├── team_members (teamRole: owner | admin | editor | viewer)
        ├── widgets        (filtered by organizationId)
        ├── conversations  (filtered by organizationId)
        └── subscription + monthly conversation quota
```
**Data isolation is the core invariant**: always filter `widgets`/`conversations` queries by `organizationId` (from `session.user.currentOrganizationId`). Platform admins bypass org scoping.

### Two widget API modes (both still live)
This is the single most important architectural fork. A widget is one of:

| | **Responses API** (current) | **Chat Completions** (legacy) |
|---|---|---|
| Prompt source | Central on platform.openai.com (`widget.openai.promptId`, optional `version`) | Stored in widget (`widget.prompt`) |
| Context handling | OpenAI-managed via `previous_response_id` | Manual conversation-array building |
| Chat endpoint | `pages/api/respond-responses.js` (+ `respond-stream.js`) | `pages/api/respond.js` |
| Widget serving | `api/widget-responses/[widgetId].js`, `api/widget-embed/*` | `api/widget/[widgetId].js` |

When touching chat/widget logic, determine which mode the widget uses first — the data shapes and flow differ.

### `lib/` — shared backend helpers
- `supabase/admin.js` — server-only service-role client (bypasses RLS); the primary data-access entry point (`admin.from('table')…`). `supabase/server.js` / `supabase/client.js` — request-scoped (`@supabase/ssr`) + browser clients for auth. `supabase/session.js` — `getSessionContext(req,res)` (the `getServerSession` replacement). `supabase/auth-context.js` — drop-in `useSession()` for client code. `supabase/storage.js` — Supabase Storage helper (replaced `cloudinary.js`). `supabase/transform.js` — snake_case↔camelCase row mapping (`fromRow`/`fromRows`/`toSnake`).
- `auth.js` — `requireAuth`, `requireAdmin`, `withAuth(handler)`, `withAdmin(handler)` (backed by Supabase Auth via `getSessionContext`).
- `roleCheck.js` — `getUserTeamRole(userId, orgId)`, `requireRole(req, res, allowedRoles)` (the team-level permission gate; platform_admin via `users.role === 'platform_admin'`).
- `quota.js` — `checkQuota`, `incrementConversationCount`, `getUsageStats`, `shouldBlockWidget`, `resetMonthlyQuota`, `getConversationLimit(plan)` (atomic counters via Postgres RPCs).
- `privacy.js` — GDPR: IP anonymization, consent checks. `password.js` — bcrypt helper. `rate-limit.js`, `cache.js`, `redis.js`, `email.js` (Resend), `planUtils.js`, `consent-banner.js`.

### Key request patterns
- **API route preamble**: set CORS headers → handle `OPTIONS` (return 200) → apply rate-limit middleware → auth/role check → query scoped by `organizationId`. CORS for `/api/*`, `/widget/*`, and widget-embed routes is also set globally in `next.config.js` + `vercel.json`.
- **Quota gate**: `checkQuota(orgId)` before creating a conversation (FREE tier hard-blocks; paid tiers allow tracked overage), then `incrementConversationCount(orgId)` after. Quotas reset monthly on the 1st.
- **GDPR consent**: read `x-elva-consent-analytics` / `x-elva-consent-functional` headers; only enrich/store analytics (e.g. country from IP) when consent is `'true'`.
- **Widget config caching**: widget configs cached ~5 min (keyed by widget ID) to cut DB load.

### Routing & auth flow
- `middleware.js` gates `/admin/:path*` — requires a valid Supabase session; `/admin/login` is public. OAuth completes at `pages/auth/callback.js` (outside the matcher) so the PKCE code is exchanged before the gate.
- Admin dashboard pages under `pages/admin/` (widgets, organizations, analytics, audit, settings, support-requests, demo-widgets, legacy). Public pages: `index.js`, `privacy.js`, `terms.js`, `cookies.js`, `demo/`, `widget-preview/`, `auth/callback.js`.
- Auth supports email/password and Google OAuth via Supabase Auth; session lives in a cookie (`sb-<ref>-auth-token`). `auth.users.id === public.users.id` (same UUID), so `session.user.id` is stable.

### Live chat & cron
- **Live chat** (human handoff): `pages/api/live-chat/` — `request`, `queue`, `accept`, `send-message`, `user-message`, `poll`, `stream`, `end`. Uses polling/streaming for agent↔visitor messaging.
- **Vercel Cron** (`vercel.json`): `/api/cron/process-deletions` daily 02:00, `/api/cron/apply-retention` weekly Sun 03:00. (`check-quotas` also exists in `pages/api/cron/`.) API functions have `maxDuration: 30`.

### Postgres tables (Supabase)
Hybrid schema: normalized columns + JSONB for nested config; every table has a UUID `id` + `legacy_id` preserving the original Mongo `_id` (widget embed id lives in `legacy_id`; look up by `.eq('legacy_id', id)` with a UUID fallback). Core: `users`, `organizations`, `team_members`, `widgets`, `conversations`, `demos`, `invitations`. Supporting: `audit_log`, `support_requests`, `analytics`, `satisfaction_analytics`, `app_settings`. Account deletions are fields on `users` + an `audit_log` entry. Conversations have a 30-day retention cleanup.

## Environment

Copy `.env.example` → `.env.local` (a `.env` also exists locally). Required: `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_API_URL`. Optional: `SUPABASE_DB_URL` (migration tooling), `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (Google OAuth is configured in the Supabase dashboard), Resend, Redis. Deploys to Vercel (primary).

## Further docs

`/docs/` is organized into `deployment/`, `setup/`, `features/`, `development/` — see `docs/README.md` for the index.

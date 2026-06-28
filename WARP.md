# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

> Companion to `CLAUDE.md` (same purpose). As of June 2026 the platform has been
> fully migrated from MongoDB + NextAuth + Cloudinary to **Supabase** (Postgres
> database + Supabase Auth + Supabase Storage). This file reflects that stack.

## Project Overview

**Elva Chat Widget Platform** is a multi-tenant AI-powered chat widget platform built with Next.js (Pages Router), OpenAI, and Supabase. Organizations deploy customizable AI chat widgets on their websites with conversation persistence, team collaboration, analytics, quota enforcement, GDPR controls, and a human live-chat handoff.

### Key Capabilities
- **Multi-tenancy**: Organizations have isolated data and widgets (app-level scoping by `organizationId`)
- **OpenAI Integration**: Dual API support (Responses API and Chat Completions)
- **Team Collaboration**: Role-based access control with owners, admins, editors, viewers
- **Quota Management**: Conversation limits per subscription plan with automatic tracking
- **GDPR Compliance**: Privacy controls, consent management, data retention policies

## Common Development Commands

### Setup and Installation
```bash
# Install dependencies
npm install

# Copy env template and fill in Supabase + OpenAI keys
cp .env.example .env.local
```
The database schema is managed by **SQL migrations** under `supabase/migrations/*.sql`
(applied with the Supabase CLI: `supabase db push`, or via the dashboard SQL editor).
There is no app-side DB-init step anymore — the old `init-db*` scripts were removed.

### Development
```bash
npm run dev      # Start dev server (Turbopack)
npm run build    # Production build
npm start        # Production server
npm run lint     # next lint
```

### Operational scripts
```bash
# Create an admin bootstrap user (Supabase Auth + profile + org)
npm run create-admin            # node scripts/create-admin-user.js [email] [password] [name]

# Promote a user to platform admin (sets users.role = 'platform_admin')
node scripts/set-platform-admin.js <email>

# GDPR (Supabase-backed)
npm run gdpr:process-deletions  # process scheduled account deletions
npm run gdpr:apply-retention    # apply per-widget data retention

# Deployment helpers
npm run deploy:vercel           # vercel --prod
npm run deploy:production       # node scripts/deploy-production.js
```
Supabase-side tooling lives in `scripts/supabase/` (storage bucket setup, asset
migration, Google OAuth setup). Database backups are handled by **Supabase native
backups + Point-in-Time Recovery** — there are no app backup/restore scripts.

## Architecture

### High-Level Structure
```
Platform Admin (Elva Team, users.role = 'platform_admin')
  ├── Demos (Platform-level, for potential clients)
  ├── Organizations Management
  └── System Settings

Organizations (Client Subaccounts)
  ├── Owner (Client)
  ├── Team Members (owner, admin, editor, viewer)
  ├── Widgets (isolated per organization)
  ├── Conversations (isolated per organization)
  └── Subscription & Quotas
```

### Core Components

#### API Endpoints Structure
```
pages/api/
├── respond-responses.js          # Responses API chat endpoint (recommended)
├── respond.js                    # Legacy Chat Completions endpoint
├── respond-stream.js             # Streaming responses
├── conversation.js               # Load conversation history
├── widget-responses/[widgetId].js # Responses API widget serving
├── widget/[widgetId].js          # Legacy widget serving
├── auth/
│   ├── me.js                     # Returns the current session context (or 401)
│   └── register.js               # User registration (Supabase Auth)
├── live-chat/                    # Human handoff (request/queue/accept/send/poll/stream/end)
├── organizations/                # Organization CRUD
├── conversations/                # List / details / tracking
└── admin/                        # Widget, analytics, audit, settings, etc.
```
OAuth completes at the public page `pages/auth/callback.js` (outside the
`/admin/*` middleware matcher) so the PKCE code is exchanged before any auth gate.

#### Key Libraries (`lib/`)
- **supabase/admin.js**: server-only service-role client (bypasses RLS) — the primary data-access entry point (`admin.from('table')...`)
- **supabase/server.js** / **supabase/client.js**: request-scoped (`@supabase/ssr`) and browser clients used for auth
- **supabase/session.js**: `getSessionContext(req, res)` — validates the Supabase cookie and returns `{ user: { id, email, role, currentOrganizationId, teamRole, permissions } }`
- **supabase/auth-context.js**: `<AuthProvider>` + a drop-in `useSession()` for client components
- **supabase/storage.js**: Supabase Storage helper (upload/delete + sharp resize) — replaced `lib/cloudinary.js`
- **supabase/transform.js**: snake_case ↔ camelCase row mapping (`fromRow`/`fromRows`/`toSnake`)
- **auth.js**: auth middlewares (`requireAuth`, `requireAdmin`, `withAuth`, `withAdmin`) backed by `getSessionContext`
- **roleCheck.js**: `getUserTeamRole`, `requireRole` (team-level permission gate; platform_admin bypass)
- **quota.js**: conversation quota management (check, increment, reset, notifications) via Postgres RPCs
- **privacy.js**: GDPR utilities (IP anonymization, consent checking)
- **rate-limit.js**, **cache.js**, **email.js** (Resend)

### Database Tables (Postgres / Supabase)
Hybrid schema: normalized core columns + JSONB for nested config. Every table has a
UUID `id` plus a `legacy_id` preserving the original Mongo `_id` (widget embed ids
live in `legacy_id`). Lookups by embed id use `.eq('legacy_id', id)` with a UUID fallback.

#### Core tables
- **users**: accounts; `role in ('member','admin','platform_admin')`, `current_organization_id`, JSONB `preferences`/`agent_profile`. Passwords live in Supabase Auth (`auth.users`, same UUID), not here.
- **organizations**: client subaccounts; plan, limits, usage (JSONB), subscription status
- **team_members**: org membership; `role in ('owner','admin','member','viewer')`, JSONB `permissions`, unique `(organization_id, user_id)`
- **widgets**: widget config (two modes: `openai.promptId` for Responses API or `prompt` for legacy); JSONB `openai`/`appearance`/`messages`/`branding`/`advanced`/`analytics`
- **conversations**: messages (JSONB), satisfaction, `last_response_id`, analytics metadata
- **demos**, **invitations**

#### Supporting tables
- **audit_log**, **support_requests**, **analytics**, **satisfaction_analytics**, **app_settings**
- Account deletions are fields on `users` + an `audit_log` entry (not a separate table)

### Authentication & Authorization

#### Session Management
- **Supabase Auth** (GoTrue); the session lives in a cookie (`sb-<ref>-auth-token`)
- `middleware.js` gates `/admin/*` on a valid Supabase session, redirecting to `/admin/login`
- Supports credentials (email/password) and Google OAuth
- `auth.users.id === public.users.id` (same UUID), so `session.user.id` is stable

#### User Roles
1. **Platform Admin** (`users.role = 'platform_admin'`): full system access, can impersonate organizations
2. **Organization Owner** (`teamRole: 'owner'`): full control over their organization
3. **Organization Admin** (`teamRole: 'admin'`): manage widgets, team, settings
4. **Organization Editor** (`teamRole: 'editor'`): create/edit widgets
5. **Organization Viewer** (`teamRole: 'viewer'`): read-only access

#### Permission Pattern
```javascript
const { requireRole } = require('./lib/roleCheck');
const { authorized, session } = await requireRole(req, res, ['owner', 'admin']);

// Platform admin bypass
if (session.user.role === 'platform_admin') {
  // can access anything
}
```

### Widget API Modes

#### Responses API (Recommended)
- Prompts managed centrally on platform.openai.com
- Automatic conversation context via `previous_response_id`
- Widget config: `widget.openai.promptId` (+ optional `widget.openai.version`)
- Endpoint: `/api/respond-responses.js`; serving: `/api/widget-responses/[widgetId].js`

#### Chat Completions API (Legacy)
- Prompts stored in widget configuration; manual conversation-array building
- Widget config: `widget.prompt`
- Endpoint: `/api/respond.js`; serving: `/api/widget/[widgetId].js`

### Quota System
1. Each organization has a conversation quota based on plan; quotas reset monthly on the 1st
2. FREE tier: hard block when exceeded; PAID tiers: allow tracked overage
3. Atomic counters use Postgres RPCs (avoid read-modify-write races)

```javascript
const { checkQuota, incrementConversationCount } = require('./lib/quota');
const quotaCheck = await checkQuota(organizationId);
if (quotaCheck.blocked) return res.status(403).json({ error: 'Quota exceeded' });
// ... after creating the conversation:
await incrementConversationCount(organizationId);
```

### GDPR Compliance
- IP anonymization (last octet removed); consent headers `x-elva-consent-analytics` / `x-elva-consent-functional`
- Data retention with automatic cleanup (`scripts/apply-data-retention.js`, Supabase)
- Right to erasure (account deletion with 30-day delay; `scripts/process-account-deletions.js`)
- Audit logs; passwords hashed by Supabase Auth (bcrypt)

```javascript
const analyticsConsent = req.headers['x-elva-consent-analytics'] === 'true';
const country = analyticsConsent ? await getCountryFromIP(rawIP) : null;
```

## Important Implementation Patterns

### Organization Data Isolation
Always filter by `organizationId` (from `session.user.currentOrganizationId`) when querying widgets or conversations. Platform admins bypass org scoping.
```javascript
const { admin } = require('./lib/supabase/admin');
const { data: widgets } = await admin
  .from('widgets')
  .select('*')
  .eq('organization_id', session.user.currentOrganizationId);
```

### API Route Preamble
```javascript
// CORS first
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, ...');
if (req.method === 'OPTIONS') { res.status(200).end(); return; }
await runMiddleware(req, res, widgetLimiter); // rate limit
// ... auth/role check, then org-scoped query
```

### Supabase access
- Server code uses the service-role `admin` client (bypasses RLS). RLS is ON
  (deny-by-default, no policies) on all tables; the browser only uses Supabase for auth.
- `SUPABASE_SERVICE_ROLE_KEY` must be the real service-role secret (never exposed client-side).

### Widget Caching
Widget configurations are cached ~5 minutes (keyed by widget id) to reduce DB load.

## Testing
Manual HTML test pages in `/tests/` (e.g. `test.html`, `test-widget-da.html`). Start `npm run dev` and open `http://localhost:3000/tests/<file>.html`. Live-chat manual steps are in `LIVE_CHAT_TEST_GUIDE.md`.

## Configuration Files

### Environment Variables
Required in `.env.local` (see `.env.example`):
```env
# OpenAI
OPENAI_API_KEY=sk-...

# Supabase (Database + Auth + Storage)
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...          # server only — bypasses RLS
SUPABASE_DB_URL=postgresql://...       # used by migration tooling

# Google OAuth (configured in Supabase dashboard)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# App
NEXT_PUBLIC_API_URL=http://localhost:3000
```
Google OAuth redirect URLs (Site URL + Redirect URLs) are configured in the Supabase
dashboard (Authentication → URL Configuration), not in app code.

### Next.js Configuration
- Turbopack for dev (`--turbopack`); middleware gates `/admin/*`; API routes in `/pages/api/`

## Migration Notes

### Legacy → Responses API
1. Create a prompt on platform.openai.com, copy the prompt id (`pmpt_...`)
2. Set `widget.openai.promptId` on the widget (admin UI or `admin.from('widgets').update(...)`)
3. Embed via `/api/widget-responses/[widgetId]`

### MongoDB + NextAuth + Cloudinary → Supabase (complete)
- Data migrated 1:1 (Mongo `_id` → `legacy_id`, ObjectId → UUID)
- NextAuth replaced by Supabase Auth (same user UUIDs; bcrypt hashes imported)
- Cloudinary replaced by Supabase Storage (buckets: `widget-assets`, `chat-uploads`, `agent-avatars`, `demo-screenshots`)
- The `mongodb` package and all Mongo-era scripts were removed

## Documentation
Full documentation is in `/docs/` (deployment, setup, features, development). See `/docs/README.md` for the index. Note: some older docs predate the Supabase migration and may reference MongoDB/NextAuth/Cloudinary — this file and `CLAUDE.md` are the current source of truth.

# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Elva Chat Widget Platform** is a multi-tenant AI-powered chat widget platform built with Next.js, OpenAI, and MongoDB. It allows organizations to deploy customizable AI chat widgets on their websites with conversation persistence, team collaboration, and advanced analytics.

### Key Capabilities
- **Multi-tenancy**: Organizations have isolated data and widgets
- **OpenAI Integration**: Dual API support (Responses API and Chat Completions)
- **Team Collaboration**: Role-based access control with owners, admins, editors, viewers
- **Quota Management**: Conversation limits per subscription plan with automatic tracking
- **GDPR Compliance**: Privacy controls, consent management, data retention policies

## Common Development Commands

### Setup and Installation
```bash
# Install dependencies
npm install

# Initialize database with Responses API (recommended)
npm run init-db-responses
# or
npm run migrate-responses

# Initialize database with legacy Chat Completions API
npm run init-db

# Complete setup from scratch
npm run setup-responses  # Responses API
npm run setup           # Legacy API
```

### Development
```bash
# Start development server (with Turbopack)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

### Database Management
```bash
# Create admin user
npm run create-admin

# Test MongoDB connection
node scripts/test-mongodb-connection.js

# Backup database
npm run backup:db

# Restore database
npm run restore:db
```

### GDPR/Privacy
```bash
# Migrate passwords to bcrypt
npm run gdpr:migrate-passwords

# Anonymize IP addresses
npm run gdpr:anonymize-ips

# Process account deletions
npm run gdpr:process-deletions

# Initialize audit log
npm run gdpr:init-audit-log

# Apply data retention policies
npm run gdpr:apply-retention
```

### Organization & Multi-tenancy
```bash
# Migrate to organizations schema
node scripts/migrate-to-organizations.js

# Add organizationId to widgets
node scripts/add-organizationid-to-widgets.js

# Add organizationId to demos
npm run migrate:demos-org

# Debug user memberships
node scripts/debug-user-memberships.js
```

### Quota Management
```bash
# Debug quota tracking
node scripts/debug-quota-tracking.js

# Test quota system
node scripts/test-quota-system.js

# Sync quota counts
node scripts/sync-quota-counts.js

# Migrate conversation quotas
node scripts/migrate-conversation-quotas.js
```

### Deployment
```bash
# Prepare for deployment
npm run deploy:prepare

# Deploy to Vercel
npm run deploy:vercel

# Deploy to Netlify
npm run deploy:netlify

# Production setup
npm run setup:production
```

### Analytics & Testing
```bash
# Verify analytics fixes
npm run verify:analytics

# Initialize satisfaction analytics
node scripts/init-satisfaction-analytics.js

# Fix analytics overcounting
node scripts/fix-analytics-overcounting.js
```

## Architecture

### High-Level Structure
```
Platform Admin (Elva Team)
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
│   ├── [...nextauth].js          # NextAuth configuration
│   └── register.js               # User registration
├── organizations/
│   └── index.js                  # Organization CRUD
├── conversations/
│   ├── index.js                  # List conversations
│   ├── [id].js                   # Conversation details
│   └── track.js                  # Conversation tracking
└── admin/
    ├── widgets.js                # Widget management
    ├── analytics-overview.js     # Platform analytics
    ├── audit-logs.js             # Audit trail
    └── platform-stats.js         # Platform statistics
```

#### Key Libraries (`lib/`)
- **mongodb.js**: Database connection with fallback URI support and Atlas-specific SSL handling
- **auth.js**: Authentication middleware (`requireAuth`, `requireAdmin`, `withAuth`, `withAdmin`)
- **roleCheck.js**: Team role checking and permission validation
- **quota.js**: Conversation quota management (check, increment, reset, notifications)
- **privacy.js**: GDPR compliance utilities (IP anonymization, consent checking)
- **rate-limit.js**: Rate limiting middleware
- **password.js**: bcrypt password hashing and verification
- **email.js**: Email notifications (quota, invitations)

### Database Collections

#### Core Collections
- **users**: User accounts with platform roles and current organization context
- **organizations**: Client subaccounts with plans, limits, usage tracking
- **team_members**: Organization membership with roles and permissions
- **widgets**: Chat widget configurations (two modes: `openai.promptId` for Responses API or `prompt` for legacy)
- **conversations**: Chat conversations with messages, satisfaction ratings, analytics metadata
- **demos**: Platform admin demos for showcasing to potential clients
- **invitations**: Team member invitation tokens

#### Supporting Collections
- **audit_logs**: GDPR-compliant audit trail
- **support_requests**: User support tickets
- **account_deletions**: Scheduled account deletion requests

### Authentication & Authorization

#### Session Management
- Uses NextAuth with JWT strategy
- Session duration: 24 hours with rolling updates
- Supports both credentials (email/password) and Google OAuth

#### User Roles
1. **Platform Admin** (`role: 'platform_admin'`): Full system access, can impersonate organizations
2. **Organization Owner** (`teamRole: 'owner'`): Full control over their organization
3. **Organization Admin** (`teamRole: 'admin'`): Manage widgets, team, settings
4. **Organization Editor** (`teamRole: 'editor'`): Create/edit widgets
5. **Organization Viewer** (`teamRole: 'viewer'`): Read-only access

#### Permission Pattern
```javascript
// Check authentication
const { requireRole } = require('./lib/roleCheck');
const { authorized, session } = await requireRole(req, res, ['owner', 'admin']);

// Platform admin bypass
if (session.user.role === 'platform_admin') {
  // Admins can access anything
}
```

### Widget API Modes

#### Responses API (Recommended)
- Prompts managed centrally on platform.openai.com
- Automatic conversation context via `previous_response_id`
- Widget config: `widget.openai.promptId` and optional `widget.openai.version`
- Endpoint: `/api/respond-responses.js`
- Widget serving: `/api/widget-responses/[widgetId].js`

#### Chat Completions API (Legacy)
- Prompts stored in widget configuration
- Manual conversation array building
- Widget config: `widget.prompt`
- Endpoint: `/api/respond.js`
- Widget serving: `/api/widget/[widgetId].js`

### Quota System

#### How It Works
1. Each organization has a conversation quota based on their plan
2. Quotas reset monthly on the 1st
3. FREE tier: Hard block when quota exceeded
4. PAID tiers: Allow overages, track for billing
5. Trial expiry blocks new conversations for FREE tier

#### Quota Flow
```javascript
// Before creating conversation
const { checkQuota } = require('./lib/quota');
const quotaCheck = await checkQuota(organizationId);
if (quotaCheck.blocked) {
  return res.status(403).json({ error: 'Quota exceeded' });
}

// After creating conversation
const { incrementConversationCount } = require('./lib/quota');
await incrementConversationCount(organizationId);
```

### GDPR Compliance

#### Key Privacy Features
- IP address anonymization (last octet removed)
- Consent headers: `x-elva-consent-analytics`, `x-elva-consent-functional`
- Data retention with automatic cleanup
- Right to erasure (account deletion with 30-day delay)
- Audit logs for all data access/modifications
- bcrypt password hashing with salt rounds = 12

#### Consent Pattern
```javascript
const analyticsConsent = req.headers['x-elva-consent-analytics'] === 'true';
const country = analyticsConsent ? await getCountryFromIP(rawIP) : null;
```

## Important Implementation Patterns

### Organization Data Isolation
Always filter by `organizationId` when querying widgets or conversations:
```javascript
const currentOrgId = session.user.currentOrganizationId;
const widgets = await db.collection('widgets').find({ 
  organizationId: new ObjectId(currentOrgId) 
}).toArray();
```

### Error Handling in API Routes
```javascript
// Always set CORS first
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, ...');

// Handle OPTIONS
if (req.method === 'OPTIONS') {
  res.status(200).end();
  return;
}

// Apply rate limiting
await runMiddleware(req, res, widgetLimiter);
```

### MongoDB Connection
- Uses singleton pattern for connection reuse
- Supports fallback URI for DNS/SRV issues
- Development mode uses global caching to prevent hot reload issues

### Widget Caching
Widget configurations are cached for 5 minutes to reduce database queries. Cache is keyed by widget ID and includes `cachedAt` timestamp.

## Testing

The platform primarily uses manual testing with HTML test pages located in `/tests/`:
- `test.html`: Basic widget testing
- `test-widget-overview.html`: Multi-widget comparison
- `test-consent.js`: GDPR consent testing
- Language-specific tests: `test-widget-da.html`, `test-widget-en.html`, etc.

Start dev server and navigate to `http://localhost:3000/tests/[test-file].html`

## Configuration Files

### Environment Variables
Required in `.env.local`:
```env
# OpenAI
OPENAI_API_KEY=sk-...

# MongoDB
MONGODB_URI=mongodb+srv://...
MONGODB_URI_FALLBACK=mongodb://...  # Optional fallback

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl

# Google OAuth (optional)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# API URL
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Next.js Configuration
- Uses Turbopack for faster dev builds (`--turbopack` flag)
- Middleware for auth protection on `/admin/*` routes
- API routes are in `/pages/api/`

## Migration Notes

### From Legacy to Responses API
1. Create prompt on platform.openai.com
2. Copy prompt ID (starts with `pmpt_`)
3. Update widget: `db.widgets.updateOne({ _id }, { $set: { 'openai.promptId': 'pmpt_...' }})`
4. Use `/api/widget-responses/[widgetId]` for embedding

### From Single-User to Multi-Tenant
Phase 1 (Complete):
1. Add `organizations` and `team_members` collections
2. Add `organizationId` to widgets and conversations
3. Update all queries to filter by organization
4. Implement quota system
5. Update authentication to include team roles

## Documentation

Full documentation is in `/docs/`:
- **Deployment**: Complete deployment guides for Vercel, domain setup, production testing
- **Setup**: MongoDB setup, Google OAuth configuration
- **Features**: Multi-tenancy setup, profile management, search functionality
- **Development**: Project summary, API migration, styling improvements

See `/docs/README.md` for documentation index.

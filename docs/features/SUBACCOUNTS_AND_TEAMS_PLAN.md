# Subaccounts & Teams Feature - Implementation Plan

## 📋 Overview

This document outlines the plan to transform Elva-Agents into a multi-tenant platform where:
- **Platform Admins** manage the entire system
- **Organizations/Clients** have isolated subaccounts with their own widgets
- **Teams** can collaborate within organizations with role-based access
- **Invitations** allow adding team members to organizations

## 🎯 Goals

1. **Multi-tenancy**: Isolate client data while sharing the same infrastructure
2. **Team Collaboration**: Multiple users can work on the same widgets
3. **Role-Based Access**: Control what each team member can do
4. **Self-Service**: Clients can manage their own teams and widgets
5. **Scalability**: Support growth from single users to large teams

## 🏗️ Architecture Overview

### Current Structure
```
Users → Widgets
```

### New Structure
```
Platform Admin (Elva Team)
    ├── Demos (Platform-level only, for potential clients)
    ├── Organizations Management (can access all orgs)
    ├── System Settings
    └── Organizations (Client Subaccounts)
        ├── Owner (Client)
        ├── Team Members
        ├── Widgets (isolated per org)
        └── Conversations (isolated per org)
```

### Key Changes
- **Demos**: Platform admin exclusive - used to showcase to potential clients
- **Platform Admin Access**: Can impersonate/access any organization for support
- **Organization Isolation**: Each client sees only their widgets and data

## 📊 Database Schema

### 1. Organizations Collection

```javascript
{
  _id: ObjectId,
  name: "Acme Corporation",
  slug: "acme-corp", // Unique identifier
  
  // Ownership
  ownerId: ObjectId, // User who created/owns the org
  
  // Branding
  logo: "https://...",
  primaryColor: "#1E40AF",
  domain: "acme.com", // Optional custom domain
  
  // Subscription & Limits
  plan: "pro", // free, starter, pro, enterprise
  limits: {
    maxWidgets: 10,
    maxTeamMembers: 5,
    maxConversations: 10000,
    maxDemos: 3
  },
  
  // Billing
  billingEmail: "billing@acme.com",
  subscriptionStatus: "active", // active, trial, expired, cancelled
  subscriptionId: "sub_xxx", // Stripe subscription ID
  trialEndsAt: ISODate,
  
  // Settings
  settings: {
    allowDemoCreation: true,
    requireEmailVerification: false,
    allowGoogleAuth: true
  },
  
  // Metadata
  createdAt: ISODate,
  updatedAt: ISODate,
  deletedAt: ISODate // Soft delete
}
```

### 2. Team Members Collection

```javascript
{
  _id: ObjectId,
  organizationId: ObjectId, // FK to organizations
  userId: ObjectId, // FK to users
  
  // Role & Permissions
  role: "owner", // owner, admin, editor, viewer
  permissions: {
    widgets: {
      create: true,
      read: true,
      update: true,
      delete: false
    },
    demos: {
      create: true,
      read: true,
      update: true,
      delete: false
    },
    team: {
      invite: false,
      manage: false,
      remove: false
    },
    settings: {
      view: false,
      edit: false
    }
  },
  
  // Status
  status: "active", // invited, active, suspended, removed
  invitedBy: ObjectId, // User who sent invitation
  invitedAt: ISODate,
  joinedAt: ISODate,
  
  // Metadata
  createdAt: ISODate,
  updatedAt: ISODate
}
```

### 3. Updated Users Collection

```javascript
{
  _id: ObjectId,
  email: "user@example.com",
  name: "John Doe",
  password: "hashed", // Optional if Google auth
  image: "https://...",
  
  // Platform Role (new)
  platformRole: "user", // platform_admin, user
  
  // Authentication
  provider: "google", // google, credentials
  emailVerified: true,
  
  // Current Organization Context (new)
  currentOrganizationId: ObjectId, // Currently active org
  
  // User Preferences
  preferences: {
    theme: "light",
    language: "en",
    notifications: {
      email: true,
      newWidgetCreated: true,
      teamInvitation: true
    }
  },
  
  // Metadata
  status: "active",
  lastLogin: ISODate,
  createdAt: ISODate,
  updatedAt: ISODate
}
```

### 4. Updated Widgets Collection

```javascript
{
  _id: ObjectId,
  organizationId: ObjectId, // NEW: Organization isolation
  createdBy: ObjectId, // User who created it
  
  name: "Support Widget",
  description: "...",
  
  // ... existing widget fields ...
  
  // Team Collaboration (new)
  lastEditedBy: ObjectId,
  lastEditedAt: ISODate,
  
  createdAt: ISODate,
  updatedAt: ISODate
}
```

### 5. Updated Demos Collection

```javascript
{
  _id: ObjectId,
  // NO organizationId - Demos are platform-level only
  createdBy: ObjectId, // Platform admin who created it
  
  name: "Demo for Acme Corp",
  description: "Sales demo for potential client",
  
  // Target client info (for tracking)
  targetClient: {
    name: "Acme Corporation",
    email: "contact@acme.com",
    notes: "Interested in support widget"
  },
  
  // Demo settings
  demoSettings: {
    clientWebsiteUrl: "https://acme.com",
    demoUrl: "https://your-domain.com/demo/demo-123",
    usageLimits: {
      maxInteractions: 50,
      maxViews: 100,
      expiresAt: ISODate
    }
  },
  
  // Widget configuration (copied from a template)
  // ... all widget settings ...
  
  // Metadata
  status: "active", // active, expired, converted
  convertedToOrganizationId: ObjectId, // If client signed up
  createdAt: ISODate,
  updatedAt: ISODate
}
```

### 5. Invitations Collection (new)

```javascript
{
  _id: ObjectId,
  organizationId: ObjectId,
  email: "newmember@example.com",
  
  // Invitation Details
  invitedBy: ObjectId, // User who sent invitation
  role: "editor",
  token: "unique-secure-token",
  
  // Status
  status: "pending", // pending, accepted, expired, cancelled
  expiresAt: ISODate, // 7 days from creation
  acceptedAt: ISODate,
  
  // Metadata
  createdAt: ISODate,
  updatedAt: ISODate
}
```

## 🔐 Role-Based Access Control (RBAC)

### Platform Roles

1. **Platform Admin** (Elva Team)
   - **Full System Access**
   - Create and manage demos (exclusive)
   - Access ANY organization (impersonation mode)
   - View all organizations and users
   - System-wide settings
   - User management across all orgs
   - Analytics across all organizations
   - **Cannot be restricted** - bypass all org-level permissions

2. **User** (default - Clients)
   - Can create/own organizations
   - Can join organizations via invitation
   - Access only assigned organizations
   - Cannot create demos (feature hidden)
   - Cannot access other organizations

### Organization Roles

1. **Owner**
   - Full access to organization
   - Manage subscription & billing
   - Delete organization
   - Transfer ownership
   - All admin permissions

2. **Admin**
   - Manage team members
   - Manage all widgets & demos
   - View analytics
   - Organization settings
   - Cannot delete organization or manage billing

3. **Editor**
   - Create, edit, delete widgets
   - Create, edit demos
   - View analytics
   - Cannot manage team or settings

4. **Viewer**
   - View widgets & demos
   - View analytics
   - Cannot create, edit, or delete
   - Read-only access

### Permission Matrix

| Action | Platform Admin | Owner | Admin | Editor | Viewer |
|--------|---------------|-------|-------|--------|--------|
| Create Widget | ✅ | ✅ | ✅ | ✅ | ❌ |
| Edit Widget | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete Widget | ✅ | ✅ | ✅ | ✅ | ❌ |
| View Widget | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Create Demo** | **✅ (only)** | **❌** | **❌** | **❌** | **❌** |
| **Manage Demos** | **✅ (only)** | **❌** | **❌** | **❌** | **❌** |
| View Analytics | ✅ | ✅ | ✅ | ✅ | ✅ |
| Invite Members | ✅ | ✅ | ✅ | ❌ | ❌ |
| Remove Members | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage Roles | ✅ | ✅ | ✅ | ❌ | ❌ |
| Organization Settings | ✅ | ✅ | ✅ | ❌ | ❌ |
| Billing & Subscription | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete Organization | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Access Any Org** | **✅ (only)** | **❌** | **❌** | **❌** | **❌** |
| **System Settings** | **✅ (only)** | **❌** | **❌** | **❌** | **❌** |

### Platform Admin Exclusive Features

**Demos Management** (Not visible to regular users)
- Create demos for potential clients
- Manage all demos
- Track demo usage and conversions
- Share demo links with prospects

**Organization Impersonation** (Support & management)
- Switch to any organization context
- View org as if you were the owner
- Help troubleshoot issues
- Manage on behalf of clients
- Indicator shown: "Viewing as Acme Corp (Admin Mode)"

## 🎨 User Interface Changes

### 1. Organization Switcher (Header)

```
┌─────────────────────────────────────┐
│ [Acme Corp ▼]  🔍 Search...    👤  │
└─────────────────────────────────────┘
     │
     └─> Dropdown:
         ├─ Acme Corporation ✓
         ├─ Personal Workspace
         ├─ Beta Company
         ├─ ─────────────────
         ├─ Create Organization
         └─ Manage Organizations
```

### 2. New Navigation Structure

**For Regular Users (Clients):**
```
Sidebar:
├─ Dashboard (org-specific)
├─ Widgets (org-specific)
├─ Analytics (org-specific)
├─ Team (new)
│  ├─ Members
│  ├─ Invitations
│  └─ Roles & Permissions
├─ Settings (org-specific)
│  ├─ General
│  ├─ Branding
│  ├─ Billing (owner only)
│  └─ Danger Zone
└─ Profile (user-specific)
```

**For Platform Admins (Elva Team):**
```
Sidebar:
├─ Dashboard (platform-wide)
├─ Organizations (all clients)
│  ├─ View All
│  ├─ Access Organization (impersonation)
│  └─ Create Organization
├─ Demos (platform-exclusive) ⭐
│  ├─ All Demos
│  ├─ Create Demo
│  └─ Demo Analytics
├─ Widgets (current org context)
├─ Analytics (platform or org-specific)
├─ Team (if in org context)
├─ System Settings (platform-level)
│  ├─ Platform Settings
│  ├─ User Management
│  └─ Email Templates
└─ Profile (user-specific)

When impersonating an organization:
├─ ⚠️ Admin Mode Banner: "Viewing as Acme Corp"
├─ [Exit Admin Mode] button
└─ Access all org features as if owner
```

### 3. Team Management Page (`/admin/team`)

**Members Tab:**
```
┌──────────────────────────────────────────┐
│  Team Members                            │
│  ┌────────────────────┐                  │
│  │ 🔍 Search members  │  [+ Invite]      │
│  └────────────────────┘                  │
│                                          │
│  👤 John Doe (You)                       │
│     john@acme.com                Owner   │
│                                          │
│  👤 Jane Smith                           │
│     jane@acme.com                Admin   │
│     [Change Role ▼] [Remove]            │
│                                          │
│  👤 Bob Wilson                           │
│     bob@acme.com                 Editor  │
│     [Change Role ▼] [Remove]            │
└──────────────────────────────────────────┘
```

**Invitations Tab:**
```
┌──────────────────────────────────────────┐
│  Pending Invitations                     │
│                                          │
│  ✉️ alice@example.com           Editor  │
│     Invited 2 days ago                   │
│     [Resend] [Cancel]                    │
│                                          │
│  ✉️ charlie@example.com         Viewer  │
│     Invited 5 days ago (expires in 2d)   │
│     [Resend] [Cancel]                    │
└──────────────────────────────────────────┘
```

### 4. Invite Member Modal

```
┌─────────────────────────────────────┐
│  Invite Team Member                 │
├─────────────────────────────────────┤
│                                     │
│  Email Address *                    │
│  ┌─────────────────────────────┐  │
│  │ email@example.com           │  │
│  └─────────────────────────────┘  │
│                                     │
│  Role *                             │
│  ┌─────────────────────────────┐  │
│  │ Editor              ▼       │  │
│  └─────────────────────────────┘  │
│  ├─ Owner (not available)          │
│  ├─ Admin                           │
│  ├─ Editor ✓                        │
│  └─ Viewer                          │
│                                     │
│  Message (optional)                 │
│  ┌─────────────────────────────┐  │
│  │ Join our team to help...    │  │
│  └─────────────────────────────┘  │
│                                     │
│  [Cancel]  [Send Invitation]       │
└─────────────────────────────────────┘
```

### 5. Organization Settings Page

```
┌────────────────────────────────────────┐
│  Organization Settings                 │
├────────────────────────────────────────┤
│                                        │
│  General                               │
│  Organization Name: Acme Corporation   │
│  Slug: acme-corp                       │
│  Logo: [Upload]                        │
│                                        │
│  Plan & Billing (owner only)           │
│  Current Plan: Pro                     │
│  Team Members: 3/10                    │
│  Widgets: 5/20                         │
│  [Upgrade Plan] [Manage Billing]      │
│                                        │
│  Danger Zone (owner only)              │
│  [Transfer Ownership]                  │
│  [Delete Organization]                 │
└────────────────────────────────────────┘
```

## 🔄 User Flows

### Flow 1: Creating an Organization

```
1. User signs up/logs in
2. Prompted to create organization
   "Create your organization to get started"
3. Fill form:
   - Organization name
   - Slug (auto-generated from name)
   - Plan selection
4. Organization created
5. User becomes owner
6. Redirected to dashboard
```

### Flow 2: Inviting Team Members

```
1. Owner/Admin goes to Team > Members
2. Clicks "Invite Member"
3. Enters email and selects role
4. System sends email invitation
5. Invitation saved with 7-day expiry
6. Invitee receives email with link
7. Clicks link → prompted to sign up/log in
8. Accepts invitation
9. Added to organization as team member
10. Email confirmation sent to inviter
```

### Flow 3: Switching Organizations

```
1. User clicks organization dropdown in header
2. Sees list of organizations they belong to
3. Selects different organization
4. Context switches:
   - All data filtered to new org
   - Permissions updated
   - Dashboard shows org-specific data
5. currentOrganizationId updated in session
```

### Flow 4: Managing Team Roles

```
1. Admin goes to Team > Members
2. Finds team member
3. Clicks "Change Role"
4. Selects new role from dropdown
5. Confirmation modal:
   "Change Bob's role from Editor to Admin?"
6. Confirms
7. Role updated in database
8. User's permissions immediately updated
9. Notification sent to affected user
```

### Flow 5: Platform Admin Impersonating Organization (NEW)

```
1. Platform admin logs in
2. Goes to "Organizations" in sidebar
3. Sees list of all client organizations
4. Finds "Acme Corp"
5. Clicks "Access Organization" button
6. Warning modal:
   "You are about to access Acme Corp's account. 
    All actions will be logged."
7. Confirms
8. Context switches to Acme Corp
9. Admin mode banner appears:
   "⚠️ Admin Mode: Viewing as Acme Corp [Exit Admin Mode]"
10. Can now:
    - View all their widgets
    - Edit their settings
    - Help troubleshoot
    - Create widgets on their behalf
11. All actions logged with platform admin's ID
12. Clicks "Exit Admin Mode"
13. Returns to platform admin view
```

### Flow 6: Demo Creation for Potential Client (NEW)

```
1. Platform admin logs in
2. Goes to "Demos" (only visible to platform admins)
3. Clicks "Create Demo"
4. Fills in:
   - Demo name: "Acme Corp Demo"
   - Target client: "Acme Corporation"
   - Client email: "contact@acme.com"
   - Client website: "https://acme.com"
   - Widget template to use
   - Usage limits and expiration
5. Demo created with unique URL
6. Platform admin shares link with prospect:
   "https://your-domain.com/demo/demo-abc123"
7. Prospect views demo on their website
8. Platform admin tracks:
   - Views
   - Interactions
   - Time spent
9. If client signs up:
   - Demo marked as "converted"
   - Linked to new organization
   - Demo data can be migrated to their account
```

## 🔧 API Endpoints

### Platform Admin Endpoints (New)

```javascript
// Get all organizations (platform admin only)
GET    /api/admin/platform/organizations
Query: { search?, status?, plan?, page?, limit? }

// Impersonate organization (platform admin only)
POST   /api/admin/platform/organizations/:id/impersonate
Response: { token, organization }

// Exit impersonation mode
POST   /api/admin/platform/exit-impersonation

// Get all demos (platform admin only)
GET    /api/admin/demos
Query: { search?, status?, page?, limit? }

// Create demo (platform admin only)
POST   /api/admin/demos
Body: { name, targetClient, demoSettings, widgetConfig }

// Update demo (platform admin only)
PUT    /api/admin/demos/:id

// Delete demo (platform admin only)
DELETE /api/admin/demos/:id

// Demo analytics (platform admin only)
GET    /api/admin/demos/:id/analytics

// Platform-wide analytics (platform admin only)
GET    /api/admin/platform/analytics
Query: { period?, metric? }
```

### Organizations

```javascript
// Create organization (any authenticated user)
POST   /api/organizations
Body: { name, slug?, plan }

// Get user's organizations (filtered by access)
GET    /api/organizations

// Get organization details (requires membership)
GET    /api/organizations/:id

// Update organization (requires admin/owner role)
PUT    /api/organizations/:id
Body: { name, logo, settings }

// Delete organization (owner only, or platform admin)
DELETE /api/organizations/:id

// Switch current organization
POST   /api/organizations/:id/switch
```

### Team Members

```javascript
// Get team members
GET    /api/organizations/:orgId/team

// Invite member
POST   /api/organizations/:orgId/team/invite
Body: { email, role, message? }

// Update member role
PUT    /api/organizations/:orgId/team/:memberId
Body: { role }

// Remove member
DELETE /api/organizations/:orgId/team/:memberId
```

### Invitations

```javascript
// Get pending invitations
GET    /api/organizations/:orgId/invitations

// Resend invitation
POST   /api/organizations/:orgId/invitations/:id/resend

// Cancel invitation
DELETE /api/organizations/:orgId/invitations/:id

// Accept invitation (public endpoint)
POST   /api/invitations/:token/accept

// Decline invitation
POST   /api/invitations/:token/decline
```

## 🛡️ Security Considerations

### 1. Data Isolation

```javascript
// Middleware to ensure organization isolation
async function requireOrganization(req, res, next) {
  const session = await getSession({ req });
  const orgId = req.headers['x-organization-id'] || 
                session.user.currentOrganizationId;
  
  if (!orgId) {
    return res.status(403).json({ error: 'No organization selected' });
  }
  
  // Verify user has access to this org
  const member = await db.collection('team_members').findOne({
    organizationId: new ObjectId(orgId),
    userId: new ObjectId(session.user.id),
    status: 'active'
  });
  
  if (!member) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  req.organization = { id: orgId, role: member.role };
  next();
}
```

### 2. Permission Checks

```javascript
// Permission checking utility
function hasPermission(role, action, resource) {
  const permissions = {
    owner: { /* all permissions */ },
    admin: { /* admin permissions */ },
    editor: { /* editor permissions */ },
    viewer: { /* viewer permissions */ }
  };
  
  return permissions[role]?.[resource]?.[action] || false;
}

// Usage in API
if (!hasPermission(req.organization.role, 'delete', 'widgets')) {
  return res.status(403).json({ error: 'Insufficient permissions' });
}
```

### 3. Invitation Security

- Secure random tokens (32+ characters)
- 7-day expiration
- Single-use tokens
- Email verification
- Rate limiting on invitations

## 📧 Email Templates

### Invitation Email

```html
Subject: You've been invited to join [Organization Name]

Hi there,

[Inviter Name] has invited you to join [Organization Name] 
on Elva-Agents as a [Role].

[Optional personal message]

Accept Invitation: [Link]

This invitation expires in 7 days.

---
Elva-Agents Team
```

### Role Change Notification

```html
Subject: Your role has been updated

Hi [Name],

Your role in [Organization Name] has been changed from 
[Old Role] to [New Role].

Your new permissions:
- [List of permissions]

Questions? Contact [Admin Email]
```

## 📈 Migration Strategy

### Phase 1: Foundation (Week 1-2)

1. Create database collections
2. Add organizationId to existing collections
3. Create default "Personal" organization for each user
4. Migrate existing widgets to user's personal org

### Phase 2: Core Features (Week 3-4)

1. Organization CRUD operations
2. Organization switcher UI
3. Team members management
4. Basic RBAC implementation

### Phase 3: Invitations (Week 5)

1. Invitation system
2. Email templates
3. Invitation acceptance flow
4. Notification system

### Phase 4: Polish & Testing (Week 6-7)

1. UI/UX refinements
2. Permission testing
3. Edge case handling
4. Documentation

### Phase 5: Advanced Features (Future)

1. Custom domains per organization
2. SSO integration
3. Audit logs
4. Advanced analytics per org
5. Billing integration (Stripe)

## 🧪 Testing Checklist

### Organization Management
- [ ] Create organization
- [ ] Update organization settings
- [ ] Delete organization (owner only)
- [ ] Switch between organizations
- [ ] Organization data isolation

### Team Management
- [ ] Invite team member
- [ ] Accept invitation
- [ ] Decline invitation
- [ ] Change member role
- [ ] Remove team member
- [ ] Resend invitation
- [ ] Cancel invitation
- [ ] Invitation expiry

### Permissions
- [ ] Owner can access all features
- [ ] Admin cannot access billing
- [ ] Editor cannot invite members
- [ ] Viewer is read-only
- [ ] Permission enforcement on API
- [ ] Permission enforcement on UI

### Data Isolation
- [ ] Widgets filtered by organization
- [ ] Demos filtered by organization
- [ ] Analytics filtered by organization
- [ ] No cross-organization data leaks

## 📊 Metrics to Track

1. **Organization Adoption**
   - Number of organizations created
   - Average team size
   - Organizations by plan

2. **Team Collaboration**
   - Invitation acceptance rate
   - Average response time to invitations
   - Team member activity

3. **Permission Usage**
   - Distribution of roles
   - Permission-related errors
   - Role changes over time

## 🚀 Future Enhancements

1. **Workspace Templates**
   - Pre-configured widget templates per industry
   - Starter packs for new organizations

2. **Advanced Collaboration**
   - Comments on widgets
   - Activity feed
   - Real-time collaboration

3. **Enterprise Features**
   - SSO (SAML, OIDC)
   - Advanced audit logs
   - Custom roles creation
   - IP whitelisting
   - Data residency options

4. **Billing & Monetization**
   - Stripe integration
   - Usage-based pricing
   - Annual subscriptions
   - Enterprise contracts

5. **White-Label**
   - Custom branding per organization
   - Custom domains
   - Removable Elva branding

## 📝 Implementation Priority

### Must Have (MVP)
1. ✅ Organizations (create, read, update, delete)
2. ✅ Basic RBAC (owner, admin, editor, viewer)
3. ✅ Team member management
4. ✅ Invitation system
5. ✅ Organization switcher
6. ✅ Data isolation

### Should Have (V2)
1. ⭐ Email notifications
2. ⭐ Activity logs
3. ⭐ Advanced permissions
4. ⭐ Billing integration
5. ⭐ Organization branding

### Nice to Have (Future)
1. 💡 SSO integration
2. 💡 Custom roles
3. 💡 Workspace templates
4. 💡 Real-time collaboration
5. 💡 White-label options

## 🎯 Success Criteria

1. **Functionality**
   - Users can create and manage organizations
   - Team members can be invited and managed
   - Permissions work as expected
   - Data is properly isolated

2. **Performance**
   - Page load time < 2s
   - Organization switch < 500ms
   - API response time < 200ms

3. **Security**
   - Zero data leaks between organizations
   - Permissions properly enforced
   - Invitations secure and time-limited

4. **UX**
   - Intuitive organization management
   - Clear role explanations
   - Smooth team invitation flow
   - Easy organization switching

---

**Next Steps:**
1. Review and approve this plan
2. Create technical specification
3. Design database migrations
4. Build UI mockups
5. Begin Phase 1 implementation



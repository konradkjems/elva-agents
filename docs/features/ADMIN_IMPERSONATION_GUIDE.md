# Platform Admin Features - Impersonation & Demo Management

## 🎯 Overview

This guide explains the platform admin exclusive features:
1. **Organization Impersonation** - Access any client organization for support
2. **Demo Management** - Create and manage demos for potential clients

## 🔐 Organization Impersonation

### What is it?

Platform admins (Elva team) can "impersonate" or access any client organization to provide support, troubleshoot issues, or manage accounts on behalf of clients.

### Why is it needed?

- **Customer Support**: Help clients troubleshoot issues
- **Account Management**: Set up widgets for clients who need help
- **Quality Assurance**: Verify client setups are correct
- **Migration**: Move data or configure complex setups
- **Training**: Show clients how to use features

### How it works

#### UI Design

**Organizations List Page** (`/admin/platform/organizations`)

```
┌─────────────────────────────────────────────────────────┐
│  All Client Organizations                    [+ Create] │
├─────────────────────────────────────────────────────────┤
│  🔍 Search organizations...                             │
│                                                          │
│  📊 Total: 24 organizations                             │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Acme Corporation                                 │  │
│  │ acme-corp • Pro Plan • 5 members                 │  │
│  │ 12 widgets • Active • Owner: john@acme.com       │  │
│  │ [Access Organization] [View Details] [...]       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Beta Company                                     │  │
│  │ beta-co • Starter Plan • 2 members               │  │
│  │ 3 widgets • Active • Owner: alice@beta.com       │  │
│  │ [Access Organization] [View Details] [...]       │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Admin Mode Banner** (appears when impersonating)

```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ ADMIN MODE                                           │
│ You are viewing as: Acme Corporation                    │
│ All actions are logged • [Exit Admin Mode]             │
└─────────────────────────────────────────────────────────┘
```

**Audit Log Entry** (in background)

```javascript
{
  action: "organization_impersonation",
  platformAdminId: ObjectId("..."),
  platformAdminEmail: "admin@elva.com",
  organizationId: ObjectId("..."),
  organizationName: "Acme Corp",
  timestamp: ISODate("2025-01-01T10:00:00Z"),
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0..."
}
```

### Implementation

#### 1. Check if User is Platform Admin

```javascript
// Middleware
async function requirePlatformAdmin(req, res, next) {
  const session = await getSession({ req });
  
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const user = await db.collection('users').findOne({
    _id: new ObjectId(session.user.id)
  });
  
  if (user.platformRole !== 'platform_admin') {
    return res.status(403).json({ error: 'Platform admin access required' });
  }
  
  req.platformAdmin = user;
  next();
}
```

#### 2. Impersonation API

```javascript
// POST /api/admin/platform/organizations/:id/impersonate
export default async function handler(req, res) {
  // Only platform admins can impersonate
  await requirePlatformAdmin(req, res, async () => {
    const { id } = req.query;
    
    // Verify organization exists
    const org = await db.collection('organizations').findOne({
      _id: new ObjectId(id)
    });
    
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    // Log the impersonation
    await db.collection('audit_logs').insertOne({
      action: 'organization_impersonation',
      platformAdminId: req.platformAdmin._id,
      platformAdminEmail: req.platformAdmin.email,
      organizationId: org._id,
      organizationName: org.name,
      timestamp: new Date(),
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent']
    });
    
    // Set session data
    const session = await getSession({ req });
    session.impersonating = {
      organizationId: org._id,
      organizationName: org.name,
      platformAdminId: req.platformAdmin._id,
      startedAt: new Date()
    };
    
    return res.status(200).json({
      success: true,
      organization: org,
      message: `Now viewing as ${org.name}`
    });
  });
}
```

#### 3. Session Management

```javascript
// In middleware.js or auth context
function getEffectiveOrganization(session) {
  // If platform admin is impersonating, use that org
  if (session.impersonating) {
    return {
      id: session.impersonating.organizationId,
      name: session.impersonating.organizationName,
      isImpersonating: true,
      platformAdmin: session.impersonating.platformAdminId
    };
  }
  
  // Otherwise use user's current organization
  return {
    id: session.user.currentOrganizationId,
    isImpersonating: false
  };
}
```

#### 4. UI Components

```javascript
// AdminModeBanner.jsx
export function AdminModeBanner({ organization, onExit }) {
  return (
    <div className="bg-yellow-50 border-b-2 border-yellow-400 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <div>
            <p className="text-sm font-semibold text-yellow-900">
              Admin Mode
            </p>
            <p className="text-xs text-yellow-700">
              Viewing as: {organization.name} • All actions are logged
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onExit}
          className="border-yellow-600 text-yellow-900"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Exit Admin Mode
        </Button>
      </div>
    </div>
  );
}
```

### Security Considerations

1. **Audit Logging**: All impersonation sessions logged
2. **Time Limits**: Optional auto-logout after 1 hour
3. **Warnings**: Clear UI indicators when in admin mode
4. **Notifications**: Option to notify org owner when accessed
5. **Read-Only Mode**: Option to restrict to view-only
6. **IP Restrictions**: Limit to company IPs only

---

## 🎭 Demo Management (Platform Admin Only)

### What is it?

Demos are special widget instances created by platform admins to showcase the platform to potential clients. Unlike regular widgets, demos:

- Are **platform-level** (not tied to any organization)
- Can only be created/managed by platform admins
- Track usage for sales purposes
- Can be time-limited with view/interaction limits
- Can be converted to real widgets when client signs up

### Why Platform Admin Only?

- **Sales Tool**: Elva team uses demos to show platform to prospects
- **Quality Control**: Ensures demos are professional and configured correctly
- **Tracking**: Platform admin tracks which demos convert to paying customers
- **Resource Management**: Prevents abuse by limiting to internal team

### UI for Platform Admins

**Demos Page** (`/admin/demos` - only visible to platform admins)

```
┌─────────────────────────────────────────────────────────┐
│  Demos                                      [+ Create]   │
├─────────────────────────────────────────────────────────┤
│  🔍 Search demos...         Filter: [All ▼]            │
│                                                          │
│  📊 24 active demos • 8 converted • 3 expired           │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Demo for Acme Corp                               │  │
│  │ For: contact@acme.com • Created: 2 days ago      │  │
│  │ 🌐 https://acme.com                              │  │
│  │ Status: Active • Views: 45/100 • Expires: 5 days │  │
│  │ [View Demo] [Analytics] [Edit] [Share] [...]    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Demo for Beta Company                  ✅ Conv.  │  │
│  │ For: alice@beta.com • Created: 14 days ago       │  │
│  │ Status: Converted to Beta Company org           │  │
│  │ [View Original] [View Organization]              │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Create Demo Form**

```
┌─────────────────────────────────────────┐
│  Create Demo                            │
├─────────────────────────────────────────┤
│                                         │
│  Demo Name *                            │
│  ┌─────────────────────────────────┐  │
│  │ Acme Corp Demo                  │  │
│  └─────────────────────────────────┘  │
│                                         │
│  Target Client                          │
│  Name: Acme Corporation                 │
│  Email: contact@acme.com                │
│  Notes: Interested in support widget    │
│                                         │
│  Client Website URL                     │
│  ┌─────────────────────────────────┐  │
│  │ https://acme.com                │  │
│  └─────────────────────────────────┘  │
│                                         │
│  Widget Template                        │
│  ┌─────────────────────────────────┐  │
│  │ Support Widget Template     ▼   │  │
│  └─────────────────────────────────┘  │
│                                         │
│  Usage Limits                           │
│  Max Views: 100                         │
│  Max Interactions: 50                   │
│  Expires: [Date Picker] (7 days)       │
│                                         │
│  [Cancel]  [Create Demo]               │
└─────────────────────────────────────────┘
```

**Demo Analytics**

```
┌─────────────────────────────────────────┐
│  Demo Analytics: Acme Corp Demo         │
├─────────────────────────────────────────┤
│                                         │
│  📊 Usage Stats                         │
│  Views: 45 / 100 (45%)                  │
│  Interactions: 23 / 50 (46%)            │
│  Unique Visitors: 8                     │
│  Avg. Session: 3m 24s                   │
│                                         │
│  📈 Engagement                          │
│  Messages Sent: 67                      │
│  Avg. Messages per Session: 2.9         │
│  Most Active: 2:00 PM - 4:00 PM        │
│                                         │
│  🎯 Conversion Status                   │
│  Status: Active                         │
│  Follow-ups: 2                          │
│  Next Step: Schedule call (Jan 15)     │
│                                         │
│  [Mark as Converted] [Extend Limits]   │
└─────────────────────────────────────────┘
```

### Demo Lifecycle

```
1. Created (by platform admin)
   ↓
2. Shared (link sent to prospect)
   ↓
3. Active (prospect testing)
   ↓
4. Either:
   a) Converted → Client signs up → Demo linked to org
   b) Expired → No signup → Demo archived
   c) Cancelled → Prospect not interested
```

### Implementation Notes

```javascript
// Hide demo features from non-platform-admins
function DemoNavItem() {
  const { data: session } = useSession();
  
  if (session.user.platformRole !== 'platform_admin') {
    return null; // Don't show at all
  }
  
  return (
    <NavItem href="/admin/demos" icon={Globe}>
      Demos
      <Badge>Platform</Badge>
    </NavItem>
  );
}

// API protection
export default async function handler(req, res) {
  await requirePlatformAdmin(req, res, async () => {
    // Demo CRUD operations only for platform admins
    // ...
  });
}
```

---

## 🔒 Security & Compliance

### Audit Logging

All platform admin actions are logged:

```javascript
{
  timestamp: ISODate,
  platformAdminId: ObjectId,
  action: "impersonate_organization" | "create_demo" | "delete_demo" | ...,
  targetOrganizationId: ObjectId,
  changes: {},
  ipAddress: string,
  userAgent: string,
  sessionId: string
}
```

### GDPR Compliance

- Audit logs retained for 90 days
- Can be exported for client requests
- Platform admin access can be revoked instantly
- Notifications to org owners (optional)

### Best Practices

1. **Use impersonation only when necessary**
2. **Exit admin mode as soon as done**
3. **Document reason in support ticket**
4. **Notify client if making changes**
5. **Use read-only mode when possible**
6. **Review audit logs weekly**

---

## 📊 Comparison: Platform Admin vs Organization Owner

| Feature | Platform Admin | Organization Owner |
|---------|---------------|-------------------|
| Create Demos | ✅ (exclusively) | ❌ Never |
| Access Any Org | ✅ (all orgs) | ❌ (own org only) |
| System Settings | ✅ | ❌ |
| View All Orgs | ✅ | ❌ |
| Create Widgets | ✅ (any org context) | ✅ (own org only) |
| Manage Team | ✅ (any org) | ✅ (own org only) |
| Billing | ✅ (view all) | ✅ (own org only) |
| Analytics | ✅ (platform-wide) | ✅ (own org only) |

---

**Next:** See [SUBACCOUNTS_AND_TEAMS_PLAN.md](./SUBACCOUNTS_AND_TEAMS_PLAN.md) for full implementation details.


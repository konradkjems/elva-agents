# Phase 1: Foundation - Setup Guide

## ✅ What's Been Completed

Phase 1 of the Subaccounts & Teams implementation is now complete! Here's what's been built:

### 📦 Database Schema
- **Organizations Collection** - Stores client subaccounts
- **Team Members Collection** - Links users to organizations with roles
- **Invitations Collection** - Manages team invitations (ready for Phase 3)
- **Updated Users Collection** - Added platformRole and currentOrganizationId
- **Updated Widgets Collection** - Added organizationId for data isolation
- **Updated Demos Collection** - Refactored to be platform-admin exclusive

### 🛠️ Migration Scripts
- `scripts/init-organizations-schema.js` - Initialize new collections
- `scripts/migrate-to-organizations.js` - Migrate existing data
- `scripts/set-platform-admin.js` - Promote users to platform admin
- `scripts/verify-migration.js` - Verify migration success
- `scripts/rollback-migration.js` - Rollback if needed

### 🔌 API Endpoints
- `POST /api/organizations` - Create new organization
- `GET /api/organizations` - List user's organizations
- `GET /api/organizations/:id` - Get organization details
- `PUT /api/organizations/:id` - Update organization
- `DELETE /api/organizations/:id` - Soft delete organization
- `POST /api/organizations/:id/switch` - Switch organization context

---

## 🚀 Setup Instructions

### Step 1: Backup Your Database

**CRITICAL:** Before running any migration, backup your MongoDB database!

```bash
# Using mongodump
mongodump --uri="your-mongodb-uri" --out=./backup-$(date +%Y%m%d)

# Or use MongoDB Atlas backup feature if using Atlas
```

### Step 2: Initialize Database Schema

This creates the new collections with proper validation and indexes:

```bash
node scripts/init-organizations-schema.js
```

**Expected Output:**
```
✅ Connected to MongoDB
✅ Organizations collection created with indexes
✅ Team members collection created with indexes
✅ Invitations collection created with indexes
✅ Users collection indexes updated
✅ Widgets collection indexes updated
✅ Demos collection indexes updated
✨ Schema initialization complete!
```

### Step 3: Run Migration

This migrates your existing data to the new multi-tenant structure:

```bash
node scripts/migrate-to-organizations.js
```

**What it does:**
1. Adds `platformRole` to all users (defaults to 'user')
2. Creates a personal organization for each existing user
3. Adds the user as 'owner' of their organization
4. Migrates all widgets to the user's personal organization
5. Updates demos to new schema (platform-level only)

**Expected Output:**
```
✅ Updated X users
✅ Created X organizations and X team memberships
✅ Migrated X widgets to organizations
✅ Updated X demos
✨ Migration complete!
```

### Step 4: Verify Migration

Check that everything migrated correctly:

```bash
node scripts/verify-migration.js
```

**Expected Output:**
```
✅ Verification PASSED - Migration successful!
🎉 Your database is ready for multi-tenancy!
```

If verification fails, review the error messages and either:
- Fix the issues manually
- Re-run the migration
- Restore from backup and try again

### Step 5: Set Platform Admin

Promote your admin account(s) to platform admin:

```bash
node scripts/set-platform-admin.js your-email@example.com
```

**Platform Admin Capabilities:**
- Create and manage demos (exclusive)
- Access any organization (impersonation mode)
- View all users and organizations
- System-wide settings

You can set multiple platform admins by running this for each email.

### Step 6: Test the API Endpoints

Test the new organization APIs:

```bash
# Get your organizations (requires authentication)
curl http://localhost:3000/api/organizations \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Create a new organization
curl -X POST http://localhost:3000/api/organizations \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{"name": "Test Organization", "plan": "free"}'

# Get organization details
curl http://localhost:3000/api/organizations/ORG_ID \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Switch organization context
curl -X POST http://localhost:3000/api/organizations/ORG_ID/switch \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

---

## 🧪 Testing Checklist

Before moving to Phase 2, verify these work:

### User Organizations
- [ ] Each existing user has a personal organization
- [ ] User is marked as 'owner' of their organization
- [ ] `currentOrganizationId` is set for all users

### Widgets
- [ ] All widgets have `organizationId`
- [ ] Widgets are linked to correct organization
- [ ] No orphaned widgets (without organizationId)

### Demos
- [ ] Demos have `createdBy` field
- [ ] Demos have `targetClient` object
- [ ] Demos do NOT have `organizationId` (platform-level only)

### Platform Admin
- [ ] At least one user has `platformRole: 'platform_admin'`
- [ ] Platform admin can access all organizations (will be implemented in UI)

### API Endpoints
- [ ] Can list organizations
- [ ] Can create new organization
- [ ] Can get organization details
- [ ] Can update organization
- [ ] Can switch organization context
- [ ] Can soft delete organization

---

## ⚠️ Troubleshooting

### Migration Failed Partially

If migration fails midway:

1. **Check the error message** - It will tell you which step failed
2. **Review database state** - Use MongoDB Compass or CLI
3. **Options:**
   - Fix the issue and re-run (script is idempotent)
   - Use rollback script and try again
   - Restore from backup

### Rollback Migration

If you need to completely undo the migration:

```bash
node scripts/rollback-migration.js --confirm
```

**WARNING:** This will delete:
- All organizations
- All team members
- All invitations
- Remove new fields from users and widgets

### Users Without Organizations

If verification shows users without organizations:

```bash
# Re-run migration (it's safe to run multiple times)
node scripts/migrate-to-organizations.js
```

### Duplicate Slugs

If you get duplicate slug errors:

```javascript
// The migration script auto-handles this, but if you see it:
// Manually fix in MongoDB:
db.organizations.updateOne(
  { _id: ObjectId("...") },
  { $set: { slug: "unique-slug-here" } }
);
```

---

## 📊 Database Verification Queries

Use these MongoDB queries to verify your data:

```javascript
// Count organizations
db.organizations.countDocuments()

// Count team members
db.team_members.countDocuments()

// Find users without platformRole
db.users.find({ platformRole: { $exists: false } })

// Find widgets without organizationId (excluding demos)
db.widgets.find({ 
  isDemoMode: { $ne: true },
  organizationId: { $exists: false } 
})

// Find demos with organizationId (should be empty)
db.demos.find({ organizationId: { $exists: true } })

// List all organizations with owner info
db.organizations.aggregate([
  {
    $lookup: {
      from: 'users',
      localField: 'ownerId',
      foreignField: '_id',
      as: 'owner'
    }
  },
  { $unwind: '$owner' },
  {
    $project: {
      name: 1,
      slug: 1,
      'owner.email': 1,
      'owner.name': 1,
      createdAt: 1
    }
  }
])
```

---

## ✅ Success Criteria

Phase 1 is complete when:

1. ✅ All collections created with proper schema
2. ✅ All existing users have personal organizations
3. ✅ All widgets migrated to organizations
4. ✅ At least one platform admin set
5. ✅ Verification script passes
6. ✅ All API endpoints work correctly
7. ✅ No data loss or corruption

---

## 🎯 Next Steps: Phase 2

Once Phase 1 is verified and working:

1. **Phase 2:** Build the UI for organization management
   - Organization switcher component
   - Organization settings page
   - Create organization flow
   - Data isolation middleware
   - Dashboard updates

2. **Read the Phase 2 Guide:**
   - See `docs/features/SUBACCOUNTS_ROADMAP.md` for Phase 2 tasks

---

## 📞 Support

If you encounter issues:

1. Check the error messages carefully
2. Review the troubleshooting section above
3. Use MongoDB Compass to inspect your database
4. Check the verification queries
5. Restore from backup if needed

Remember: **Always backup before migrating!**

---

**Status:** ✅ Phase 1 Complete  
**Next:** Phase 2 - UI Development  
**Last Updated:** January 2025


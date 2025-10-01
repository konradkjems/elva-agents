# 🚀 Quick Start: Phase 1 Multi-Tenancy

## Ready to Enable Multi-Tenancy?

Phase 1 foundation is complete! Here's how to set it up in **5 simple steps**.

## ⚡ 5-Minute Setup

### Step 1: Backup Your Database ⚠️

```bash
# CRITICAL: Always backup first!
mongodump --uri="your-mongodb-uri" --out=./backup-$(date +%Y%m%d)
```

### Step 2: Initialize Schema

```bash
node scripts/init-organizations-schema.js
```

✅ Creates 3 new collections: `organizations`, `team_members`, `invitations`

### Step 3: Migrate Data

```bash
node scripts/migrate-to-organizations.js
```

✅ Creates personal org for each user  
✅ Migrates all widgets to organizations  
✅ Updates demos to platform-level

### Step 4: Verify Success

```bash
node scripts/verify-migration.js
```

✅ Should output: "Verification PASSED - Migration successful!"

### Step 5: Set Platform Admin

```bash
node scripts/set-platform-admin.js your-email@example.com
```

✅ Grants you platform admin access

## 🎉 That's It!

Your platform is now multi-tenant! 

## 📋 What You Can Now Do

### As Platform Admin
- ✅ Access any organization
- ✅ Create demos for potential clients
- ✅ View all organizations and users
- ✅ Manage system-wide settings

### For Your Clients
- ✅ Each has their own isolated organization
- ✅ Their widgets are private to them
- ✅ Ready for team members (Phase 3)

## 🧪 Test It

### Test the APIs:

```bash
# Start your server
npm run dev

# In another terminal, test (replace SESSION_TOKEN):
curl http://localhost:3000/api/organizations \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

You should see your organization(s)!

## 🔄 If Something Goes Wrong

### Rollback:
```bash
node scripts/rollback-migration.js --confirm
```

### Re-run Migration:
```bash
# Migration is idempotent (safe to run multiple times)
node scripts/migrate-to-organizations.js
```

### Restore from Backup:
```bash
mongorestore --uri="your-mongodb-uri" ./backup-DATE
```

## 📖 Need More Details?

**Full guide:** [`docs/features/PHASE_1_SETUP_GUIDE.md`](./docs/features/PHASE_1_SETUP_GUIDE.md)

## ➡️ What's Next?

**Phase 2** will build the UI:
- Organization switcher in header
- Settings page for organizations
- Create organization flow
- Team management interface

**Timeline:** 2-3 weeks

**Roadmap:** [`docs/features/SUBACCOUNTS_ROADMAP.md`](./docs/features/SUBACCOUNTS_ROADMAP.md)

## 🆘 Need Help?

1. Check verification script output
2. Review `docs/features/PHASE_1_SETUP_GUIDE.md`
3. Check MongoDB for data issues
4. Use rollback if needed

---

**Happy multi-tenanting! 🎊**


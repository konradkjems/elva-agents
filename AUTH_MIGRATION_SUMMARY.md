# Authentication Migration Summary

## ✅ What Changed

The authentication system has been updated to use the new **`elva-agents`** database instead of the old `chatwidgets` database.

### Files Updated

**`pages/api/auth/[...nextauth].js`**
- ✅ Credentials provider now uses `elva-agents` database
- ✅ Google OAuth now uses `elva-agents` database
- ✅ New users automatically get an organization created
- ✅ Session includes multi-tenancy fields:
  - `platformRole` - User's platform role (platform_admin or user)
  - `currentOrganizationId` - User's active organization
  - `role` - Legacy role field (for backwards compatibility)
  - `permissions` - Legacy permissions field

### Database Strategy

**Old Database:** `chatwidgets` - Untouched, safe backup  
**New Database:** `elva-agents` - Active multi-tenant system

---

## 🧪 How to Test

### 1. Test Existing Admin Login

```bash
npm run dev
```

**Visit:** `http://localhost:3000/admin/login`

**Login with:**
- 📧 Email: `admin@elva-solutions.com`
- 🔑 Password: `admin123`

**Expected result:**
- ✅ Successfully logs in
- ✅ Session includes all fields
- ✅ You can access admin panel

### 2. Test Google OAuth (Optional)

If you have Google OAuth configured:
- Click "Sign in with Google"
- First-time users will:
  - ✅ Be created in `elva-agents.users`
  - ✅ Get a personal organization created
  - ✅ Be set as owner of their organization
  - ✅ Have their `currentOrganizationId` set

### 3. Check Session Data

After logging in, open browser console and run:

```javascript
fetch('/api/auth/session')
  .then(r => r.json())
  .then(data => console.log(data))
```

**Expected session data:**
```json
{
  "user": {
    "id": "...",
    "email": "admin@elva-solutions.com",
    "name": "Admin User",
    "role": "admin",
    "permissions": [...],
    "platformRole": "platform_admin",
    "currentOrganizationId": "...",
    "provider": "credentials"
  }
}
```

---

## 🔐 How It Works Now

### Login Flow (Credentials)

1. User enters email/password
2. NextAuth queries `elva-agents.users` collection
3. Validates password
4. Creates JWT with user data + multi-tenancy fields
5. Returns session with organization context

### Login Flow (Google OAuth)

1. User clicks "Sign in with Google"
2. Google authenticates user
3. NextAuth checks `elva-agents.users` for existing user
4. **If new user:**
   - Creates user in `elva-agents.users`
   - Creates personal organization
   - Creates team_member entry (owner role)
   - Sets `currentOrganizationId`
5. **If existing user:**
   - Updates last login
   - Updates profile image
6. Returns session with all fields

### Session Management

- JWT strategy (24-hour sessions)
- Includes all user fields + multi-tenancy data
- Available in all API routes via `getSession()` or `getToken()`

---

## 🎯 What This Enables

### For API Routes

```javascript
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  // Access multi-tenancy fields
  const userId = session.user.id;
  const orgId = session.user.currentOrganizationId;
  const isPlatformAdmin = session.user.platformRole === 'platform_admin';
  
  // Filter data by organization
  const widgets = await db.collection('widgets').find({
    organizationId: new ObjectId(orgId)
  }).toArray();
  
  return res.json({ widgets });
}
```

### For Client Components

```javascript
import { useSession } from 'next-auth/react';

export default function MyComponent() {
  const { data: session } = useSession();
  
  return (
    <div>
      <p>Org ID: {session?.user?.currentOrganizationId}</p>
      <p>Platform Admin: {session?.user?.platformRole === 'platform_admin' ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

---

## ⚠️ Important Notes

### Password Security

The current implementation uses **plain text password comparison**:

```javascript
if (user.password !== credentials.password) {
  return null
}
```

**⚠️ For production, you MUST:**
1. Install bcrypt: `npm install bcryptjs`
2. Hash passwords during user creation
3. Compare hashes during login

**Example:**
```javascript
import bcrypt from 'bcryptjs';

// During signup
const hashedPassword = await bcrypt.hash(password, 10);

// During login
const isValid = await bcrypt.compare(credentials.password, user.password);
```

### Session Access

All protected routes can now access:
- `session.user.currentOrganizationId` - Current active organization
- `session.user.platformRole` - Platform-level role
- `session.user.role` - Legacy role (for backwards compatibility)

### Organization Switching

When a user switches organizations (Phase 2 UI), update their session:

```javascript
// Update in database
await db.collection('users').updateOne(
  { _id: userId },
  { $set: { currentOrganizationId: newOrgId } }
);

// User needs to re-login or refresh token
```

---

## 🚀 Next Steps

1. ✅ **Test login** - Make sure admin login works
2. ✅ **Check session** - Verify all fields are present
3. 🔄 **Phase 2** - Build organization switcher UI
4. 🔐 **Production** - Implement bcrypt password hashing

---

**Status:** ✅ Authentication migrated to `elva-agents` database  
**Backwards Compatible:** Yes (old role/permissions fields included)  
**Ready for Phase 2:** Yes (session includes organization context)


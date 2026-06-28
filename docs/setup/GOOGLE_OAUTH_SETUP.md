> ⚠️ **Historical / pre-migration document.** As of June 2026 the platform runs on **Supabase** (Postgres + Auth + Storage); MongoDB, NextAuth, and Cloudinary have been removed, along with their setup scripts and npm commands. Steps, env vars, and commands below that reference those services are outdated — see `WARP.md` / `CLAUDE.md` for the current setup.

# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for your Elva-Agents admin panel.

## 📋 Prerequisites

- Google Cloud Console account
- Admin access to your Vercel project

## 🚀 Step 1: Create Google OAuth Credentials

### 1.1 Go to Google Cloud Console

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**

### 1.2 Configure OAuth Consent Screen

1. Click **OAuth consent screen** in the left sidebar
2. Select **External** (or Internal if you have Google Workspace)
3. Fill in the required information:
   - **App name**: Elva-Agents Admin
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Click **Save and Continue**
5. Skip the **Scopes** section (click **Save and Continue**)
6. Add test users if needed
7. Click **Save and Continue**

### 1.3 Create OAuth 2.0 Client ID

1. Go back to **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Web application**
4. Configure the settings:
   - **Name**: Elva-Agents Admin Login
   - **Authorized JavaScript origins**:
     ```
     http://localhost:3000
     https://your-production-domain.com
     https://elva-agents.vercel.app
     ```
   - **Authorized redirect URIs**:
     ```
     http://localhost:3000/api/auth/callback/google
     https://your-production-domain.com/api/auth/callback/google
     https://elva-agents.vercel.app/api/auth/callback/google
     ```
5. Click **Create**
6. **Copy your Client ID and Client Secret** - you'll need these!

## 🔐 Step 2: Add Environment Variables

### 2.1 Local Development (.env.local)

Create or update your `.env.local` file:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

### 2.2 Vercel Production

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

```
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

4. Make sure these are set for **Production**, **Preview**, and **Development** environments
5. **Redeploy** your application

## 🎯 Step 3: How It Works

### First Time Google Login

When a user signs in with Google for the first time:

1. User clicks "Sign in with Google"
2. Google OAuth flow authenticates the user
3. System checks if user exists in database
4. If **new user**:
   - Creates user account with Google email
   - Sets default role to `admin`
   - Sets default permissions: `['read', 'write', 'delete']`
   - Stores user in MongoDB `users` collection
5. If **existing user**:
   - Updates last login timestamp
   - Updates profile image from Google

### Subsequent Logins

- User data is fetched from database
- Role and permissions from database are used
- Session is created with JWT

## 🔧 Customizing User Roles

By default, new Google users get `admin` role. To change this:

Edit `pages/api/auth/[...nextauth].js` line 88:

```javascript
// Change this line
role: 'admin', // Default role

// To something else, e.g.:
role: 'viewer', // Read-only access
// or
role: 'editor', // Limited access
```

## 🧪 Testing

### Test Locally

1. Start your development server: `npm run dev`
2. Go to `http://localhost:3000/admin/login`
3. Click **Sign in with Google**
4. Authenticate with your Google account
5. You should be redirected to `/admin`

### Test in Production

1. Deploy to Vercel
2. Go to `https://your-domain.com/admin/login`
3. Click **Sign in with Google**
4. Verify authentication works

## 🛡️ Security Considerations

### Production Checklist

- ✅ Use strong `NEXTAUTH_SECRET` (32+ characters)
- ✅ Set proper authorized domains in Google Console
- ✅ Use environment variables (never commit secrets)
- ✅ Enable HTTPS in production
- ✅ Configure authorized redirect URIs correctly
- ✅ Review and limit OAuth scopes if needed

### User Management

Users created via Google OAuth are stored in your MongoDB `users` collection:

```javascript
{
  email: "user@example.com",
  name: "User Name",
  image: "https://...",
  role: "admin",
  permissions: ["read", "write", "delete"],
  status: "active",
  provider: "google",
  createdAt: ISODate(),
  lastLogin: ISODate()
}
```

## 🐛 Troubleshooting

### Error: "Redirect URI mismatch"

**Solution**: Add the exact redirect URI shown in the error to Google Console's Authorized redirect URIs.

### Error: "Invalid client"

**Solution**: 
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Check environment variables are set in Vercel
- Redeploy after adding variables

### Error: "Unauthorized domain"

**Solution**: Add your domain to Authorized JavaScript origins in Google Console.

### Google Sign-in Button Not Working

**Solution**:
1. Check browser console for errors
2. Verify environment variables are set
3. Ensure OAuth consent screen is configured
4. Check that you're using HTTPS in production

## 📝 Managing Users

### View Google Users

Users who signed in with Google will have `provider: "google"` in the database.

### Manually Change User Role

Use MongoDB or create an admin interface:

```javascript
// Update user role
db.collection('users').updateOne(
  { email: 'user@example.com' },
  { $set: { role: 'viewer', permissions: ['read'] } }
)
```

## 🎉 Success!

You now have Google OAuth authentication set up! Users can sign in with either:
- Email/Password (existing system)
- Google Account (new option)

Both methods work seamlessly and provide access to the admin panel.


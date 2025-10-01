# Fix Demo URLs - Issues & Solutions

## Problem 1: Localhost URLs
Demo URLs are showing `http://localhost:3000/demo/...` instead of your production domain.

**Root Cause:** The environment variables in Vercel are set to localhost instead of your production URL.

## Problem 2: Mixed Content (HTTP/HTTPS)
Demo pages fail to load HTTP websites in iframes when the demo page is served over HTTPS.

**Root Cause:** Browsers block "mixed content" - loading HTTP resources on HTTPS pages for security reasons.

## Solutions

### Fix 1: Update Vercel Environment Variables (for Localhost Issue)

#### Step 1: Update Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Update or add these variables:

```
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
NEXTAUTH_URL=https://your-production-domain.com
```

Replace `your-production-domain.com` with your actual production domain (e.g., `elva-solutions.com` or `elva-agents.vercel.app`).

4. **Important**: Redeploy your application after updating environment variables.

#### Step 2: Fix Existing Demo URLs

After updating the environment variables and redeploying, run this command to fix all existing demo URLs in your database:

**Option A: Using Browser (Recommended)**

1. Log in to your production admin panel
2. Open browser developer console (F12)
3. Run this command:

```javascript
fetch('/api/admin/update-demo-urls', { 
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(res => res.json())
.then(data => console.log('Update result:', data))
.catch(err => console.error('Error:', err));
```

**Option B: Using cURL**

```bash
curl -X POST https://your-production-domain.com/api/admin/update-demo-urls \
  -H "Content-Type: application/json"
```

Replace `your-production-domain.com` with your actual domain.

#### Step 3: Verify the Fix

1. Go to your admin panel
2. Navigate to the widgets page
3. View any demo - the URL should now use your production domain

### Fix 2: Handle HTTP/HTTPS Mixed Content

The demo page now automatically handles mixed content issues:

1. **Auto-upgrade to HTTPS**: If a client website uses HTTP, the system attempts to upgrade to HTTPS
2. **Instant screenshot fallback**: If HTTP cannot be upgraded, shows screenshot immediately instead of waiting
3. **Clear messaging**: Users see why the iframe cannot be displayed

**What to do:**
- **Option A**: Ask clients to use HTTPS versions of their websites (recommended for security)
- **Option B**: The system will automatically show a screenshot fallback for HTTP sites
- **Option C**: Users can click "Open Website in New Tab" to view the original site

**Important Note:** If a client's website is HTTP-only, the demo will:
1. Try to load the HTTPS version
2. If that fails, show a screenshot (if available)
3. If no screenshot, show a message with a link to open the site in a new tab

The chat widget will still be functional on the demo page regardless of whether the iframe loads.

## Technical Changes Made

### Localhost URL Fix

The following files have been updated to dynamically detect the production URL from request headers:

- `pages/api/admin/demos.js` - Demo creation endpoint
- `pages/api/admin/demo-widgets.js` - Demo widgets endpoint  
- `pages/api/admin/update-demo-urls.js` - URL update script

These changes ensure that new demos will automatically use the correct domain, even if environment variables are not set correctly.

### Mixed Content Fix

Updated `pages/demo/[demoId].js` to:
- Detect HTTP/HTTPS protocol mismatches on page load
- Attempt to auto-upgrade HTTP URLs to HTTPS
- Immediately fallback to screenshot for HTTP-only sites
- Provide clear error messages explaining why iframe cannot load
- Reduce timeout from 10s to 8s for faster fallback

## Future Demos

All new demos created after deploying these changes will:
1. Automatically use the correct production URL
2. Handle HTTP/HTTPS mixed content gracefully
3. Show appropriate fallbacks when iframe cannot be loaded



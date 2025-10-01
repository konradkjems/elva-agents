# Fix Existing Demo URLs - Quick Guide

## Problem
The "View" button on existing demos opens `http://localhost:3000/demo/...` instead of your production URL because the URLs are stored in the database.

## Solution: Update All Demo URLs

### Option 1: Browser Console (Easiest - Recommended)

1. **Go to your production admin panel** (e.g., `https://elva-agents.vercel.app/admin`)

2. **Open browser console** (Press F12, then click "Console" tab)

3. **Run this command:**
```javascript
fetch('/api/admin/update-demo-urls', { 
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(res => res.json())
.then(data => {
  console.log('✅ SUCCESS!', data);
  alert(`Updated ${data.totalUpdated} demo URLs!`);
  // Reload the page to see changes
  window.location.reload();
})
.catch(err => console.error('❌ ERROR:', err));
```

4. **Wait for the success message**

5. **Page will automatically reload** - Your demos will now use production URLs!

### Option 2: Using cURL

```bash
curl -X POST https://your-production-domain.com/api/admin/update-demo-urls \
  -H "Content-Type: application/json"
```

Replace `your-production-domain.com` with:
- `elva-agents.vercel.app` or
- Your custom domain

### Option 3: Using Node Script

If you have access to the server/local environment with the database:

```bash
NEXT_PUBLIC_APP_URL=https://elva-agents.vercel.app node scripts/fix-demo-urls.js
```

## Verify the Fix

1. Go to `/admin/demo-widgets`
2. Click "View" on any demo
3. The URL should now be `https://your-production-domain.com/demo/...`

## What Gets Updated

The script updates:
- ✅ All demo widgets in the `widgets` collection
- ✅ All demos in the `demos` collection
- ✅ Changes `localhost:3000` to your production domain
- ✅ Updates the `demoUrl` field
- ✅ Sets `updatedAt` timestamp

## Expected Output

```json
{
  "message": "Successfully updated X demo URLs",
  "baseUrl": "https://elva-agents.vercel.app",
  "widgetsUpdated": 0,
  "demosUpdated": 3,
  "totalUpdated": 3
}
```

## Future Demos

All NEW demos created after deploying the fixes will automatically use the correct production URL - no manual update needed!

## Troubleshooting

### Still seeing localhost?
- Make sure you're on the production site (not localhost)
- Clear browser cache and reload
- Check the console for any errors

### "Method not allowed" error?
- Make sure you're using POST method
- Check that the endpoint is `/api/admin/update-demo-urls`

### "Unauthorized" error?
- Make sure you're logged in to the admin panel
- Your session might have expired - try logging in again

## One-Time Fix

This is a **one-time fix** for existing demos. After running this:
- ✅ Existing demos will use production URLs
- ✅ New demos will automatically use correct URLs
- ✅ No need to run this again (unless you create demos on localhost and deploy them)


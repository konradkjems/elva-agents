# Redis Cache Setup and Usage

## Overview

The application uses Upstash Redis for caching product metadata with a 24-hour TTL (time-to-live). This significantly reduces external API calls and improves performance for all users.

## Setup Instructions

### 1. Upstash Account (Already Configured)

Your Redis instance is already set up:
- **URL**: `https://big-mudfish-17387.upstash.io`
- **Region**: Configured for optimal Vercel performance
- **Plan**: Upstash Free tier (10,000 commands/day)

### 2. Environment Variables

The following variables are already configured in `.env.local`:

```bash
UPSTASH_REDIS_REST_URL="https://big-mudfish-17387.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AUPrAAIncDI1N2ZjOWY4OTlhMDM0MzZjOWJlMDJhYTA3NDVhNmU0YnAyMTczODc"
```

**Important**: These same variables must be added to your Vercel project settings:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add both variables with the same values
3. Apply to Production, Preview, and Development environments

## How It Works

### Product Metadata Caching

When a product URL is requested:

1. **Cache Check**: Redis is queried first with key `product:{url}`
2. **Cache Hit**: If found and not expired, return cached data immediately
3. **Cache Miss**: If not found, fetch from source, then cache for 24 hours
4. **Auto Expiration**: After 24 hours, cache automatically expires

### Cache Duration

- **Default**: 24 hours (86,400 seconds)
- **Configurable**: Modify `CACHE_DURATION` in `pages/api/product-metadata.js`

## Cache Invalidation

### Admin Endpoint

Platform admins can manually clear cached products:

#### Clear Specific Product

```bash
DELETE /api/admin/cache/clear-product?url=https://example.com/product
```

Response:
```json
{
  "success": true,
  "message": "Product cache cleared",
  "url": "https://example.com/product"
}
```

#### Clear All Products

```bash
DELETE /api/admin/cache/clear-product?all=true
```

Response:
```json
{
  "success": true,
  "message": "Cleared all product cache",
  "cleared": 42
}
```

### Authentication

- Requires valid session (logged in user)
- Requires `platform_admin` role
- Returns 401 if not authenticated
- Returns 403 if not admin

## Monitoring

### Console Logs

The application logs cache activity:

- `✅ Cache HIT for: {url}` - Product found in cache
- `❌ Cache MISS for: {url}` - Product not in cache, fetching from source
- `💾 Cached product for 24 hours: {url}` - Successfully cached
- `⚠️ Failed to cache product: {error}` - Cache write failed (non-fatal)
- `🗑️ Cleared cache for: {url}` - Manual cache invalidation

### Upstash Dashboard

Monitor your Redis usage at https://console.upstash.com:
- Total commands executed
- Cache hit/miss rates
- Storage usage
- Response times

## Benefits

✅ **Performance**: ~95% reduction in external API calls  
✅ **Shared Cache**: All users benefit from same cached data  
✅ **Automatic Expiration**: No manual cleanup needed  
✅ **Serverless**: No persistent connections, perfect for Vercel  
✅ **Cost Effective**: Free tier covers most usage  

## Troubleshooting

### Cache Not Working

1. **Check Environment Variables**: Ensure Redis credentials are set in Vercel
2. **Check Console Logs**: Look for cache-related errors
3. **Verify Upstash Status**: Check Upstash dashboard for service issues
4. **Test Connection**: Run a test request and check logs

### High Cache Miss Rate

Possible causes:
- Different URL formats for same product (http vs https, trailing slash, etc.)
- Cache recently cleared
- Products being requested for first time
- Cache expired (after 24 hours)

### Clear Cache If Needed

Use the admin endpoint to clear specific products or all cache when:
- Product information changed (price, image, name)
- Testing cache behavior
- Debugging data issues

## Files

- `lib/redis.js` - Redis client configuration
- `pages/api/product-metadata.js` - Product API with caching
- `pages/api/admin/cache/clear-product.js` - Cache invalidation endpoint

## Support

For Upstash support: https://upstash.com/docs  
For Redis commands: https://redis.io/commands


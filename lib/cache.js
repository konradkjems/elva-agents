/**
 * Simple in-memory cache with TTL (Time To Live)
 * Used for server-side caching of analytics data
 */

const cache = new Map();

/**
 * Get cached value by key
 * @param {string} key - Cache key
 * @returns {any|null} - Cached value or null if expired/missing
 */
export function getCache(key) {
  const item = cache.get(key);
  if (!item) {
    return null;
  }

  // Check if expired
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }

  return item.value;
}

/**
 * Set cache value with TTL
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttlSeconds - Time to live in seconds (default: 30)
 */
export function setCache(key, value, ttlSeconds = 30) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + (ttlSeconds * 1000)
  });
}

/**
 * Generate cache key from parameters
 * @param {string} prefix - Cache key prefix
 * @param {object} params - Parameters to include in key
 * @returns {string} - Generated cache key
 */
export function generateCacheKey(prefix, params) {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  return `${prefix}|${sortedParams}`;
}

/**
 * Clear cache entries matching a prefix
 * @param {string} prefix - Cache key prefix to clear
 */
export function clearCache(prefix) {
  const keysToDelete = [];
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => cache.delete(key));
}

/**
 * Clear all cache
 */
export function clearAllCache() {
  cache.clear();
}

/**
 * Get cache statistics (for debugging)
 */
export function getCacheStats() {
  const now = Date.now();
  let valid = 0;
  let expired = 0;
  
  for (const item of cache.values()) {
    if (now > item.expiresAt) {
      expired++;
    } else {
      valid++;
    }
  }
  
  return {
    total: cache.size,
    valid,
    expired
  };
}


// Script to clear all product cache from Redis
// Run with: node scripts/clear-redis-cache.js

import { Redis } from '@upstash/redis';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Redis with environment variables
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function clearCache() {
  try {
    console.log('🔍 Looking for product cache entries...');
    
    // Get all keys matching the pattern
    const keys = await redis.keys('product:*');
    
    if (keys.length === 0) {
      console.log('✅ No cached products found');
      process.exit(0);
    }
    
    console.log(`📦 Found ${keys.length} cached products`);
    
    // Delete all matching keys
    const result = await redis.del(...keys);
    
    console.log(`🗑️  Cleared ${result} product cache entries`);
    console.log('✅ Cache cleared successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    process.exit(1);
  }
}

clearCache();


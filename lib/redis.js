import { Redis } from '@upstash/redis';

// Initialize Redis client with Upstash credentials
// Using REST API for serverless compatibility (no persistent connections)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default redis;


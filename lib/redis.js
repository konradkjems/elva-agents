import { Redis } from '@upstash/redis';

// Validate required environment variables
if (!process.env.UPSTASH_REDIS_REST_URL) {
  throw new Error(
    'UPSTASH_REDIS_REST_URL environment variable is not set. ' +
    'Please configure this variable in your environment or .env file.'
  );
}

if (!process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error(
    'UPSTASH_REDIS_REST_TOKEN environment variable is not set. ' +
    'Please configure this variable in your environment or .env file.'
  );
}

// Initialize Redis client with Upstash credentials
// Using REST API for serverless compatibility (no persistent connections)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default redis;

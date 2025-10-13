import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter
 * For standard API endpoints
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window per IP
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Use X-Forwarded-For for IP behind proxy (Vercel)
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  }
});

/**
 * Stricter rate limit for auth endpoints
 * Protect against brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 login attempts per window
  message: 'Too many login attempts, please try again in 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  }
});

/**
 * Rate limit for widget API (more lenient for user-facing)
 * Prevents abuse while allowing normal conversation flow
 */
export const widgetLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 messages per minute
  message: 'Too many messages, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by userId if available, otherwise IP
    return req.body?.userId || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  }
});

/**
 * Helper function to run Express middleware in Next.js
 * 
 * @param {Object} req - Next.js request object
 * @param {Object} res - Next.js response object
 * @param {Function} fn - Express middleware function
 * @returns {Promise} Resolves when middleware completes
 */
export function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}


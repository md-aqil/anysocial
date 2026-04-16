import { Request, Response, NextFunction } from 'express';
import { redis } from '../db/redis.js';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const defaultConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: process.env.NODE_ENV === 'development' ? 1000 : 100
};

const oauthConfig: RateLimitConfig = {
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: process.env.NODE_ENV === 'development' ? 100 : 20
};

export function createRateLimiter(config: RateLimitConfig = defaultConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `rate_limit:${ip}`;

    try {
      const now = Date.now();
      const windowStart = now - config.windowMs;

      // Remove old entries
      await redis.zremrangebyscore(key, 0, windowStart);

      // Count requests in current window
      const requestCount = await redis.zcard(key);

      if (requestCount >= config.maxRequests) {
        const retryAfterSeconds = Math.ceil(config.windowMs / 1000);
        res.setHeader('Retry-After', retryAfterSeconds);
        res.status(429).json({
          error: process.env.NODE_ENV === 'development' 
            ? `Too many requests. Rate limit: ${config.maxRequests} requests per ${config.windowMs / 1000 / 60} minutes. Please wait ${retryAfterSeconds} seconds.`
            : 'Too many requests',
          retryAfter: retryAfterSeconds
        });
        return;
      }

      // Add current request
      await redis.zadd(key, now, `${now}-${Math.random()}`);
      await redis.expire(key, Math.ceil(config.windowMs / 1000));

      next();
    } catch (error) {
      // If Redis fails, allow request (fail open)
      next();
    }
  };
}

export const rateLimiter = createRateLimiter();
export const oauthRateLimiter = createRateLimiter(oauthConfig);

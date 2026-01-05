import rateLimit from 'express-rate-limit';
import { redisClient } from '../utils/redis.client';
import { config } from '../config';
import logger from '../utils/logger';

/**
 * Redis store adapter for express-rate-limit
 * Uses Redis for distributed rate limiting across multiple server instances
 */
class RedisStore implements rateLimit.Store {
  private prefix: string;
  private windowMs: number;

  constructor(prefix: string = 'rate_limit:', windowMs?: number) {
    this.prefix = prefix;
    this.windowMs = windowMs ?? config.rateLimit.global.windowMs;
  }

  init(options: rateLimit.Options): void {
    this.windowMs = options.windowMs;
  }

  async increment(key: string): Promise<rateLimit.ClientRateLimitInfo> {
    try {
      const redisKey = `${this.prefix}${key}`;
      const current = await redisClient.incr(redisKey);
      
      // Set expiration on first increment
      if (current === 1) {
        await redisClient.expire(redisKey, Math.ceil(this.windowMs / 1000));
      }

      const ttl = await redisClient.ttl(redisKey);
      const resetTime = ttl > 0 
        ? new Date(Date.now() + (ttl * 1000))
        : new Date(Date.now() + this.windowMs);

      return {
        totalHits: current,
        resetTime,
      };
    } catch (error) {
      logger.error('Redis rate limit store error', { error, key });
      // Fallback: allow request on Redis error (fail open)
      return {
        totalHits: 1,
        resetTime: new Date(Date.now() + this.windowMs),
      };
    }
  }

  async decrement(key: string): Promise<void> {
    try {
      const redisKey = `${this.prefix}${key}`;
      await redisClient.decr(redisKey);
    } catch (error) {
      logger.debug('Redis rate limit decrement error', { error, key });
    }
  }

  async resetKey(key: string): Promise<void> {
    try {
      const redisKey = `${this.prefix}${key}`;
      await redisClient.del(redisKey);
    } catch (error) {
      logger.debug('Redis rate limit reset error', { error, key });
    }
  }

  async shutdown(): Promise<void> {
    // Redis client is managed separately
  }
}

/**
 * Get client identifier for rate limiting
 * Uses IP address as fallback, or user ID if authenticated
 */
function getClientIdentifier(req: any): string {
  // Prefer user ID if authenticated (more accurate for logged-in users)
  if (req.userId) {
    return `user:${req.userId}`;
  }
  
  // Fallback to IP address
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded 
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim())
    : req.ip 
    ?? req.connection?.remoteAddress 
    ?? 'unknown';
  
  return `ip:${ip}`;
}

/**
 * Global rate limiter - applies to all routes
 * Uses Redis for distributed rate limiting
 */
export const globalRateLimiter = rateLimit({
  windowMs: config.rateLimit.global.windowMs,
  max: config.rateLimit.global.maxRequests,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  store: new RedisStore('rate_limit:global:', config.rateLimit.global.windowMs),
  keyGenerator: getClientIdentifier,
  skip: (req) => {
    // Skip rate limiting for health check endpoint
    return req.path === '/health';
  },
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      path: req.path,
      method: req.method,
      identifier: getClientIdentifier(req),
    });
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later.',
      retryAfter: Math.ceil(config.rateLimit.global.windowMs / 1000),
    });
  },
});

/**
 * Auth rate limiter - stricter limits for authentication endpoints
 * Prevents brute force attacks on login/signup
 */
export const authRateLimiter = rateLimit({
  windowMs: config.rateLimit.auth.windowMs,
  max: config.rateLimit.auth.maxRequests,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore('rate_limit:auth:', config.rateLimit.auth.windowMs),
  keyGenerator: getClientIdentifier,
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      path: req.path,
      method: req.method,
      identifier: getClientIdentifier(req),
    });
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: Math.ceil(config.rateLimit.auth.windowMs / 1000),
    });
  },
  skipSuccessfulRequests: false, // Count all requests, including successful ones
});


import type { Request, Response, NextFunction, RequestHandler } from "express";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function getClientIdentifier(req: Request): string {
  const userId = (req as any).user?.claims?.sub;
  if (userId) return `user:${userId}`;
  
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" 
    ? forwarded.split(",")[0].trim() 
    : req.ip || req.socket.remoteAddress || "unknown";
  return `ip:${ip}`;
}

export function createRateLimiter(config: RateLimitConfig): RequestHandler {
  const { windowMs, maxRequests, message = "Too many requests, please try again later" } = config;

  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = getClientIdentifier(req);
    const now = Date.now();
    
    let entry = rateLimitStore.get(clientId);
    
    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime: now + windowMs };
      rateLimitStore.set(clientId, entry);
    }
    
    entry.count++;
    
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetSeconds = Math.ceil((entry.resetTime - now) / 1000);
    
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", resetSeconds);
    
    if (entry.count > maxRequests) {
      res.setHeader("Retry-After", resetSeconds);
      return res.status(429).json({ 
        error: message,
        retryAfter: resetSeconds
      });
    }
    
    next();
  };
}

export const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  message: "API rate limit exceeded. Please wait before making more requests."
});

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: "Too many login attempts. Please try again in 15 minutes."
});

export const strictLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: "Rate limit exceeded for this action."
});

setInterval(() => {
  const now = Date.now();
  const keys = Array.from(rateLimitStore.keys());
  for (const key of keys) {
    const entry = rateLimitStore.get(key);
    if (entry && now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000);

import type { MiddlewareHandler } from 'hono';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Simple in-memory sliding window rate limiter per IP.
 * Configurable via RATE_LIMIT_MAX and RATE_LIMIT_WINDOW_MS env vars.
 */
export function rateLimit(): MiddlewareHandler {
  const store = new Map<string, RateLimitEntry>();
  const max = parseInt(process.env.RATE_LIMIT_MAX || '60', 10);
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);

  // Periodic cleanup to prevent unbounded memory growth
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, windowMs * 2).unref();

  return async (c, next) => {
    // Health endpoint is exempt
    if (c.req.path === '/api/health') return next();

    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
      || c.req.header('x-real-ip')
      || 'unknown';

    const now = Date.now();
    let entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(ip, entry);
    }

    entry.count++;

    c.header('X-RateLimit-Limit', String(max));
    c.header('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    c.header('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      return c.json({ error: 'Too many requests' }, 429);
    }

    return next();
  };
}

import type { MiddlewareHandler } from 'hono';
import { timingSafeEqual as cryptoTimingSafeEqual } from 'node:crypto';

/** Constant-time string comparison to prevent timing attacks */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return cryptoTimingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Bearer token auth middleware.
 * When BACKEND_AUTH_TOKEN is set, all requests must include
 * `Authorization: Bearer <token>`. Health endpoint is exempt.
 */
export function bearerAuth(): MiddlewareHandler {
  return async (c, next) => {
    const token = process.env.BACKEND_AUTH_TOKEN;
    // If no token configured, only allow bypass in development
    if (!token) {
      if (process.env.NODE_ENV === 'development' || process.env.BACKEND_AUTH_DISABLED === 'true') {
        return next();
      }
      return c.json({ error: 'Server misconfiguration: BACKEND_AUTH_TOKEN is not set' }, 500);
    }

    // Health endpoint is always public
    if (c.req.path === '/api/health') return next();

    const header = c.req.header('Authorization');
    if (!header || !header.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid Authorization header' }, 401);
    }

    const provided = header.slice(7);
    if (!timingSafeEqual(provided, token)) {
      return c.json({ error: 'Invalid token' }, 403);
    }

    return next();
  };
}

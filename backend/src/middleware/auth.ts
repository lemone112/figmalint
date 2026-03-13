import type { MiddlewareHandler } from 'hono';

/**
 * Bearer token auth middleware.
 * When BACKEND_AUTH_TOKEN is set, all requests must include
 * `Authorization: Bearer <token>`. Health endpoint is exempt.
 */
export function bearerAuth(): MiddlewareHandler {
  return async (c, next) => {
    const token = process.env.BACKEND_AUTH_TOKEN;
    // If no token configured, auth is disabled (development mode)
    if (!token) return next();

    // Health endpoint is always public
    if (c.req.path === '/api/health') return next();

    const header = c.req.header('Authorization');
    if (!header || !header.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid Authorization header' }, 401);
    }

    const provided = header.slice(7);
    if (provided !== token) {
      return c.json({ error: 'Invalid token' }, 403);
    }

    return next();
  };
}

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { bodyLimit } from 'hono/body-limit';
import { serve } from '@hono/node-server';
import { bearerAuth } from './middleware/auth.js';
import { rateLimit, aiRateLimit } from './middleware/rate-limit.js';
import health from './routes/health.js';
import analyze from './routes/analyze.js';
import chat from './routes/chat.js';
import stream from './routes/stream.js';
import session from './routes/session.js';
import flow from './routes/flow.js';
import cognitiveWalkthrough from './routes/cognitive-walkthrough.js';
import pureScoring from './routes/pure-scoring.js';
import brandConsistency from './routes/brand-consistency.js';
import copyTone from './routes/copy-tone.js';
import personaResearch from './routes/persona-research.js';
import responsive from './routes/responsive.js';
import a11ySpec from './routes/a11y-spec.js';
import darkMode from './routes/dark-mode.js';
import pageSweep from './routes/page-sweep.js';
import { cleanupExpiredSessions } from './db/queries.js';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

// Ensure data directory exists for SQLite
const dbPath = process.env.DATABASE_PATH || './data/sessions.db';
const dbDir = dirname(dbPath);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// Validate required env vars at startup
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('[WARN] ANTHROPIC_API_KEY is not set. AI-powered analysis will be unavailable (lint-only mode).');
}

const app = new Hono();

// Middleware
app.use('*', logger());

// CORS must come before auth so preflight OPTIONS requests are handled
app.use(
  '*',
  cors({
    // Figma plugin iframes send origin: null; also allow the plugin's backend domain
    origin: (origin) => {
      // Figma plugin iframes send null origin — allow it
      if (!origin || origin === 'null') return 'null';
      const allowed = ['https://api.figmalint.labpics.com', 'http://localhost:3000'];
      // Return the origin if allowed; empty string tells Hono to omit the header
      return allowed.includes(origin) ? origin : '';
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body size limit — base64 screenshots can be large but must be capped to prevent OOM
app.use('/api/*', bodyLimit({ maxSize: 25 * 1024 * 1024 }));

// Rate limiting — sliding window per IP (before auth so unauthenticated requests are rate-limited)
app.use('/api/*', rateLimit());

// Bearer auth — when BACKEND_AUTH_TOKEN is set, require it on all /api/* except /api/health
app.use('/api/*', bearerAuth());

// Stricter rate limiting for AI-heavy routes
app.use('/api/analyze', aiRateLimit());
app.use('/api/analyze-flow', aiRateLimit());
app.use('/api/analyze-page', aiRateLimit());
app.use('/api/brand-consistency', aiRateLimit());
app.use('/api/copy-tone', aiRateLimit());
app.use('/api/persona-research', aiRateLimit());
app.use('/api/generate-a11y-spec', aiRateLimit());
app.use('/api/validate-dark-mode', aiRateLimit());
app.use('/api/cognitive-walkthrough', aiRateLimit());

// Routes
app.route('/api', health);
app.route('/api', analyze);
app.route('/api', chat);
app.route('/api', stream);
app.route('/api', session);
app.route('/api', flow);
app.route('/api', cognitiveWalkthrough);
app.route('/api', pureScoring);
app.route('/api', brandConsistency);
app.route('/api', copyTone);
app.route('/api', personaResearch);
app.route('/api', responsive);
app.route('/api', a11ySpec);
app.route('/api', darkMode);
app.route('/api', pageSweep);

// Root
app.get('/', (c) => c.json({ name: 'FigmaLint Design Review API', version: '1.0.0' }));

const port = parseInt(process.env.PORT || '3000', 10);

// Clean up expired sessions on startup, then periodically every 6 hours
try {
  const deleted = cleanupExpiredSessions();
  if (deleted > 0) console.log(`Cleaned up ${deleted} expired sessions.`);
} catch { /* DB may not be initialized yet */ }
setInterval(() => {
  try {
    const deleted = cleanupExpiredSessions();
    if (deleted > 0) console.log(`Cleaned up ${deleted} expired sessions.`);
  } catch { /* ignore */ }
}, 6 * 60 * 60 * 1000).unref();

console.log(`Starting FigmaLint backend on port ${port}...`);
serve({ fetch: app.fetch, port });
console.log(`Server running at http://localhost:${port}`);

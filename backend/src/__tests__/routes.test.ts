import { describe, it, expect, beforeAll } from 'vitest';
import { Hono } from 'hono';
import healthRoute from '../routes/health.js';
import analyzeRoute from '../routes/analyze.js';

/**
 * Route-level tests using Hono's built-in app.request() test helper.
 *
 * These tests exercise request validation and error handling only.
 * They do NOT call the real Anthropic API — they only verify that
 * the routes reject malformed requests before reaching the analysis service.
 */

// Build a minimal app with only the routes under test (no auth/rate-limit middleware)
function createTestApp() {
  const app = new Hono();
  app.route('/api', healthRoute);
  app.route('/api', analyzeRoute);
  return app;
}

describe('GET /api/health', () => {
  const app = createTestApp();

  it('returns 200 with status ok', async () => {
    const res = await app.request('/api/health');

    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body.status).toBe('ok');
    expect(body.version).toBe('1.0.0');
  });

  it('returns a valid ISO timestamp', async () => {
    const res = await app.request('/api/health');
    const body = (await res.json()) as Record<string, unknown>;

    expect(body.timestamp).toBeDefined();
    // Verify it parses as a valid date
    const date = new Date(body.timestamp as string);
    expect(date.getTime()).not.toBeNaN();
  });
});

describe('POST /api/analyze — validation', () => {
  const app = createTestApp();

  it('returns 400 when body is not valid JSON', async () => {
    const res = await app.request('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toContain('Invalid JSON');
  });

  it('returns 400 when screenshot is missing', async () => {
    const res = await app.request('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lintResult: { summary: { totalErrors: 0, byType: {}, totalNodes: 1, nodesWithErrors: 0 }, errors: [] },
        extractedData: { componentName: 'Button' },
        mode: 'quick',
      }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toContain('screenshot');
  });

  it('returns 400 when screenshot is not a string', async () => {
    const res = await app.request('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        screenshot: 123,
        lintResult: { summary: { totalErrors: 0, byType: {}, totalNodes: 1, nodesWithErrors: 0 }, errors: [] },
        extractedData: { componentName: 'Button' },
        mode: 'quick',
      }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toContain('screenshot');
  });

  it('returns 400 when lintResult is missing', async () => {
    const res = await app.request('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        screenshot: 'base64data',
        extractedData: { componentName: 'Button' },
        mode: 'quick',
      }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toContain('lintResult');
  });

  it('returns 400 when extractedData is missing', async () => {
    const res = await app.request('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        screenshot: 'base64data',
        lintResult: { summary: { totalErrors: 0, byType: {}, totalNodes: 1, nodesWithErrors: 0 }, errors: [] },
        mode: 'quick',
      }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toContain('extractedData');
  });

  it('returns 400 when extractedData.componentName is missing', async () => {
    const res = await app.request('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        screenshot: 'base64data',
        lintResult: { summary: { totalErrors: 0, byType: {}, totalNodes: 1, nodesWithErrors: 0 }, errors: [] },
        extractedData: {},
        mode: 'quick',
      }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toContain('componentName');
  });
});

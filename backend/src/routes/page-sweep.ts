import { Hono } from 'hono';
import { analyzePageSweep, type PageSweepRequest } from '../services/page-sweep-analyzer.js';

const app = new Hono();

app.post('/analyze-page', async (c) => {
  try {
    let body: PageSweepRequest;
    try {
      body = await c.req.json<PageSweepRequest>();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    if (!body.frames || !Array.isArray(body.frames) || body.frames.length === 0) {
      return c.json({ error: 'Missing frames array' }, 400);
    }

    const result = await analyzePageSweep(body);
    return c.json({ success: true, ...result });
  } catch (error) {
    console.error('Page sweep error:', error instanceof Error ? error.message : 'Unknown');
    return c.json({ error: 'Page sweep analysis failed. Please try again.' }, 500);
  }
});

export default app;

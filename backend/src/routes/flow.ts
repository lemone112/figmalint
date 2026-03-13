import { Hono } from 'hono';
import { analyzeFlow, type FlowAnalyzeRequest } from '../services/flow-analyzer.js';

const app = new Hono();

app.post('/analyze-flow', async (c) => {
  try {
    let body: FlowAnalyzeRequest;
    try {
      body = await c.req.json<FlowAnalyzeRequest>();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    if (!body.frames || !Array.isArray(body.frames) || body.frames.length === 0) {
      return c.json({ error: 'Missing frames array' }, 400);
    }
    if (!body.screenshots || Object.keys(body.screenshots).length === 0) {
      return c.json({ error: 'Missing screenshots' }, 400);
    }

    const result = await analyzeFlow(body);
    return c.json({ success: true, flowAnalysis: result });
  } catch (error) {
    console.error('Flow analysis error:', error);
    return c.json({ error: 'Flow analysis failed. Please try again.' }, 500);
  }
});

export default app;

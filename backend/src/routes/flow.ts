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
    if (body.frames.length > 50) {
      return c.json({ error: 'Too many frames (max 50)' }, 400);
    }
    for (const frame of body.frames) {
      if (!frame || typeof frame !== 'object' || !frame.id || !frame.name || typeof frame.width !== 'number' || typeof frame.height !== 'number') {
        return c.json({ error: 'Each frame must have id, name, width, and height' }, 400);
      }
    }
    if (!body.screenshots || typeof body.screenshots !== 'object' || Object.keys(body.screenshots).length === 0) {
      return c.json({ error: 'Missing screenshots' }, 400);
    }
    if (body.edges && Array.isArray(body.edges)) {
      for (const edge of body.edges) {
        if (!edge || typeof edge !== 'object' || !edge.sourceFrameId || !edge.destinationFrameId) {
          return c.json({ error: 'Each edge must have sourceFrameId and destinationFrameId' }, 400);
        }
      }
    }

    const result = await analyzeFlow(body);
    if (!result) {
      return c.json({ success: false, error: 'Flow analysis unavailable' }, 503);
    }
    return c.json({ success: true, flowAnalysis: result });
  } catch (error) {
    console.error('Flow analysis error:', error instanceof Error ? error.message : 'Unknown');
    return c.json({ error: 'Flow analysis failed. Please try again.' }, 500);
  }
});

export default app;

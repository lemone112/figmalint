import { Hono } from 'hono';
import { runPureScoring, type PureRequest } from '../services/pure-scoring.js';

const app = new Hono();

app.post('/pure-scoring', async (c) => {
  try {
    let body: PureRequest;
    try {
      body = await c.req.json<PureRequest>();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    if (!body || typeof body !== 'object') {
      return c.json({ error: 'Request body must be a JSON object' }, 400);
    }

    // Validate screenshot
    if (!body.screenshot || typeof body.screenshot !== 'string') {
      return c.json(
        { error: 'screenshot is required and must be a string' },
        400,
      );
    }

    // Validate taskDescription
    if (!body.taskDescription || typeof body.taskDescription !== 'string') {
      return c.json(
        { error: 'taskDescription is required and must be a string' },
        400,
      );
    }

    // Validate optional fields
    if (body.lintContext !== undefined && typeof body.lintContext !== 'string') {
      return c.json(
        { error: 'lintContext must be a string if provided' },
        400,
      );
    }

    if (
      body.extractedData !== undefined &&
      body.extractedData !== null &&
      typeof body.extractedData !== 'object'
    ) {
      return c.json(
        { error: 'extractedData must be an object if provided' },
        400,
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return c.json(
        { error: 'AI analysis unavailable — ANTHROPIC_API_KEY not configured' },
        503,
      );
    }

    const result = await runPureScoring(body);
    return c.json({ success: true, pureScoring: result });
  } catch (error) {
    console.error(
      'PURE scoring error:',
      error instanceof Error ? error.message : 'Unknown',
    );
    return c.json(
      { error: 'PURE scoring failed. Please try again.' },
      500,
    );
  }
});

export default app;

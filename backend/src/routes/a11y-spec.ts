import { Hono } from 'hono';
import {
  generateA11ySpec,
  type A11ySpecRequest,
} from '../services/a11y-spec-generator.js';

const app = new Hono();

app.post('/generate-a11y-spec', async (c) => {
  try {
    let body: A11ySpecRequest;
    try {
      body = await c.req.json<A11ySpecRequest>();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    if (!body || typeof body !== 'object') {
      return c.json({ error: 'Request body must be a JSON object' }, 400);
    }

    // Validate screenshot
    if (!body.screenshot || typeof body.screenshot !== 'string') {
      return c.json(
        { error: 'screenshot is required and must be a base64 string' },
        400,
      );
    }

    // Validate extractedData
    if (!body.extractedData || typeof body.extractedData !== 'object') {
      return c.json(
        { error: 'extractedData is required and must be an object' },
        400,
      );
    }

    if (
      !body.extractedData.componentName ||
      typeof body.extractedData.componentName !== 'string'
    ) {
      return c.json(
        { error: 'extractedData.componentName is required' },
        400,
      );
    }

    // Validate lintResult
    if (!body.lintResult || typeof body.lintResult !== 'object') {
      return c.json(
        { error: 'lintResult is required and must be an object' },
        400,
      );
    }

    if (!body.lintResult.summary || typeof body.lintResult.summary !== 'object') {
      return c.json(
        { error: 'lintResult.summary is required' },
        400,
      );
    }

    if (!Array.isArray(body.lintResult.errors)) {
      return c.json(
        { error: 'lintResult.errors must be an array' },
        400,
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return c.json(
        { error: 'AI analysis unavailable — ANTHROPIC_API_KEY not configured' },
        503,
      );
    }

    const sessionId = body.sessionId || 'anonymous';
    const spec = await generateA11ySpec(
      body.screenshot,
      body.extractedData,
      body.lintResult,
      sessionId,
    );

    return c.json({ success: true, spec });
  } catch (error) {
    console.error(
      'A11y spec generation error:',
      error instanceof Error ? error.message : 'Unknown',
    );
    return c.json(
      { error: 'Accessibility spec generation failed. Please try again.' },
      500,
    );
  }
});

export default app;

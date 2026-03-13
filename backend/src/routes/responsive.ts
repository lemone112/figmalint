import { Hono } from 'hono';
import { validateResponsiveDesign, type ResponsiveValidationRequest } from '../services/responsive-validator.js';

const app = new Hono();

app.post('/validate-responsive', async (c) => {
  try {
    let body: ResponsiveValidationRequest;
    try {
      body = await c.req.json<ResponsiveValidationRequest>();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    if (!body || typeof body !== 'object') {
      return c.json({ error: 'Request body must be a JSON object' }, 400);
    }

    // Validate variants
    if (!Array.isArray(body.variants) || body.variants.length === 0) {
      return c.json(
        { error: 'variants is required and must be a non-empty array' },
        400,
      );
    }

    if (body.variants.length > 6) {
      return c.json(
        { error: 'Maximum 6 breakpoint variants per request' },
        400,
      );
    }

    for (let i = 0; i < body.variants.length; i++) {
      const variant = body.variants[i];
      if (!variant.name || typeof variant.name !== 'string') {
        return c.json({ error: `variants[${i}].name is required` }, 400);
      }
      if (!variant.screenshot || typeof variant.screenshot !== 'string') {
        return c.json({ error: `variants[${i}].screenshot is required` }, 400);
      }
    }

    // Validate lintSummary (optional)
    if (body.lintSummary !== undefined && typeof body.lintSummary !== 'string') {
      return c.json({ error: 'lintSummary must be a string if provided' }, 400);
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return c.json(
        { error: 'AI analysis unavailable — ANTHROPIC_API_KEY not configured' },
        503,
      );
    }

    const result = await validateResponsiveDesign(body);
    return c.json({ success: true, responsive: result });
  } catch (error) {
    console.error(
      'Responsive validation error:',
      error instanceof Error ? error.message : 'Unknown',
    );
    return c.json(
      { error: 'Responsive validation failed. Please try again.' },
      500,
    );
  }
});

export default app;

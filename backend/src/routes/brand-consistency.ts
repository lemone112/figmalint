import { Hono } from 'hono';
import {
  analyzeBrandConsistency,
  type BrandConsistencyResult,
} from '../services/brand-consistency.js';
import type { BrandGuide } from '../prompts/brand-consistency.js';

interface BrandConsistencyRequestBody {
  screenshot: string;
  brandGuide: BrandGuide;
  lintResult?: unknown;
  sessionId?: string;
}

const app = new Hono();

app.post('/brand-consistency', async (c) => {
  try {
    let body: BrandConsistencyRequestBody;
    try {
      body = await c.req.json<BrandConsistencyRequestBody>();
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

    // Validate brandGuide
    if (!body.brandGuide || typeof body.brandGuide !== 'object') {
      return c.json(
        { error: 'brandGuide is required and must be an object' },
        400,
      );
    }

    const bg = body.brandGuide;

    // Validate brandGuide.colors
    if (!bg.colors || typeof bg.colors !== 'object') {
      return c.json(
        { error: 'brandGuide.colors is required and must be an object' },
        400,
      );
    }

    // Validate brandGuide.typography
    if (!bg.typography || typeof bg.typography !== 'object') {
      return c.json(
        { error: 'brandGuide.typography is required and must be an object' },
        400,
      );
    }
    if (
      !bg.typography.heading ||
      typeof bg.typography.heading.family !== 'string' ||
      !Array.isArray(bg.typography.heading.weights)
    ) {
      return c.json(
        {
          error:
            'brandGuide.typography.heading must have family (string) and weights (number[])',
        },
        400,
      );
    }
    if (
      !bg.typography.body ||
      typeof bg.typography.body.family !== 'string' ||
      !Array.isArray(bg.typography.body.weights)
    ) {
      return c.json(
        {
          error:
            'brandGuide.typography.body must have family (string) and weights (number[])',
        },
        400,
      );
    }

    // Validate brandGuide.spacing
    if (
      !bg.spacing ||
      typeof bg.spacing.base !== 'number' ||
      !Array.isArray(bg.spacing.scale)
    ) {
      return c.json(
        {
          error:
            'brandGuide.spacing must have base (number) and scale (number[])',
        },
        400,
      );
    }

    // Normalize brandGuide.personality — default to generic traits if omitted/invalid/empty
    const normalizedPersonality = Array.isArray(bg.personality)
      ? bg.personality.filter(
          (trait): trait is string =>
            typeof trait === 'string' && trait.trim().length > 0,
        )
      : [];
    bg.personality =
      normalizedPersonality.length > 0
        ? normalizedPersonality
        : ['professional', 'clear', 'consistent'];

    if (!process.env.ANTHROPIC_API_KEY) {
      return c.json(
        {
          error:
            'AI analysis unavailable — ANTHROPIC_API_KEY not configured',
        },
        503,
      );
    }

    const result: BrandConsistencyResult = await analyzeBrandConsistency(
      body.screenshot,
      body.brandGuide,
      body.lintResult ?? null,
      body.sessionId ?? '',
    );

    return c.json({ success: true, brandConsistency: result });
  } catch (error) {
    console.error(
      'Brand consistency error:',
      error instanceof Error ? error.message : 'Unknown',
    );
    return c.json(
      { error: 'Brand consistency analysis failed. Please try again.' },
      500,
    );
  }
});

export default app;

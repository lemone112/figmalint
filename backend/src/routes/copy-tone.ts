import { Hono } from 'hono';
import { analyzeCopyTone } from '../services/copy-tone.js';

interface CopyToneRequestBody {
  screens: Array<{ name: string; textContent: string[] }>;
  personality?: string[];
  sessionId?: string;
}

const app = new Hono();

app.post('/copy-tone', async (c) => {
  try {
    let body: CopyToneRequestBody;
    try {
      body = await c.req.json<CopyToneRequestBody>();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    if (!body || typeof body !== 'object') {
      return c.json({ error: 'Request body must be a JSON object' }, 400);
    }

    // Validate screens
    if (!Array.isArray(body.screens) || body.screens.length === 0) {
      return c.json(
        { error: 'screens is required and must be a non-empty array' },
        400,
      );
    }

    if (body.screens.length > 20) {
      return c.json(
        { error: 'Maximum 20 screens per request' },
        400,
      );
    }

    for (let i = 0; i < body.screens.length; i++) {
      const screen = body.screens[i];
      if (!screen.name || typeof screen.name !== 'string') {
        return c.json(
          { error: `screens[${i}].name is required and must be a string` },
          400,
        );
      }
      if (
        !Array.isArray(screen.textContent) ||
        screen.textContent.length === 0
      ) {
        return c.json(
          {
            error: `screens[${i}].textContent is required and must be a non-empty array of strings`,
          },
          400,
        );
      }
      for (let j = 0; j < screen.textContent.length; j++) {
        if (typeof screen.textContent[j] !== 'string') {
          return c.json(
            {
              error: `screens[${i}].textContent[${j}] must be a string`,
            },
            400,
          );
        }
      }
    }

    // Validate personality (optional)
    if (body.personality !== undefined && body.personality !== null) {
      if (!Array.isArray(body.personality)) {
        return c.json(
          { error: 'personality must be an array of strings if provided' },
          400,
        );
      }
      for (let i = 0; i < body.personality.length; i++) {
        if (typeof body.personality[i] !== 'string') {
          return c.json(
            { error: `personality[${i}] must be a string` },
            400,
          );
        }
      }
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return c.json(
        {
          error:
            'AI analysis unavailable — ANTHROPIC_API_KEY not configured',
        },
        503,
      );
    }

    const result = await analyzeCopyTone(
      body.screens,
      body.personality,
      body.sessionId,
    );

    return c.json({ success: true, copyTone: result });
  } catch (error) {
    console.error(
      'Copy tone error:',
      error instanceof Error ? error.message : 'Unknown',
    );
    return c.json(
      { error: 'Copy tone analysis failed. Please try again.' },
      500,
    );
  }
});

export default app;

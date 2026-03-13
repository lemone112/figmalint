import { Hono } from 'hono';
import { runPersonaResearch } from '../services/persona-research.js';

interface PersonaResearchRequestBody {
  screenshot: string;
  taskDescription: string;
  lintContext?: string;
  sessionId?: string;
}

const app = new Hono();

app.post('/persona-research', async (c) => {
  try {
    let body: PersonaResearchRequestBody;
    try {
      body = await c.req.json<PersonaResearchRequestBody>();
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

    // Validate taskDescription
    if (!body.taskDescription || typeof body.taskDescription !== 'string') {
      return c.json(
        { error: 'taskDescription is required and must be a string' },
        400,
      );
    }

    // Validate lintContext (optional)
    if (
      body.lintContext !== undefined &&
      body.lintContext !== null &&
      typeof body.lintContext !== 'string'
    ) {
      return c.json(
        { error: 'lintContext must be a string if provided' },
        400,
      );
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

    const result = await runPersonaResearch(
      body.screenshot,
      body.taskDescription,
      body.lintContext,
      body.sessionId,
    );

    return c.json({ success: true, personaResearch: result });
  } catch (error) {
    console.error(
      'Persona research error:',
      error instanceof Error ? error.message : 'Unknown',
    );
    return c.json(
      { error: 'Persona research failed. Please try again.' },
      500,
    );
  }
});

export default app;

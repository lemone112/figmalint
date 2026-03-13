import { Hono } from 'hono';
import {
  runCognitiveWalkthrough,
  type CognitiveWalkthroughRequest,
} from '../services/cognitive-walkthrough.js';

const app = new Hono();

app.post('/cognitive-walkthrough', async (c) => {
  try {
    let body: CognitiveWalkthroughRequest;
    try {
      body = await c.req.json<CognitiveWalkthroughRequest>();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    if (!body || typeof body !== 'object') {
      return c.json({ error: 'Request body must be a JSON object' }, 400);
    }

    // Validate taskDescription
    if (!body.taskDescription || typeof body.taskDescription !== 'string') {
      return c.json(
        { error: 'taskDescription is required and must be a string' },
        400,
      );
    }

    // Validate frames
    if (!Array.isArray(body.frames) || body.frames.length === 0) {
      return c.json(
        { error: 'frames is required and must be a non-empty array' },
        400,
      );
    }

    if (body.frames.length > 10) {
      return c.json(
        { error: 'Maximum 10 frames per request' },
        400,
      );
    }

    for (let i = 0; i < body.frames.length; i++) {
      const frame = body.frames[i];
      if (!frame.id || typeof frame.id !== 'string') {
        return c.json({ error: `frames[${i}].id is required` }, 400);
      }
      if (!frame.name || typeof frame.name !== 'string') {
        return c.json({ error: `frames[${i}].name is required` }, 400);
      }
      if (!frame.screenshot || typeof frame.screenshot !== 'string') {
        return c.json({ error: `frames[${i}].screenshot is required` }, 400);
      }
    }

    // Validate edges
    if (!Array.isArray(body.edges)) {
      return c.json({ error: 'edges must be an array' }, 400);
    }

    for (let i = 0; i < body.edges.length; i++) {
      const edge = body.edges[i];
      if (!edge.sourceFrameId || typeof edge.sourceFrameId !== 'string') {
        return c.json(
          { error: `edges[${i}].sourceFrameId is required` },
          400,
        );
      }
      if (
        !edge.destinationFrameId ||
        typeof edge.destinationFrameId !== 'string'
      ) {
        return c.json(
          { error: `edges[${i}].destinationFrameId is required` },
          400,
        );
      }
      if (!edge.trigger || typeof edge.trigger !== 'string') {
        return c.json({ error: `edges[${i}].trigger is required` }, 400);
      }
    }

    // Validate interactiveElements (optional but must be correct shape if present)
    if (
      body.interactiveElements !== undefined &&
      body.interactiveElements !== null &&
      typeof body.interactiveElements !== 'object'
    ) {
      return c.json(
        { error: 'interactiveElements must be an object if provided' },
        400,
      );
    }

    // Default interactiveElements to empty object if not provided
    if (!body.interactiveElements) {
      body.interactiveElements = {};
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return c.json(
        { error: 'AI analysis unavailable — ANTHROPIC_API_KEY not configured' },
        503,
      );
    }

    const result = await runCognitiveWalkthrough(body);
    return c.json({ success: true, walkthrough: result });
  } catch (error) {
    console.error(
      'Cognitive walkthrough error:',
      error instanceof Error ? error.message : 'Unknown',
    );
    return c.json(
      { error: 'Cognitive walkthrough failed. Please try again.' },
      500,
    );
  }
});

export default app;

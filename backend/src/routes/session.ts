import { Hono } from 'hono';
import { loadSession } from '../services/session.js';

const app = new Hono();

/**
 * GET /api/session/:id — retrieve full session data.
 */
app.get('/session/:id', (c) => {
  const id = c.req.param('id');
  const session = loadSession(id);
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  let lintResult = null;
  let aiReview = null;
  let referoData = null;
  let conversationLength = 0;

  try { lintResult = session.lint_result ? JSON.parse(session.lint_result) : null; } catch { /* corrupted */ }
  try { aiReview = session.ai_review ? JSON.parse(session.ai_review) : null; } catch { /* corrupted */ }
  try { referoData = session.refero_data ? JSON.parse(session.refero_data) : null; } catch { /* corrupted */ }
  try {
    const parsed = JSON.parse(session.conversation || '[]');
    conversationLength = Array.isArray(parsed) ? parsed.length : 0;
  } catch { /* corrupted */ }

  return c.json({
    id: session.id,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    nodeId: session.node_id,
    nodeName: session.node_name,
    pageType: session.page_type,
    scoreInitial: session.score_initial,
    scoreCurrent: session.score_current,
    lintResult,
    aiReview,
    referoData,
    issuesFound: session.issues_found,
    issuesFixed: session.issues_fixed,
    issuesSkipped: session.issues_skipped,
    conversationLength,
  });
});

/**
 * GET /api/session/:id/refero — check if async Refero data is ready.
 * Used by frontend to poll for quick-mode background Refero results.
 */
app.get('/session/:id/refero', (c) => {
  const id = c.req.param('id');
  const session = loadSession(id);
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  if (!session.refero_data) {
    return c.json({ ready: false });
  }

  let referoResult = null;
  try { referoResult = JSON.parse(session.refero_data); } catch { /* corrupted */ }

  return c.json({
    ready: !!referoResult,
    data: referoResult,
  });
});

export default app;

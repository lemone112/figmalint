import { Hono } from 'hono';
import { getAnthropicClient, MODEL } from '../services/claude.js';
import { DARK_MODE_SYSTEM_PROMPT, buildDarkModePrompt } from '../prompts/dark-mode.js';

interface ModeComparisonData {
  collection: string;
  modes: Array<{
    modeId: string;
    modeName: string;
    screenshot?: string;
  }>;
  variableDiffs: Array<{
    variableName: string;
    type: string;
    values: Record<string, unknown>;
  }>;
  missingValues: Array<{
    variableName: string;
    missingModes: string[];
  }>;
}

interface DarkModeIssue {
  id: string;
  type: string;
  severity: string;
  nodeId: string;
  nodeName: string;
  message: string;
  currentValue?: string;
  suggestions?: string[];
  autoFixable: boolean;
}

interface DarkModeResult {
  issues: DarkModeIssue[];
  metrics: {
    pureBlackBackgrounds: number;
    pureWhiteText: number;
    lowContrastOnDark: number;
    missingModeValues: number;
  };
  summary: { totalChecked: number; passed: number; failed: number };
}

interface DarkModeRequest {
  lightScreenshot: string;
  darkScreenshot: string;
  modeData: ModeComparisonData;
  deterministicIssues?: DarkModeResult;
  sessionId?: string;
}

interface AiComparisonResult {
  overallRating: 'pass' | 'needs_improvement' | 'fail';
  visibilityIssues: Array<{ element: string; description: string }>;
  semanticColorIssues: Array<{ element: string; lightValue: string; darkValue: string; issue: string }>;
  elevationIssues: string[];
  imageAdaptation: 'good' | 'needs_attention' | 'missing';
  recommendations: Array<{ title: string; description: string; severity: string }>;
  summary: string;
}

const app = new Hono();

app.post('/validate-dark-mode', async (c) => {
  try {
    let body: DarkModeRequest;
    try {
      body = await c.req.json<DarkModeRequest>();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    if (!body || typeof body !== 'object') {
      return c.json({ error: 'Request body must be a JSON object' }, 400);
    }
    if (!body.lightScreenshot || typeof body.lightScreenshot !== 'string') {
      return c.json({ error: 'lightScreenshot is required and must be a base64 string' }, 400);
    }
    if (!body.darkScreenshot || typeof body.darkScreenshot !== 'string') {
      return c.json({ error: 'darkScreenshot is required and must be a base64 string' }, 400);
    }
    if (!body.modeData || typeof body.modeData !== 'object') {
      return c.json({ error: 'modeData is required' }, 400);
    }
    const md = body.modeData;
    if (!md.collection || typeof md.collection !== 'string') {
      return c.json({ error: 'modeData.collection is required and must be a string' }, 400);
    }
    if (!Array.isArray(md.modes) || md.modes.length === 0) {
      return c.json({ error: 'modeData.modes must be a non-empty array' }, 400);
    }
    if (!Array.isArray(md.variableDiffs)) {
      return c.json({ error: 'modeData.variableDiffs must be an array' }, 400);
    }
    if (!Array.isArray(md.missingValues)) {
      return c.json({ error: 'modeData.missingValues must be an array' }, 400);
    }

    // Build deterministic summary for prompt context
    const deterministicSummary = body.deterministicIssues
      ? buildDeterministicSummary(body.deterministicIssues)
      : '';

    // Call Claude with both screenshots for side-by-side comparison
    const anthropic = getAnthropicClient();
    const prompt = buildDarkModePrompt(deterministicSummary);

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 3000,
      system: DARK_MODE_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/png', data: body.lightScreenshot },
            },
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/png', data: body.darkScreenshot },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    });

    if (!response.content.length || response.content[0].type !== 'text') {
      return c.json({ error: 'Empty response from AI' }, 500);
    }

    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return c.json({ error: 'No JSON in AI response' }, 500);
    }

    const parsed = JSON.parse(jsonMatch[0]) as AiComparisonResult;

    // Normalize the AI response
    const comparison: AiComparisonResult = {
      overallRating: normalizeRating(parsed.overallRating),
      visibilityIssues: Array.isArray(parsed.visibilityIssues) ? parsed.visibilityIssues : [],
      semanticColorIssues: Array.isArray(parsed.semanticColorIssues) ? parsed.semanticColorIssues : [],
      elevationIssues: Array.isArray(parsed.elevationIssues) ? parsed.elevationIssues : [],
      imageAdaptation: normalizeAdaptation(parsed.imageAdaptation),
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    };

    return c.json({
      comparison,
      deterministicIssues: body.deterministicIssues || null,
    });
  } catch (error) {
    console.error('Dark mode validation error:', error);
    return c.json({ error: 'Dark mode validation failed. Please try again.' }, 500);
  }
});

export default app;

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

const VALID_RATINGS = new Set(['pass', 'needs_improvement', 'fail']);
function normalizeRating(value: unknown): 'pass' | 'needs_improvement' | 'fail' {
  return typeof value === 'string' && VALID_RATINGS.has(value)
    ? value as 'pass' | 'needs_improvement' | 'fail'
    : 'fail';
}

const VALID_ADAPTATIONS = new Set(['good', 'needs_attention', 'missing']);
function normalizeAdaptation(value: unknown): 'good' | 'needs_attention' | 'missing' {
  return typeof value === 'string' && VALID_ADAPTATIONS.has(value)
    ? value as 'good' | 'needs_attention' | 'missing'
    : 'missing';
}

function buildDeterministicSummary(result: DarkModeResult): string {
  const m = result.metrics;
  const lines: string[] = [];

  if (m.pureBlackBackgrounds > 0) {
    lines.push(`- ${m.pureBlackBackgrounds} pure black (#000000) background variable(s)`);
  }
  if (m.pureWhiteText > 0) {
    lines.push(`- ${m.pureWhiteText} pure white (#FFFFFF) text variable(s)`);
  }
  if (m.lowContrastOnDark > 0) {
    lines.push(`- ${m.lowContrastOnDark} variable(s) with identical light/dark values`);
  }
  if (m.missingModeValues > 0) {
    lines.push(`- ${m.missingModeValues} variable(s) missing dark mode values`);
  }

  if (lines.length === 0) {
    return 'Deterministic checks found no issues.';
  }
  return `Deterministic analysis found ${result.issues.length} issue(s):\n${lines.join('\n')}`;
}

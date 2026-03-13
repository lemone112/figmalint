import {
  buildBrandConsistencyPrompt,
  type BrandGuide,
} from '../prompts/brand-consistency.js';
import { getAnthropicClient, MODEL } from './claude.js';

// ── Types ──────────────────────────────────────

export interface BrandConsistencyResult {
  overallScore: number; // 0-100
  colorCompliance: {
    score: number;
    violations: Array<{
      element: string;
      found: string;
      expected: string;
      tolerance: number;
    }>;
  };
  typographyCompliance: {
    score: number;
    violations: Array<{
      element: string;
      found: string;
      expected: string;
    }>;
  };
  spacingCompliance: {
    score: number;
    offGridValues: number[];
  };
  personalityMatch: {
    rating: 'strong' | 'moderate' | 'weak';
    evidence: string[];
  };
  recommendations: Array<{
    title: string;
    description: string;
    severity: string;
  }>;
  summary: string;
}

// ── Validation helpers ──────────────────────────

const VALID_PERSONALITY_RATINGS = new Set(['strong', 'moderate', 'weak']);
const VALID_SEVERITIES = new Set(['error', 'warning', 'info']);

function normalizeColorViolation(
  raw: unknown,
): BrandConsistencyResult['colorCompliance']['violations'][number] {
  const obj = raw as Record<string, unknown> | undefined;
  return {
    element: typeof obj?.element === 'string' ? obj.element : '',
    found: typeof obj?.found === 'string' ? obj.found : '',
    expected: typeof obj?.expected === 'string' ? obj.expected : '',
    tolerance: typeof obj?.tolerance === 'number' ? obj.tolerance : 0,
  };
}

function normalizeTypoViolation(
  raw: unknown,
): BrandConsistencyResult['typographyCompliance']['violations'][number] {
  const obj = raw as Record<string, unknown> | undefined;
  return {
    element: typeof obj?.element === 'string' ? obj.element : '',
    found: typeof obj?.found === 'string' ? obj.found : '',
    expected: typeof obj?.expected === 'string' ? obj.expected : '',
  };
}

function normalizeRecommendation(
  raw: unknown,
): BrandConsistencyResult['recommendations'][number] {
  const obj = raw as Record<string, unknown> | undefined;
  return {
    title: typeof obj?.title === 'string' ? obj.title : '',
    description: typeof obj?.description === 'string' ? obj.description : '',
    severity: VALID_SEVERITIES.has(obj?.severity as string)
      ? (obj!.severity as string)
      : 'warning',
  };
}

function clampScore(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

// ── Main Analysis ──────────────────────────────

export async function analyzeBrandConsistency(
  screenshot: string,
  brandGuide: BrandGuide,
  lintResult: unknown,
  sessionId: string,
): Promise<BrandConsistencyResult> {
  const client = getAnthropicClient();

  // Build a compact lint context string from the lint result
  let lintContext = 'No lint data provided.';
  if (lintResult && typeof lintResult === 'object') {
    const lr = lintResult as Record<string, unknown>;
    const summary = lr.summary as Record<string, unknown> | undefined;
    if (summary) {
      lintContext = `${summary.totalErrors ?? 0} lint issues across ${summary.totalNodes ?? 0} nodes.`;
    }
  }

  const prompt = buildBrandConsistencyPrompt(brandGuide, lintContext);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system:
      'You are a brand design auditor specializing in visual brand compliance. You evaluate user interfaces against brand guidelines with precision and cite specific visual evidence. You respond in JSON format when asked for structured output.',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: screenshot,
            },
          },
          { type: 'text', text: prompt },
        ],
      },
    ],
  });

  if (!response.content.length || response.content[0].type !== 'text') {
    throw new Error('Empty response from brand consistency analysis');
  }

  const text = response.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON in brand consistency response');
  }

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

  // Normalize the response
  const rawColor = parsed.colorCompliance as Record<string, unknown> | undefined;
  const rawTypo = parsed.typographyCompliance as Record<string, unknown> | undefined;
  const rawSpacing = parsed.spacingCompliance as Record<string, unknown> | undefined;
  const rawPersonality = parsed.personalityMatch as Record<string, unknown> | undefined;

  return {
    overallScore: clampScore(parsed.overallScore),
    colorCompliance: {
      score: clampScore(rawColor?.score),
      violations: Array.isArray(rawColor?.violations)
        ? (rawColor!.violations as unknown[]).map(normalizeColorViolation)
        : [],
    },
    typographyCompliance: {
      score: clampScore(rawTypo?.score),
      violations: Array.isArray(rawTypo?.violations)
        ? (rawTypo!.violations as unknown[]).map(normalizeTypoViolation)
        : [],
    },
    spacingCompliance: {
      score: clampScore(rawSpacing?.score),
      offGridValues: Array.isArray(rawSpacing?.offGridValues)
        ? (rawSpacing!.offGridValues as unknown[]).filter(
            (v): v is number => typeof v === 'number',
          )
        : [],
    },
    personalityMatch: {
      rating: VALID_PERSONALITY_RATINGS.has(rawPersonality?.rating as string)
        ? (rawPersonality!.rating as 'strong' | 'moderate' | 'weak')
        : 'weak',
      evidence: Array.isArray(rawPersonality?.evidence)
        ? (rawPersonality!.evidence as unknown[]).filter(
            (e): e is string => typeof e === 'string',
          )
        : [],
    },
    recommendations: Array.isArray(parsed.recommendations)
      ? (parsed.recommendations as unknown[]).map(normalizeRecommendation)
      : [],
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
  };
}

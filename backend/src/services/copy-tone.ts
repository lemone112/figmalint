import { buildCopyTonePrompt } from '../prompts/copy-tone.js';
import { getAnthropicClient, MODEL } from './claude.js';

// ── Types ──────────────────────────────────────

export interface CopyToneResult {
  overallConsistency: 'consistent' | 'mostly_consistent' | 'inconsistent';
  terminologyIssues: Array<{
    term1: string;
    term2: string;
    screens: string[];
    recommendation: string;
  }>;
  toneIssues: Array<{
    screen: string;
    text: string;
    tone: string;
    expectedTone: string;
  }>;
  ctaPatterns: {
    consistent: boolean;
    patterns: string[];
    violations: Array<{
      screen: string;
      cta: string;
      issue: string;
    }>;
  };
  readabilityIssues: Array<{
    screen: string;
    text: string;
    issue: string;
  }>;
  recommendations: Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  summary: string;
}

// ── Validation helpers ──────────────────────────

const VALID_CONSISTENCY = new Set([
  'consistent',
  'mostly_consistent',
  'inconsistent',
]);
const VALID_PRIORITY = new Set(['high', 'medium', 'low']);

function normalizeTerminologyIssue(
  raw: unknown,
): CopyToneResult['terminologyIssues'][number] {
  const obj = raw as Record<string, unknown> | undefined;
  return {
    term1: typeof obj?.term1 === 'string' ? obj.term1 : '',
    term2: typeof obj?.term2 === 'string' ? obj.term2 : '',
    screens: Array.isArray(obj?.screens)
      ? (obj!.screens as unknown[]).filter(
          (s): s is string => typeof s === 'string',
        )
      : [],
    recommendation:
      typeof obj?.recommendation === 'string' ? obj.recommendation : '',
  };
}

function normalizeToneIssue(
  raw: unknown,
): CopyToneResult['toneIssues'][number] {
  const obj = raw as Record<string, unknown> | undefined;
  return {
    screen: typeof obj?.screen === 'string' ? obj.screen : '',
    text: typeof obj?.text === 'string' ? obj.text : '',
    tone: typeof obj?.tone === 'string' ? obj.tone : '',
    expectedTone: typeof obj?.expectedTone === 'string' ? obj.expectedTone : '',
  };
}

function normalizeCtaViolation(
  raw: unknown,
): CopyToneResult['ctaPatterns']['violations'][number] {
  const obj = raw as Record<string, unknown> | undefined;
  return {
    screen: typeof obj?.screen === 'string' ? obj.screen : '',
    cta: typeof obj?.cta === 'string' ? obj.cta : '',
    issue: typeof obj?.issue === 'string' ? obj.issue : '',
  };
}

function normalizeReadabilityIssue(
  raw: unknown,
): CopyToneResult['readabilityIssues'][number] {
  const obj = raw as Record<string, unknown> | undefined;
  return {
    screen: typeof obj?.screen === 'string' ? obj.screen : '',
    text: typeof obj?.text === 'string' ? obj.text : '',
    issue: typeof obj?.issue === 'string' ? obj.issue : '',
  };
}

function normalizeRecommendation(
  raw: unknown,
): CopyToneResult['recommendations'][number] {
  const obj = raw as Record<string, unknown> | undefined;
  return {
    title: typeof obj?.title === 'string' ? obj.title : '',
    description: typeof obj?.description === 'string' ? obj.description : '',
    priority: VALID_PRIORITY.has(obj?.priority as string)
      ? (obj!.priority as 'high' | 'medium' | 'low')
      : 'medium',
  };
}

// ── Main Analysis ──────────────────────────────

export async function analyzeCopyTone(
  screens: Array<{ name: string; textContent: string[] }>,
  personality?: string[],
  sessionId?: string,
): Promise<CopyToneResult> {
  const client = getAnthropicClient();

  const prompt = buildCopyTonePrompt(screens, personality);

  // Text-only analysis — no screenshot needed, saves tokens
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system:
      'You are a senior UX copywriter and content strategist. You specialize in cross-screen copy consistency, voice and tone auditing, and plain language principles. You respond in JSON format when asked for structured output.',
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  if (!response.content.length || response.content[0].type !== 'text') {
    throw new Error('Empty response from copy tone analysis');
  }

  const text = response.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON in copy tone response');
  }

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

  // Normalize the response
  const rawCta = parsed.ctaPatterns as Record<string, unknown> | undefined;

  return {
    overallConsistency: VALID_CONSISTENCY.has(
      parsed.overallConsistency as string,
    )
      ? (parsed.overallConsistency as CopyToneResult['overallConsistency'])
      : 'inconsistent',
    terminologyIssues: Array.isArray(parsed.terminologyIssues)
      ? (parsed.terminologyIssues as unknown[]).map(normalizeTerminologyIssue)
      : [],
    toneIssues: Array.isArray(parsed.toneIssues)
      ? (parsed.toneIssues as unknown[]).map(normalizeToneIssue)
      : [],
    ctaPatterns: {
      consistent:
        typeof rawCta?.consistent === 'boolean' ? rawCta.consistent : false,
      patterns: Array.isArray(rawCta?.patterns)
        ? (rawCta!.patterns as unknown[]).filter(
            (p): p is string => typeof p === 'string',
          )
        : [],
      violations: Array.isArray(rawCta?.violations)
        ? (rawCta!.violations as unknown[]).map(normalizeCtaViolation)
        : [],
    },
    readabilityIssues: Array.isArray(parsed.readabilityIssues)
      ? (parsed.readabilityIssues as unknown[]).map(normalizeReadabilityIssue)
      : [],
    recommendations: Array.isArray(parsed.recommendations)
      ? (parsed.recommendations as unknown[]).map(normalizeRecommendation)
      : [],
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
  };
}

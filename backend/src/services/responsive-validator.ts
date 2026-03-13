import Anthropic from '@anthropic-ai/sdk';
import { buildResponsiveComparisonPrompt } from '../prompts/responsive.js';
import { getAnthropicClient, MODEL } from './claude.js';

// ── Types ──────────────────────────────────────

export interface ResponsiveValidationRequest {
  variants: Array<{ name: string; screenshot: string }>;
  lintSummary?: string;
}

interface ResponsiveRatingCategory {
  rating: 'pass' | 'needs_improvement' | 'fail';
  issues?: Array<Record<string, string>>;
  missingContent?: Array<{ breakpoint: string; description: string }>;
  evidence: string[];
}

export interface ResponsiveValidationResult {
  contentConsistency: ResponsiveRatingCategory;
  layoutAdaptation: ResponsiveRatingCategory;
  textReadability: ResponsiveRatingCategory;
  touchTargets: ResponsiveRatingCategory;
  spacingConsistency: ResponsiveRatingCategory;
  recommendations: Array<{
    title: string;
    description: string;
    severity: string;
    breakpoints: string[];
  }>;
  summary: string;
}

// ── Validation helpers ──────────────────────────

const VALID_RATINGS = new Set(['pass', 'needs_improvement', 'fail']);

function normalizeRatingCategory(raw: unknown): ResponsiveRatingCategory {
  const obj = raw as Record<string, unknown> | undefined;
  return {
    rating: VALID_RATINGS.has(obj?.rating as string)
      ? (obj!.rating as ResponsiveRatingCategory['rating'])
      : 'fail',
    issues: Array.isArray(obj?.issues) ? (obj.issues as Array<Record<string, string>>) : [],
    missingContent: Array.isArray(obj?.missingContent)
      ? (obj.missingContent as Array<{ breakpoint: string; description: string }>)
      : undefined,
    evidence: Array.isArray(obj?.evidence) ? (obj.evidence as string[]) : [],
  };
}

// ── Main Analysis ──────────────────────────────

export async function validateResponsiveDesign(
  req: ResponsiveValidationRequest,
): Promise<ResponsiveValidationResult> {
  const client = getAnthropicClient();

  const variantLabels = req.variants.map((v) => v.name);
  const lintSummary = req.lintSummary || 'No lint data provided.';
  const prompt = buildResponsiveComparisonPrompt(variantLabels, lintSummary);

  // Build content: label + screenshot per variant, then prompt
  const content: Anthropic.ContentBlockParam[] = [];

  for (let i = 0; i < req.variants.length; i++) {
    const variant = req.variants[i];
    content.push({
      type: 'text',
      text: `--- [Breakpoint ${i + 1}: ${variant.name}] ---`,
    });
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/png',
        data: variant.screenshot,
      },
    });
  }

  content.push({ type: 'text', text: prompt });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system:
      'You are a responsive design expert. You evaluate UI designs across breakpoints for consistency, adaptability, readability, and mobile-friendliness. Respond in JSON format when asked.',
    messages: [{ role: 'user', content }],
  });

  if (!response.content.length || response.content[0].type !== 'text') {
    throw new Error('Empty response from responsive validation');
  }

  const text = response.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON in responsive validation response');
  }

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

  return {
    contentConsistency: normalizeRatingCategory(parsed.contentConsistency),
    layoutAdaptation: normalizeRatingCategory(parsed.layoutAdaptation),
    textReadability: normalizeRatingCategory(parsed.textReadability),
    touchTargets: normalizeRatingCategory(parsed.touchTargets),
    spacingConsistency: normalizeRatingCategory(parsed.spacingConsistency),
    recommendations: Array.isArray(parsed.recommendations)
      ? (parsed.recommendations as ResponsiveValidationResult['recommendations'])
      : [],
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
  };
}

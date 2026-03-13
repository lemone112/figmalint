import { getAnthropicClient, MODEL } from './claude.js';
import { SYSTEM_PROMPT } from '../prompts/system.js';
import { buildAttentionPrompt } from '../prompts/attention.js';
import { buildNielsenHeuristicsPrompt } from '../prompts/nielsen-heuristics.js';

// ── Attention analysis types ─────────────────────────────────────────

export interface AttentionAnalysis {
  focalPoint: {
    element: string;
    strength: 'strong' | 'moderate' | 'weak';
    isIntendedCTA: boolean;
  };
  readingFlow: {
    pattern: 'F' | 'Z' | 'linear' | 'scattered';
    confidence: 'high' | 'medium' | 'low';
    description: string;
  };
  competingElements: Array<{ element: string; reason: string }>;
  deadZones: Array<{ area: string; suggestion: string }>;
  visualWeightBalance:
    | 'balanced'
    | 'left-heavy'
    | 'right-heavy'
    | 'top-heavy'
    | 'bottom-heavy';
  recommendations: Array<{
    title: string;
    description: string;
    severity: 'critical' | 'warning' | 'info';
  }>;
}

// ── Nielsen heuristics types ─────────────────────────────────────────

export interface NielsenHeuristic {
  id: string;
  name: string;
  rating: 'pass' | 'needs_improvement' | 'fail';
  evidence: string[];
  recommendation: string | null;
}

export interface NielsenEvaluation {
  heuristics: NielsenHeuristic[];
  overallCompliance: number;
  criticalViolations: Array<{ heuristic: string; description: string }>;
  summary: string;
}

// ── Combined result ──────────────────────────────────────────────────

export interface ExtendedAnalysisResult {
  attention?: AttentionAnalysis;
  nielsen?: NielsenEvaluation;
}

export interface ExtendedFeatures {
  attention?: boolean;
  nielsen?: boolean;
}

// ── Validation helpers ───────────────────────────────────────────────

const VALID_STRENGTHS = new Set(['strong', 'moderate', 'weak']);
const VALID_PATTERNS = new Set(['F', 'Z', 'linear', 'scattered']);
const VALID_CONFIDENCE = new Set(['high', 'medium', 'low']);
const VALID_BALANCE = new Set([
  'balanced',
  'left-heavy',
  'right-heavy',
  'top-heavy',
  'bottom-heavy',
]);
const VALID_SEVERITY = new Set(['critical', 'warning', 'info']);
const VALID_RATINGS = new Set(['pass', 'needs_improvement', 'fail']);

function normalizeAttention(raw: any): AttentionAnalysis {
  const fp = raw?.focalPoint ?? {};
  const rf = raw?.readingFlow ?? {};

  return {
    focalPoint: {
      element: typeof fp.element === 'string' ? fp.element : 'unknown',
      strength: VALID_STRENGTHS.has(fp.strength) ? fp.strength : 'weak',
      isIntendedCTA: typeof fp.isIntendedCTA === 'boolean' ? fp.isIntendedCTA : false,
    },
    readingFlow: {
      pattern: VALID_PATTERNS.has(rf.pattern) ? rf.pattern : 'scattered',
      confidence: VALID_CONFIDENCE.has(rf.confidence) ? rf.confidence : 'low',
      description: typeof rf.description === 'string' ? rf.description : '',
    },
    competingElements: Array.isArray(raw?.competingElements)
      ? raw.competingElements.map((e: any) => ({
          element: typeof e?.element === 'string' ? e.element : '',
          reason: typeof e?.reason === 'string' ? e.reason : '',
        }))
      : [],
    deadZones: Array.isArray(raw?.deadZones)
      ? raw.deadZones.map((d: any) => ({
          area: typeof d?.area === 'string' ? d.area : '',
          suggestion: typeof d?.suggestion === 'string' ? d.suggestion : '',
        }))
      : [],
    visualWeightBalance: VALID_BALANCE.has(raw?.visualWeightBalance)
      ? raw.visualWeightBalance
      : 'balanced',
    recommendations: Array.isArray(raw?.recommendations)
      ? raw.recommendations
          .filter((r: any) => r?.title && r?.description)
          .map((r: any) => ({
            title: String(r.title),
            description: String(r.description),
            severity: VALID_SEVERITY.has(r.severity) ? r.severity : 'info',
          }))
      : [],
  };
}

function normalizeNielsen(raw: any): NielsenEvaluation {
  const heuristics: NielsenHeuristic[] = Array.isArray(raw?.heuristics)
    ? raw.heuristics.map((h: any) => ({
        id: typeof h?.id === 'string' ? h.id : 'unknown',
        name: typeof h?.name === 'string' ? h.name : 'unknown',
        rating: VALID_RATINGS.has(h?.rating) ? h.rating : 'fail',
        evidence: Array.isArray(h?.evidence) ? h.evidence.map(String) : [],
        recommendation:
          typeof h?.recommendation === 'string' ? h.recommendation : null,
      }))
    : [];

  const compliance =
    typeof raw?.overallCompliance === 'number'
      ? Math.max(0, Math.min(100, Math.round(raw.overallCompliance)))
      : 0;

  return {
    heuristics,
    overallCompliance: compliance,
    criticalViolations: Array.isArray(raw?.criticalViolations)
      ? raw.criticalViolations
          .filter((v: any) => v?.heuristic && v?.description)
          .map((v: any) => ({
            heuristic: String(v.heuristic),
            description: String(v.description),
          }))
      : [],
    summary: typeof raw?.summary === 'string' ? raw.summary : '',
  };
}

// ── Core API call ────────────────────────────────────────────────────

async function callClaude(
  screenshotBase64: string,
  prompt: string,
): Promise<any> {
  const anthropic = getAnthropicClient();

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: screenshotBase64,
            },
          },
          { type: 'text', text: prompt },
        ],
      },
    ],
  });

  if (!response.content.length || response.content[0].type !== 'text') {
    throw new Error('Empty response from Claude');
  }

  const text = response.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in Claude response');
  }

  return JSON.parse(jsonMatch[0]);
}

// ── Public orchestrator ──────────────────────────────────────────────

/**
 * Run extended analyses (attention prediction, Nielsen heuristics) in parallel.
 * Only runs features that are explicitly enabled.
 */
export async function runExtendedAnalysis(
  screenshot: string,
  lintResult: any,
  extractedData: any,
  sessionId: string,
  features: ExtendedFeatures,
): Promise<ExtendedAnalysisResult> {
  const result: ExtendedAnalysisResult = {};

  // Build shared lint context string
  const bt = lintResult?.summary?.byType || {};
  const lintContext = [
    `Component: ${extractedData?.componentName ?? 'unknown'}`,
    extractedData?.metadata
      ? `Size: ${extractedData.metadata.width}x${extractedData.metadata.height}, Type: ${extractedData.metadata.nodeType}`
      : '',
    `Lint issues: ${lintResult?.summary?.totalErrors ?? 0} total — ${bt.fill ?? 0} fills, ${bt.stroke ?? 0} strokes, ${bt.spacing ?? 0} spacing, ${bt.autoLayout ?? 0} auto-layout`,
  ]
    .filter(Boolean)
    .join('\n');

  // Build task list — only enabled features
  const tasks: Array<Promise<void>> = [];

  if (features.attention) {
    tasks.push(
      (async () => {
        const start = Date.now();
        try {
          const prompt = buildAttentionPrompt(lintContext);
          const raw = await callClaude(screenshot, prompt);
          result.attention = normalizeAttention(raw);
          console.log(
            `[extended-analyzer] attention completed in ${Date.now() - start}ms (session=${sessionId})`,
          );
        } catch (err) {
          console.error(
            `[extended-analyzer] attention failed after ${Date.now() - start}ms (session=${sessionId}):`,
            err instanceof Error ? err.message : err,
          );
        }
      })(),
    );
  }

  if (features.nielsen) {
    tasks.push(
      (async () => {
        const start = Date.now();
        try {
          const prompt = buildNielsenHeuristicsPrompt(lintContext);
          const raw = await callClaude(screenshot, prompt);
          result.nielsen = normalizeNielsen(raw);
          console.log(
            `[extended-analyzer] nielsen completed in ${Date.now() - start}ms (session=${sessionId})`,
          );
        } catch (err) {
          console.error(
            `[extended-analyzer] nielsen failed after ${Date.now() - start}ms (session=${sessionId}):`,
            err instanceof Error ? err.message : err,
          );
        }
      })(),
    );
  }

  if (tasks.length > 0) {
    await Promise.all(tasks);
  }

  return result;
}

import { EVALUATORS, type EvaluatorPrompt } from '../prompts/pure-scoring.js';
import { getAnthropicClient, MODEL } from './claude.js';

// ── Types ──────────────────────────────────────

export interface PureRequest {
  screenshot: string;
  taskDescription: string;
  lintContext?: string;
  extractedData?: Record<string, unknown>;
  sessionId?: string;
}

interface EvaluatorIssue {
  description: string;
  severity: 'critical' | 'warning' | 'info';
}

interface EvaluatorResult {
  role: string;
  rating: 1 | 2 | 3;
  confidence: 'high' | 'medium' | 'low';
  rationale: string;
  strengths: string[];
  issues: EvaluatorIssue[];
}

interface CombinedIssue {
  description: string;
  severity: string;
  flaggedBy: string[];
}

export interface PureResult {
  evaluators: EvaluatorResult[];
  aggregated: {
    averageRating: number;
    pureScore: number;
    consensus: 'unanimous' | 'majority' | 'split';
    combinedIssues: CombinedIssue[];
    summary: string;
  };
}

// ── Validation helpers ──────────────────────────

const VALID_RATINGS = new Set([1, 2, 3]);
const VALID_CONFIDENCE = new Set(['high', 'medium', 'low']);
const VALID_SEVERITY = new Set(['critical', 'warning', 'info']);

function normalizeEvaluatorResult(
  raw: Record<string, unknown>,
  role: string,
): EvaluatorResult {
  const rawRating = typeof raw.rating === 'number' ? raw.rating : 3;
  const rating = VALID_RATINGS.has(rawRating)
    ? (rawRating as 1 | 2 | 3)
    : 3;

  const rawIssues = Array.isArray(raw.issues) ? raw.issues : [];
  const issues: EvaluatorIssue[] = rawIssues
    .filter(
      (issue): issue is Record<string, unknown> =>
        typeof issue === 'object' && issue !== null,
    )
    .map((issue) => ({
      description:
        typeof issue.description === 'string' ? issue.description : '',
      severity: VALID_SEVERITY.has(issue.severity as string)
        ? (issue.severity as EvaluatorIssue['severity'])
        : 'warning',
    }));

  return {
    role,
    rating,
    confidence: VALID_CONFIDENCE.has(raw.confidence as string)
      ? (raw.confidence as EvaluatorResult['confidence'])
      : 'medium',
    rationale: typeof raw.rationale === 'string' ? raw.rationale : '',
    strengths: Array.isArray(raw.strengths)
      ? raw.strengths.filter((s): s is string => typeof s === 'string')
      : [],
    issues,
  };
}

// ── Single Evaluator Call ──────────────────────

async function runSingleEvaluator(
  evaluator: EvaluatorPrompt,
  screenshotBase64: string,
  taskDescription: string,
  lintContext?: string,
  extractedData?: string,
): Promise<EvaluatorResult> {
  const client = getAnthropicClient();

  const userPrompt = evaluator.buildUserPrompt(
    taskDescription,
    lintContext,
    extractedData,
  );

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: evaluator.systemPrompt,
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
          { type: 'text', text: userPrompt },
        ],
      },
    ],
  });

  if (!response.content.length || response.content[0].type !== 'text') {
    throw new Error(`Empty response from ${evaluator.role} evaluator`);
  }

  const text = response.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`No JSON in ${evaluator.role} evaluator response`);
  }

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  return normalizeEvaluatorResult(parsed, evaluator.role);
}

// ── Aggregation ─────────────────────────────────

function computeConsensus(
  ratings: number[],
): 'unanimous' | 'majority' | 'split' {
  const unique = new Set(ratings);
  if (unique.size === 1) return 'unanimous';

  // Check if at least 2 out of 3 agree
  const counts = new Map<number, number>();
  for (const r of ratings) {
    counts.set(r, (counts.get(r) || 0) + 1);
  }
  for (const count of counts.values()) {
    if (count >= 2) return 'majority';
  }
  return 'split';
}

function deduplicateIssues(evaluators: EvaluatorResult[]): CombinedIssue[] {
  const combined: CombinedIssue[] = [];

  for (const evaluator of evaluators) {
    for (const issue of evaluator.issues) {
      // Check if a similar issue already exists (simple substring match)
      const existing = combined.find((c) => {
        const aLower = c.description.toLowerCase();
        const bLower = issue.description.toLowerCase();
        // Consider issues similar if they share significant word overlap
        const aWords = new Set(aLower.split(/\s+/).filter((w) => w.length > 3));
        const bWords = new Set(bLower.split(/\s+/).filter((w) => w.length > 3));
        if (aWords.size === 0 || bWords.size === 0) return false;
        let overlap = 0;
        for (const word of aWords) {
          if (bWords.has(word)) overlap++;
        }
        const overlapRatio = overlap / Math.min(aWords.size, bWords.size);
        return overlapRatio >= 0.5;
      });

      if (existing) {
        if (!existing.flaggedBy.includes(evaluator.role)) {
          existing.flaggedBy.push(evaluator.role);
        }
        // Escalate severity: critical > warning > info
        const severityOrder = { critical: 3, warning: 2, info: 1 };
        const existingSev =
          severityOrder[existing.severity as keyof typeof severityOrder] || 0;
        const newSev =
          severityOrder[issue.severity as keyof typeof severityOrder] || 0;
        if (newSev > existingSev) {
          existing.severity = issue.severity;
        }
      } else {
        combined.push({
          description: issue.description,
          severity: issue.severity,
          flaggedBy: [evaluator.role],
        });
      }
    }
  }

  // Sort: critical first, then by number of evaluators who flagged it
  const severityOrder = { critical: 3, warning: 2, info: 1 };
  combined.sort((a, b) => {
    const sevDiff =
      (severityOrder[b.severity as keyof typeof severityOrder] || 0) -
      (severityOrder[a.severity as keyof typeof severityOrder] || 0);
    if (sevDiff !== 0) return sevDiff;
    return b.flaggedBy.length - a.flaggedBy.length;
  });

  return combined;
}

function buildAggregatedSummary(
  evaluators: EvaluatorResult[],
  avgRating: number,
  consensus: string,
): string {
  const ratingLabels: Record<number, string> = {
    1: 'Easy',
    2: 'Moderate',
    3: 'Difficult',
  };

  const parts: string[] = [];

  // Overall rating description
  if (avgRating <= 1.33) {
    parts.push(
      'The design performs well across all evaluator perspectives.',
    );
  } else if (avgRating <= 2.0) {
    parts.push(
      'The design is usable but has areas of friction identified by evaluators.',
    );
  } else {
    parts.push(
      'The design has significant usability concerns that need attention.',
    );
  }

  // Per-evaluator summary
  for (const ev of evaluators) {
    parts.push(
      `${ev.role}: rated ${ratingLabels[ev.rating] || ev.rating} (${ev.confidence} confidence).`,
    );
  }

  // Consensus note
  if (consensus === 'unanimous') {
    parts.push('All evaluators agree on the difficulty level.');
  } else if (consensus === 'split') {
    parts.push(
      'Evaluators disagree on difficulty, suggesting the design has mixed strengths and weaknesses.',
    );
  }

  return parts.join(' ');
}

// ── Main Orchestrator ──────────────────────────

export async function runPureScoring(
  req: PureRequest,
): Promise<PureResult> {
  const extractedDataStr = req.extractedData
    ? JSON.stringify(req.extractedData, null, 2)
    : undefined;

  // Run all 3 evaluators in parallel
  const results = await Promise.all(
    EVALUATORS.map((evaluator) =>
      runSingleEvaluator(
        evaluator,
        req.screenshot,
        req.taskDescription,
        req.lintContext,
        extractedDataStr,
      ),
    ),
  );

  // Aggregate
  const ratings = results.map((r) => r.rating);
  const avgRating =
    Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) /
    100;

  // Map PURE score: (3 - avgRating) / 2 * 100
  const pureScore = Math.round(((3 - avgRating) / 2) * 100);

  const consensus = computeConsensus(ratings);
  const combinedIssues = deduplicateIssues(results);
  const summary = buildAggregatedSummary(results, avgRating, consensus);

  return {
    evaluators: results,
    aggregated: {
      averageRating: avgRating,
      pureScore,
      consensus,
      combinedIssues,
      summary,
    },
  };
}

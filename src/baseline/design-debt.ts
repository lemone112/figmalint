/// <reference types="@figma/plugin-typings" />

// ──────────────────────────────────────────────
// Design Debt Score Calculator
//
// Computes a composite 0-100 score (100 = no debt)
// from lint results and token analysis.
// ──────────────────────────────────────────────

export interface DesignDebtScore {
  overall: number; // 0-100 (100 = no debt)
  components: {
    orphanedStyles: { count: number; score: number };
    detachedInstances: { count: number; score: number };
    hardcodedValues: { count: number; score: number };
    namingViolations: { count: number; score: number };
    missingAutoLayout: { count: number; score: number };
    inconsistentSpacing: { count: number; score: number };
  };
  trend?: {
    previousScore: number;
    delta: number;
    direction: 'improving' | 'stable' | 'degrading';
  };
}

/** Generic naming patterns that indicate debt (e.g. "Frame 1", "Group 23") */
const GENERIC_NAME_RE = /^(Frame|Group|Rectangle|Ellipse|Vector|Line|Polygon|Star|Component|Instance|Boolean)\s*\d+$/i;

/**
 * Calculate composite Design Debt Score from lint results and optional token summary.
 *
 * Scoring formula:
 * - Start at 100
 * - Subtract: orphanedStyles x 2, detachedInstances x 5, hardcodedValues x 1,
 *   namingViolations x 0.5, missingAutoLayout x 1, inconsistentSpacing x 0.5
 * - Clamp to 0-100
 */
export function calculateDesignDebt(
  lintResult: {
    errors: Array<{
      errorType: string;
      severity?: string;
      nodeId: string;
      nodeName: string;
      message: string;
      value: string;
      path: string;
      property?: string;
    }>;
    summary: {
      totalErrors: number;
      byType: Record<string, number>;
      totalNodes: number;
      nodesWithErrors: number;
    };
  },
  tokenSummary: {
    totalTokens: number;
    actualTokens: number;
    hardCodedValues: number;
    aiSuggestions: number;
  } | null,
): DesignDebtScore {
  const errors = lintResult.errors;

  // Count orphaned styles (fill/stroke/effect/text errors = no style applied)
  const orphanedStyleErrors = errors.filter(
    e => e.errorType === 'fill' || e.errorType === 'stroke' || e.errorType === 'effect' || e.errorType === 'text'
  );
  const orphanedStyles = orphanedStyleErrors.length;

  // Detached instances: not directly available from lint, estimate from
  // nodes that are INSTANCE type but have style errors (a proxy)
  const detachedInstanceErrors = errors.filter(
    e => e.message.toLowerCase().includes('detach')
  );
  const detachedInstances = detachedInstanceErrors.length;

  // Hardcoded values from token summary
  const hardcodedValues = tokenSummary ? tokenSummary.hardCodedValues : 0;

  // Naming violations: nodes with generic names like "Frame 1"
  const namingNodeIds = new Set<string>();
  for (const e of errors) {
    if (GENERIC_NAME_RE.test(e.nodeName)) {
      namingNodeIds.add(e.nodeId);
    }
  }
  // Also check accessibility errors about generic naming
  const namingA11yErrors = errors.filter(
    e => e.errorType === 'accessibility' && GENERIC_NAME_RE.test(e.nodeName)
  );
  for (const e of namingA11yErrors) {
    namingNodeIds.add(e.nodeId);
  }
  const namingViolations = namingNodeIds.size;

  // Missing auto-layout
  const missingAutoLayout = errors.filter(e => e.errorType === 'autoLayout').length;

  // Inconsistent spacing
  const inconsistentSpacing = errors.filter(e => e.errorType === 'spacing').length;

  // Calculate composite score
  let score = 100;
  score -= orphanedStyles * 2;
  score -= detachedInstances * 5;
  score -= hardcodedValues * 1;
  score -= namingViolations * 0.5;
  score -= missingAutoLayout * 1;
  score -= inconsistentSpacing * 0.5;

  // Clamp
  const overall = Math.max(0, Math.min(100, Math.round(score)));

  return {
    overall,
    components: {
      orphanedStyles: {
        count: orphanedStyles,
        score: Math.max(0, Math.round(100 - orphanedStyles * 2)),
      },
      detachedInstances: {
        count: detachedInstances,
        score: Math.max(0, Math.round(100 - detachedInstances * 5)),
      },
      hardcodedValues: {
        count: hardcodedValues,
        score: Math.max(0, Math.round(100 - hardcodedValues * 1)),
      },
      namingViolations: {
        count: namingViolations,
        score: Math.max(0, Math.round(100 - namingViolations * 0.5)),
      },
      missingAutoLayout: {
        count: missingAutoLayout,
        score: Math.max(0, Math.round(100 - missingAutoLayout * 1)),
      },
      inconsistentSpacing: {
        count: inconsistentSpacing,
        score: Math.max(0, Math.round(100 - inconsistentSpacing * 0.5)),
      },
    },
  };
}

/**
 * Compute trend data by comparing current score to a previous score.
 */
export function computeDebtTrend(
  currentScore: number,
  previousScore: number,
): DesignDebtScore['trend'] {
  const delta = currentScore - previousScore;
  let direction: 'improving' | 'stable' | 'degrading';

  if (delta > 2) {
    direction = 'improving';
  } else if (delta < -2) {
    direction = 'degrading';
  } else {
    direction = 'stable';
  }

  return {
    previousScore,
    delta,
    direction,
  };
}

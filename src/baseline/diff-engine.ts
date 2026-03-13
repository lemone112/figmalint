import type { BaselineSnapshot, ErrorDigest, CategoryScoreSnapshot } from './storage';

/** Per-category score delta. */
export interface CategoryDelta {
  category: string;
  oldScore: number;
  newScore: number;
  delta: number;
}

/** A single issue diff entry. */
export interface IssueDiff {
  errorType: string;
  severity: string;
  nodeId: string;
  message: string;
}

/** Full diff result between a baseline and current scan. */
export interface DiffResult {
  baselineTimestamp: number;
  currentTimestamp: number;
  scoreDelta: {
    overall: number;
    oldOverall: number;
    newOverall: number;
    categories: CategoryDelta[];
  };
  newIssues: IssueDiff[];
  fixedIssues: IssueDiff[];
  remainingIssues: IssueDiff[];
  summary: {
    totalNew: number;
    totalFixed: number;
    totalRemaining: number;
    oldTotal: number;
    newTotal: number;
  };
}

/**
 * Create an issue key for matching baseline vs current errors.
 * Uses errorType + nodeId + message as the composite key.
 */
function issueKey(e: ErrorDigest | { errorType: string; nodeId: string; message: string }): string {
  return `${e.errorType}::${e.nodeId}::${e.message}`;
}

/**
 * Compute a diff between a saved baseline and current scan results.
 */
export function computeDiff(
  baseline: BaselineSnapshot,
  current: {
    overall: number;
    grade: string;
    categories: Record<string, CategoryScoreSnapshot>;
    errors: ErrorDigest[];
    summary: { totalErrors: number; totalNodes: number; nodesWithErrors: number; byType: Record<string, number> };
  }
): DiffResult {
  const now = Date.now();

  // ── Score deltas ──
  const categoryNames = new Set([
    ...Object.keys(baseline.categories),
    ...Object.keys(current.categories),
  ]);

  const categories: CategoryDelta[] = [];
  for (const cat of categoryNames) {
    const oldScore = baseline.categories[cat]?.score ?? 100;
    const newScore = current.categories[cat]?.score ?? 100;
    categories.push({
      category: cat,
      oldScore,
      newScore,
      delta: newScore - oldScore,
    });
  }

  // Sort by absolute delta descending (biggest changes first)
  categories.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  // ── Issue matching ──
  const baselineKeys = new Set(baseline.errors.map(issueKey));
  const currentKeys = new Set(current.errors.map(issueKey));

  const newIssues: IssueDiff[] = [];
  const fixedIssues: IssueDiff[] = [];
  const remainingIssues: IssueDiff[] = [];

  // Issues in current but not in baseline → new
  for (const e of current.errors) {
    const key = issueKey(e);
    if (!baselineKeys.has(key)) {
      newIssues.push({ errorType: e.errorType, severity: e.severity, nodeId: e.nodeId, message: e.message });
    } else {
      remainingIssues.push({ errorType: e.errorType, severity: e.severity, nodeId: e.nodeId, message: e.message });
    }
  }

  // Issues in baseline but not in current → fixed
  for (const e of baseline.errors) {
    const key = issueKey(e);
    if (!currentKeys.has(key)) {
      fixedIssues.push({ errorType: e.errorType, severity: e.severity, nodeId: e.nodeId, message: e.message });
    }
  }

  return {
    baselineTimestamp: baseline.timestamp,
    currentTimestamp: now,
    scoreDelta: {
      overall: current.overall - baseline.overall,
      oldOverall: baseline.overall,
      newOverall: current.overall,
      categories,
    },
    newIssues,
    fixedIssues,
    remainingIssues,
    summary: {
      totalNew: newIssues.length,
      totalFixed: fixedIssues.length,
      totalRemaining: remainingIssues.length,
      oldTotal: baseline.errors.length,
      newTotal: current.errors.length,
    },
  };
}

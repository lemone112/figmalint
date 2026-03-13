/**
 * Confidence scoring and filtering for AI-generated findings.
 *
 * Every finding produced by Claude is tagged with a confidence level (0-1).
 * This module provides:
 * - The type definition shared across all analysis pipelines
 * - A filter to drop low-confidence noise before presenting to the user
 * - A prompt modifier that instructs Claude to emit confidence scores
 */

export interface ConfidencedFinding {
  /** Human-readable description of the finding */
  finding: string;
  /** 0.0 to 1.0 — how certain the model is */
  confidence: number;
  /** Specific visual evidence supporting the finding */
  evidence: string;
  /** Category bucket (e.g. "visualHierarchy", "colorHarmony", "spacing") */
  category: string;
  /** Impact severity: "critical" | "warning" | "info" */
  severity: string;
}

/**
 * Filter findings below a confidence threshold.
 * Default threshold is 0.7, meaning only "likely" and "definite" issues are kept.
 */
export function filterByConfidence(
  findings: ConfidencedFinding[],
  threshold = 0.7,
): ConfidencedFinding[] {
  return findings.filter((f) => f.confidence >= threshold);
}

/**
 * Sort findings by confidence descending, then by severity weight descending.
 */
export function sortByConfidence(findings: ConfidencedFinding[]): ConfidencedFinding[] {
  const severityWeight: Record<string, number> = { critical: 3, warning: 2, info: 1 };
  return [...findings].sort((a, b) => {
    const confDiff = b.confidence - a.confidence;
    if (Math.abs(confDiff) > 0.01) return confDiff;
    return (severityWeight[b.severity] ?? 0) - (severityWeight[a.severity] ?? 0);
  });
}

/**
 * Append confidence-scoring instructions to any prompt string.
 * This tells the model to include a numeric confidence field on each finding.
 */
export function withConfidenceScoring(prompt: string): string {
  return (
    prompt +
    `\n\nFor each finding, include a "confidence" field (0.0 to 1.0) indicating how certain you are.
- 0.9-1.0: Definite issue, clearly visible
- 0.7-0.89: Likely issue, some ambiguity
- 0.5-0.69: Possible issue, needs human review
- Below 0.5: Don't report it`
  );
}

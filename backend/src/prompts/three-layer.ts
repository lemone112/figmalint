/**
 * Three-Layer Explanation Builder.
 *
 * For each lint finding, Claude produces three layers:
 *   1. Rule  — the concrete violation ("Spacing 12px is not on the 8px grid")
 *   2. Why   — the design principle behind the rule (Gestalt, WCAG, cognitive load, etc.)
 *   3. Real-world — proof from shipped products (Stripe, Linear, Vercel, etc.)
 *
 * This gives designers not just WHAT to fix, but WHY it matters and
 * WHO already follows the practice.
 */

export interface ThreeLayerExplanation {
  /** The concrete lint violation. */
  rule: string;
  /** Why this rule exists — cite a design principle or guideline. */
  why: string;
  /** Real-world examples of products that follow this practice. */
  realWorld: string;
}

export interface LintError {
  errorType: string;
  message: string;
  value: string;
}

/**
 * Build a prompt that asks Claude to enrich each lint error with three layers
 * of explanation. Accepts the top-N lint errors to avoid prompt bloat.
 */
export function buildThreeLayerPrompt(lintErrors: LintError[]): string {
  if (lintErrors.length === 0) {
    return '';
  }

  const errorList = lintErrors
    .map(
      (e, i) =>
        `${i + 1}. [${e.errorType}] ${e.message} (current value: ${e.value})`,
    )
    .join('\n');

  return `You are a senior design systems engineer. For each lint finding below, produce a three-layer explanation.

## Lint Findings
${errorList}

## Instructions
For EACH finding above, provide exactly three layers:

1. **Rule** — Restate the violation concisely in plain language (e.g., "Spacing of 12px does not align to the 8px spatial grid").
2. **Why** — Explain the underlying design principle. Reference a specific guideline or law:
   - Gestalt principles (proximity, similarity, closure, continuity)
   - WCAG 2.1 guidelines (contrast ratio, touch targets, text sizing)
   - Cognitive load theory (Miller's law, Hick's law)
   - Platform conventions (Material Design 3, Apple HIG)
   - Design token architecture principles
3. **Real-world** — Name 2-3 well-known products that follow this practice and briefly explain how (e.g., "Stripe uses a strict 4px grid. Linear enforces 8px spacing tokens. Vercel's design system prohibits hard-coded spacing values.").

If a finding is trivial or informational (not a real issue), you may combine layers 2 and 3 into a short note.

## Response Format (JSON)
{
  "explanations": [
    {
      "rule": "<plain language restatement>",
      "why": "<design principle + specific guideline reference>",
      "realWorld": "<2-3 product examples following this practice>"
    }
  ]
}

Return one explanation object per lint finding, in the same order as the input list.`;
}

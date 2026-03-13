/**
 * Shared grounding instructions appended to all AI analysis prompts.
 * Ensures every finding is anchored to specific visual evidence,
 * reducing hallucinated or vague observations.
 */
export const GROUNDING_INSTRUCTIONS = `
CRITICAL: For every finding you report, you MUST provide:
1. The specific element or region you're referring to (e.g., "the blue CTA button in the top-right")
2. Why it's an issue (reference a specific principle or guideline)
3. What the fix should be (actionable, not vague)

If you cannot point to a specific element, do NOT report the finding.
If you find no issues in a category, explicitly state "No issues found" — do not invent problems.
`;

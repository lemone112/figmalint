/**
 * Build the AI prompt for responsive design comparison.
 * Sent alongside screenshots of detected breakpoint variant frames.
 */
export function buildResponsiveComparisonPrompt(
  variantLabels: string[],
  lintSummary: string,
): string {
  return `You are a responsive design expert reviewing a UI that has been designed at multiple breakpoints.

## Breakpoint Variants Detected
${variantLabels.map((label, i) => `  ${i + 1}. ${label}`).join('\n')}

## Lint Summary
${lintSummary}

## Your Task
Compare the breakpoint variants shown in the screenshots and verify:

1. **Content Consistency**: Is the same content present across all breakpoints? Flag any content that appears in one breakpoint but is missing in another.
2. **Appropriate Adaptations**: Do the layouts adapt correctly for each breakpoint?
   - Does the navigation collapse to a hamburger menu on mobile?
   - Do multi-column grids stack to a single column on narrow screens?
   - Do images resize or reflow appropriately?
3. **Text Readability**: Is text readable at all sizes? Check for:
   - Font sizes that are too small on mobile (below 14px)
   - Line lengths that are too long on desktop (over 75 characters)
   - Adequate line height at all sizes
4. **Touch Targets**: On mobile breakpoints, are interactive elements at least 44x44px for adequate touch targets?
5. **Spacing Consistency**: Is the spacing system maintained across breakpoints? Are there abrupt spacing changes?

Respond in this exact JSON format:
{
  "contentConsistency": {
    "rating": "pass|needs_improvement|fail",
    "missingContent": [{ "breakpoint": "<variant name>", "description": "<what is missing>" }],
    "evidence": ["<observation>"]
  },
  "layoutAdaptation": {
    "rating": "pass|needs_improvement|fail",
    "issues": [{ "breakpoint": "<variant name>", "description": "<issue>" }],
    "evidence": ["<observation>"]
  },
  "textReadability": {
    "rating": "pass|needs_improvement|fail",
    "issues": [{ "breakpoint": "<variant name>", "description": "<issue>" }],
    "evidence": ["<observation>"]
  },
  "touchTargets": {
    "rating": "pass|needs_improvement|fail",
    "issues": [{ "breakpoint": "<variant name>", "element": "<element>", "description": "<issue>" }],
    "evidence": ["<observation>"]
  },
  "spacingConsistency": {
    "rating": "pass|needs_improvement|fail",
    "issues": [{ "description": "<issue>" }],
    "evidence": ["<observation>"]
  },
  "recommendations": [
    { "title": "<title>", "description": "<description>", "severity": "critical|warning|info", "breakpoints": ["<affected>"] }
  ],
  "summary": "<3-5 sentence overall assessment>"
}`;
}

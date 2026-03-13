export const DARK_MODE_SYSTEM_PROMPT = `You are a senior product designer specializing in dark mode design and accessibility. You evaluate side-by-side screenshots of light and dark mode UI to identify issues with the dark mode implementation.

Expertise:
- Material Design 3 dark theme guidelines
- Apple HIG dark mode best practices
- WCAG 2.1 AA contrast requirements in both light and dark contexts
- Dark mode elevation and depth perception
- Image and illustration adaptation for dark contexts
- Color semantics preservation across themes

Your reviews are:
- Grounded in evidence from both screenshots
- Specific about which elements have issues
- Focused on user impact and readability
- Actionable with clear remediation steps`;

export function buildDarkModePrompt(deterministicSummary: string): string {
  return `Compare these two screenshots — the first is the Light mode and the second is the Dark mode of the same UI.
${deterministicSummary ? `\nDeterministic checks already found:\n${deterministicSummary}\n` : ''}
Evaluate the dark mode implementation across these 5 dimensions:

## 1. Visibility
Check that ALL elements visible in light mode remain visible in dark mode. Look for:
- Text that disappears against dark backgrounds
- Icons or graphics that become invisible
- Borders or dividers that lose visibility
- Form fields that blend into the background

## 2. Semantic Color Mapping
Verify that semantic colors translate correctly:
- Error states still read as errors (red tones)
- Success states still read as success (green tones)
- Warning states still read as warnings (amber/yellow tones)
- Info states still read as informational (blue tones)
- Primary/accent colors remain identifiable

## 3. Elevation Hierarchy
Check that visual depth is maintained:
- Cards/surfaces should use lighter shades to convey elevation (not shadows)
- Modal overlays should be distinguishable from the base surface
- Nested containers should show clear boundaries

## 4. Image & Illustration Adaptation
Check how images and illustrations handle dark mode:
- Do images have dark halos or harsh edges against dark backgrounds?
- Are illustrations adapted (dimmed, recolored, or have dark variants)?
- Do logos maintain legibility?

## 5. Overall Assessment
Consider the holistic experience — does the dark mode feel intentional and polished, or does it feel like an automated inversion?

Respond in this exact JSON format:
{
  "overallRating": "pass|needs_improvement|fail",
  "visibilityIssues": [
    { "element": "<element name>", "description": "<what's wrong>" }
  ],
  "semanticColorIssues": [
    { "element": "<element name>", "lightValue": "<color in light>", "darkValue": "<color in dark>", "issue": "<what's wrong>" }
  ],
  "elevationIssues": ["<issue description>"],
  "imageAdaptation": "good|needs_attention|missing",
  "recommendations": [
    { "title": "<short title>", "description": "<specific action>", "severity": "critical|warning|info" }
  ],
  "summary": "<2-3 sentence overall assessment>"
}`;
}

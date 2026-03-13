/**
 * Build the AI prompt for generating a comprehensive accessibility specification.
 */
export function buildA11ySpecPrompt(
  componentInfo: string,
  lintSummary: string,
): string {
  return `You are a WCAG 2.2 accessibility specialist generating a comprehensive accessibility specification from a UI design.

## Component Information
${componentInfo}

## Lint Summary (deterministic analysis)
${lintSummary}

## Your Task
Analyze the screenshot and generate a complete accessibility specification. This spec will be used by developers to implement proper ARIA attributes, keyboard navigation, focus management, and screen reader support.

For each section, be specific to what you see in the design — don't generate generic boilerplate.

Respond in this exact JSON format:
{
  "landmarks": [
    { "role": "<ARIA landmark role: banner|navigation|main|complementary|contentinfo|search|form|region>", "label": "<accessible name for the landmark>", "element": "<which UI element this maps to>" }
  ],
  "headingStructure": [
    { "level": 1, "text": "<heading text>", "element": "<which UI element>" }
  ],
  "focusOrder": [
    { "order": 1, "element": "<element description>", "type": "<interactive|informational|container>", "notes": "<special focus management notes>" }
  ],
  "ariaAnnotations": [
    {
      "element": "<element description>",
      "role": "<ARIA role if non-default>",
      "ariaLabel": "<aria-label value if needed>",
      "ariaDescribedBy": "<id of describing element if applicable>",
      "ariaLive": "<polite|assertive if applicable>",
      "notes": "<implementation notes>"
    }
  ],
  "keyboardShortcuts": [
    { "key": "<key combination e.g. Enter, Space, Escape, Tab, Arrow keys>", "action": "<what happens>", "element": "<which element>" }
  ],
  "liveRegions": [
    { "element": "<element>", "type": "polite|assertive", "trigger": "<what causes the update>" }
  ],
  "colorContrastReport": [
    { "element": "<element>", "foreground": "<color>", "background": "<color>", "ratio": 4.5, "passes": "AA|AAA|fail" }
  ],
  "recommendations": [
    {
      "title": "<concise title>",
      "description": "<detailed recommendation>",
      "wcagCriterion": "<e.g. 1.4.3 Contrast (Minimum)>",
      "level": "A|AA|AAA"
    }
  ]
}

Important:
- For focusOrder, list ALL interactive elements in the logical tab order you observe
- For ariaAnnotations, include every element that needs non-default ARIA attributes
- For colorContrastReport, estimate contrast ratios from what you see — flag anything that appears to have low contrast
- For recommendations, reference specific WCAG 2.2 success criteria
- Be thorough but avoid false positives — only flag real issues`;
}

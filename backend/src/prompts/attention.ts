/**
 * Visual Attention Prediction prompt.
 * Asks Claude Vision to predict where users will look and how attention flows.
 */
export function buildAttentionPrompt(lintContext: string): string {
  return `Analyze this UI screenshot for visual attention patterns. Use established eye-tracking research (Nielsen Norman Group, Gutenberg diagram) to predict user gaze behavior.

Context from automated lint:
${lintContext}

Evaluate all of the following:

## 1. Focal Point Identification
What element draws the eye first? Consider size, contrast, color saturation, isolation (whitespace), and position. Is this element the intended primary CTA or key content?

## 2. Reading Flow Pattern
Does the layout guide the eye in an F-pattern (typical for content-heavy pages with left-aligned text), Z-pattern (typical for landing pages with hero + CTA), linear (single-column scroll), or scattered (no clear flow)?

## 3. Attention Competition
Identify elements that compete for attention simultaneously. Look for: multiple high-contrast elements at similar visual weight, competing CTAs, clashing colors, or animation-suggesting elements (spinners, progress bars) that would pull focus.

## 4. Attention Dead Zones
Identify areas users are likely to skip. Common dead zones: right sidebar content (banner blindness), below-the-fold content with no scroll affordance, low-contrast text blocks, dense text without headings.

## 5. Visual Weight Distribution
Assess whether the overall visual weight is balanced or skewed. Consider element density, color weight, and whitespace distribution across the four quadrants.

Respond in this exact JSON format:
{
  "focalPoint": {
    "element": "<description of the element that draws attention first>",
    "strength": "strong|moderate|weak",
    "isIntendedCTA": true|false
  },
  "readingFlow": {
    "pattern": "F|Z|linear|scattered",
    "confidence": "high|medium|low",
    "description": "<1-2 sentence explanation of how the eye moves through the design>"
  },
  "competingElements": [
    { "element": "<element description>", "reason": "<why it competes for attention>" }
  ],
  "deadZones": [
    { "area": "<area description>", "suggestion": "<how to draw attention to this area>" }
  ],
  "visualWeightBalance": "balanced|left-heavy|right-heavy|top-heavy|bottom-heavy",
  "recommendations": [
    { "title": "<short title>", "description": "<specific actionable suggestion>", "severity": "critical|warning|info" }
  ]
}`;
}

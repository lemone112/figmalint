import { GROUNDING_INSTRUCTIONS } from './shared/grounding-instructions.js';

/**
 * Attention/visual-hierarchy analysis prompt.
 * Used by the extended analyzer to evaluate where the eye is drawn.
 */
export function buildAttentionPrompt(componentInfo: string): string {
  return `Analyze the visual attention flow in this UI screenshot.

## Context
${componentInfo}

## Evaluation Criteria

### 1. Focal Point Clarity
- Is there one clear primary focal point?
- Does the visual hierarchy guide the eye in a logical sequence (primary -> secondary -> tertiary)?
- Are F-pattern or Z-pattern reading flows supported?

### 2. Visual Weight Distribution
- Is visual weight (size, color, contrast) distributed intentionally?
- Do important elements have the most visual weight?
- Are decorative elements competing with functional ones?

### 3. CTA Prominence
- Is the primary call-to-action the most visually prominent interactive element?
- Is there clear differentiation between primary, secondary, and tertiary actions?
- Can a user identify the next step within 3 seconds?

### 4. Information Density
- Is the content density appropriate for the page type?
- Are there clear content groups separated by whitespace?
- Is progressive disclosure used where appropriate?

## Response Format (JSON)
{
  "focalPoint": {
    "exists": true|false,
    "element": "<description of primary focal point>",
    "strength": "strong|moderate|weak"
  },
  "readingFlow": {
    "pattern": "F-pattern|Z-pattern|scattered|linear",
    "blockers": ["<elements that interrupt natural flow>"]
  },
  "ctaProminence": {
    "rating": "pass|needs_improvement|fail",
    "primaryCta": "<description>",
    "competingElements": ["<element competing for attention>"]
  },
  "findings": [
    {
      "finding": "<specific observation>",
      "confidence": 0.0,
      "evidence": "<element or region reference>",
      "category": "attention",
      "severity": "critical|warning|info"
    }
  ],
  "summary": "<2-3 sentence summary>"
}
${GROUNDING_INSTRUCTIONS}`;
}

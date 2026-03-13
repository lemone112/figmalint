/**
 * Brand Consistency Analysis prompt.
 * Evaluates a design screenshot against a structured brand guide.
 */

import { sanitizeText, sanitizeTextArray } from '../utils/sanitize.js';

export interface BrandGuide {
  colors: Record<string, { hex: string; tolerance: number; usage: string }>;
  typography: {
    heading: { family: string; weights: number[] };
    body: { family: string; weights: number[] };
  };
  spacing: { base: number; scale: number[] };
  personality: string[]; // e.g., ['professional', 'approachable', 'modern']
  rules?: Array<{ id: string; description: string; severity: 'error' | 'warning' }>;
}

export function buildBrandConsistencyPrompt(
  brandGuide: BrandGuide,
  lintContext: string,
): string {
  // Serialize color palette for the prompt
  const colorLines = Object.entries(brandGuide.colors)
    .map(
      ([name, c]) =>
        `  - ${sanitizeText(name)}: ${sanitizeText(c.hex)} (tolerance: +/-${c.tolerance}%, usage: ${sanitizeText(c.usage)})`,
    )
    .join('\n');

  // Serialize typography
  const typoLines = [
    `  Headings: ${sanitizeText(brandGuide.typography.heading.family)} [weights: ${brandGuide.typography.heading.weights.join(', ')}]`,
    `  Body: ${sanitizeText(brandGuide.typography.body.family)} [weights: ${brandGuide.typography.body.weights.join(', ')}]`,
  ].join('\n');

  // Serialize spacing
  const spacingLine = `  Base unit: ${brandGuide.spacing.base}px, scale: [${brandGuide.spacing.scale.join(', ')}]`;

  // Serialize personality
  const personalityLine = sanitizeTextArray(brandGuide.personality).join(', ');

  // Serialize custom rules
  const rulesBlock =
    brandGuide.rules && brandGuide.rules.length > 0
      ? `\n## Custom Brand Rules\n${brandGuide.rules.map((r) => `  - [${sanitizeText(r.severity.toUpperCase())}] ${sanitizeText(r.id)}: ${sanitizeText(r.description)}`).join('\n')}\n`
      : '';

  return `You are a brand design auditor. Evaluate the screenshot against the brand guidelines provided below. Be precise and cite specific visual evidence from the screenshot.

## Brand Color Palette
${colorLines}

## Typography Specifications
${typoLines}

## Spacing System
${spacingLine}

## Brand Personality Keywords
${personalityLine}
${rulesBlock}
## Automated Lint Context
${lintContext}

## Evaluation Criteria

### 1. Color Palette Adherence
Examine every visible color in the UI. Compare each against the brand palette. Flag colors that fall outside the specified tolerance. Note which element uses the off-brand color and what the expected color should be.

### 2. Typography Compliance
Check all visible text for correct font family and weight usage. Headings must use the heading family/weights. Body text must use the body family/weights. Flag any text that appears to use a non-specified font or weight.

### 3. Spacing System Consistency
Check that spacing between elements aligns with the base grid and scale values. Flag values that do not correspond to any value in the spacing scale. Estimate spacing in pixels from the screenshot.

### 4. Brand Personality Match
Assess whether the overall visual impression matches the listed personality keywords. Consider color warmth/coolness, typography tone, whitespace usage, imagery style, and overall aesthetic. Rate the match as "strong", "moderate", or "weak" with specific evidence.

### 5. Visual Language Consistency
Evaluate iconography style (outlined vs filled, rounded vs sharp), illustration style if present, and photography treatment. Flag inconsistencies within the screenshot.

Respond in this exact JSON format:
{
  "overallScore": <0-100>,
  "colorCompliance": {
    "score": <0-100>,
    "violations": [
      {
        "element": "<element description>",
        "found": "<hex or description of found color>",
        "expected": "<expected brand color name and hex>",
        "tolerance": <tolerance percentage that was exceeded>
      }
    ]
  },
  "typographyCompliance": {
    "score": <0-100>,
    "violations": [
      {
        "element": "<element description>",
        "found": "<found font/weight>",
        "expected": "<expected font/weight>"
      }
    ]
  },
  "spacingCompliance": {
    "score": <0-100>,
    "offGridValues": [<pixel values that don't match the spacing scale>]
  },
  "personalityMatch": {
    "rating": "strong|moderate|weak",
    "evidence": ["<specific observation 1>", "<specific observation 2>"]
  },
  "recommendations": [
    {
      "title": "<short title>",
      "description": "<actionable recommendation>",
      "severity": "error|warning|info"
    }
  ],
  "summary": "<3-5 sentence overall brand consistency assessment>"
}`;
}

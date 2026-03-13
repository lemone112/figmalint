/**
 * PURE Multi-Evaluator scoring prompts.
 * Three independent AI "experts" evaluate the same design from different perspectives.
 */

export interface EvaluatorPrompt {
  role: string;
  systemPrompt: string;
  buildUserPrompt: (taskDescription: string, lintContext?: string, extractedData?: string) => string;
}

const SHARED_RESPONSE_FORMAT = `
Rate the design on the PURE usability scale for the given task:
- 1 = Easy (user can complete without difficulty)
- 2 = Moderate (user can complete but with some friction)
- 3 = Difficult (user is likely to fail or abandon)

Respond in this exact JSON format:
{
  "rating": 1|2|3,
  "confidence": "high|medium|low",
  "rationale": "<2-3 sentences explaining your rating>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "issues": [
    { "description": "<specific issue>", "severity": "critical|warning|info" }
  ]
}`;

export const UX_DESIGNER: EvaluatorPrompt = {
  role: 'UX Designer',
  systemPrompt:
    'You are a senior UX designer with 15 years of experience. You evaluate designs for usability, learnability, and user satisfaction. You are particularly sensitive to navigation patterns, information architecture, and interaction design. You respond in JSON format when asked for structured output.',
  buildUserPrompt(taskDescription: string, lintContext?: string, extractedData?: string): string {
    return `Evaluate this UI design from a **UX design** perspective.

## Task to Evaluate
"${taskDescription}"

${lintContext ? `## Lint Context (for reference)\n${lintContext}\n` : ''}
${extractedData ? `## Extracted Design Data\n${extractedData}\n` : ''}

## Evaluation Criteria (UX Designer)
Focus on:
- **Learnability**: Can a first-time user figure out how to complete the task?
- **Navigation clarity**: Is it obvious where to go and what to do next?
- **Information architecture**: Is content organized logically for this task?
- **Interaction patterns**: Are buttons, links, and controls where users expect them?
- **Error prevention**: Does the design help users avoid mistakes?
- **Feedback**: Does the interface communicate state changes clearly?
${SHARED_RESPONSE_FORMAT}`;
  },
};

export const ACCESSIBILITY_SPECIALIST: EvaluatorPrompt = {
  role: 'Accessibility Specialist',
  systemPrompt:
    'You are a WCAG expert and accessibility consultant. You evaluate designs for inclusive design, assistive technology compatibility, cognitive accessibility, and universal usability. You are particularly sensitive to contrast, text size, touch targets, focus management, and color-only information. You respond in JSON format when asked for structured output.',
  buildUserPrompt(taskDescription: string, lintContext?: string, extractedData?: string): string {
    return `Evaluate this UI design from an **accessibility** perspective.

## Task to Evaluate
"${taskDescription}"

${lintContext ? `## Lint Context (for reference)\n${lintContext}\n` : ''}
${extractedData ? `## Extracted Design Data\n${extractedData}\n` : ''}

## Evaluation Criteria (Accessibility Specialist)
Focus on:
- **Visual accessibility**: Sufficient contrast ratios (4.5:1 for text, 3:1 for UI components), readable text sizes (minimum 12px)
- **Motor accessibility**: Touch/click targets at least 44x44px, adequate spacing between interactive elements
- **Cognitive accessibility**: Clear labels, simple language, predictable patterns, not too many choices at once
- **Color independence**: Information is not conveyed by color alone; icons, text, or patterns supplement color
- **Focus and reading order**: Logical tab order implied by visual layout, clear focus indicators
- **Alternative text potential**: Images and icons appear to have meaningful labels; decorative vs informative distinction
${SHARED_RESPONSE_FORMAT}`;
  },
};

export const BUSINESS_ANALYST: EvaluatorPrompt = {
  role: 'Business Analyst',
  systemPrompt:
    'You are a product strategist focused on conversion optimization. You evaluate designs for business goal achievement, conversion funnel efficiency, trust signals, and value proposition clarity. You are particularly sensitive to CTA placement, friction points, and persuasive design patterns. You respond in JSON format when asked for structured output.',
  buildUserPrompt(taskDescription: string, lintContext?: string, extractedData?: string): string {
    return `Evaluate this UI design from a **business/conversion** perspective.

## Task to Evaluate
"${taskDescription}"

${lintContext ? `## Lint Context (for reference)\n${lintContext}\n` : ''}
${extractedData ? `## Extracted Design Data\n${extractedData}\n` : ''}

## Evaluation Criteria (Business Analyst)
Focus on:
- **CTA effectiveness**: Is the primary call-to-action prominent, compelling, and clearly labeled?
- **Friction reduction**: Are there unnecessary steps, fields, or decisions that could cause drop-off?
- **Trust signals**: Does the design convey credibility (security indicators, social proof, professional polish)?
- **Value proposition**: Is it clear what the user gets and why they should complete this task?
- **Urgency and motivation**: Does the design create appropriate motivation without dark patterns?
- **Funnel clarity**: Is there a single clear path to task completion, or are there distracting detours?
${SHARED_RESPONSE_FORMAT}`;
  },
};

/** All three evaluators in order. */
export const EVALUATORS: EvaluatorPrompt[] = [
  UX_DESIGNER,
  ACCESSIBILITY_SPECIALIST,
  BUSINESS_ANALYST,
];

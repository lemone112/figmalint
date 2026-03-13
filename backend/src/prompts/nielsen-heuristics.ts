import { GROUNDING_INSTRUCTIONS } from './shared/grounding-instructions.js';

/**
 * Nielsen's 10 Usability Heuristics evaluation prompt.
 * Used by the extended analyzer for heuristic-based UX review.
 */
export function buildNielsenHeuristicsPrompt(componentInfo: string): string {
  return `Evaluate this UI screenshot against Nielsen's 10 Usability Heuristics.

## Context
${componentInfo}

## Heuristics to Evaluate

### H1: Visibility of System Status
Does the design keep users informed about what is going on through appropriate feedback within reasonable time?
Look for: loading indicators, progress bars, active states, confirmation messages, real-time feedback.

### H2: Match Between System and Real World
Does the design speak the users' language with familiar words, phrases, and concepts?
Look for: jargon-free labels, real-world metaphors, natural information ordering, culturally appropriate icons.

### H3: User Control and Freedom
Can users easily undo, redo, or exit unwanted states?
Look for: back buttons, cancel options, undo capability, clear exit paths, confirmation dialogs for destructive actions.

### H4: Consistency and Standards
Does the design follow platform conventions and internal consistency?
Look for: consistent button styles, uniform terminology, standard icon usage, predictable element placement.

### H5: Error Prevention
Does the design prevent errors before they happen?
Look for: input constraints, confirmation steps for critical actions, smart defaults, disabled states for invalid actions, inline validation.

### H6: Recognition Rather Than Recall
Does the design minimize memory load by making elements, actions, and options visible?
Look for: visible labels (not tooltip-only), breadcrumbs, recently used items, contextual help, visible navigation state.

### H7: Flexibility and Efficiency of Use
Does the design cater to both novice and expert users?
Look for: keyboard shortcuts, customizable interfaces, accelerators, batch operations, power-user features alongside simple flows.

### H8: Aesthetic and Minimalist Design
Does the interface avoid irrelevant or rarely needed information?
Look for: clean layout, purposeful whitespace, no visual noise, focused content, appropriate information density.

### H9: Help Users Recognize, Diagnose, and Recover from Errors
Are error messages expressed in plain language and suggesting a solution?
Look for: clear error messages (not codes), indicated problem location, specific recovery instructions, non-blaming tone.

### H10: Help and Documentation
Is help available when needed and easy to find?
Look for: contextual tooltips, help links, onboarding guides, documentation access, searchable help.

## Response Format (JSON)
{
  "heuristics": [
    {
      "id": "H1",
      "name": "Visibility of System Status",
      "rating": "pass|needs_improvement|fail|not_assessable",
      "evidence": ["<specific observation from the screenshot>"],
      "recommendation": "<actionable fix or null if pass>"
    }
  ],
  "findings": [
    {
      "finding": "<specific observation>",
      "confidence": 0.0,
      "evidence": "<element or region reference>",
      "category": "nielsen",
      "severity": "critical|warning|info"
    }
  ],
  "topViolations": ["<H-number: brief description>"],
  "summary": "<2-3 sentence summary>"
}

IMPORTANT: Only evaluate heuristics that are observable from the screenshot. Use 'not_assessable' when a heuristic cannot be evaluated from a static screenshot (e.g. H7, H10). Do NOT count not_assessable as pass.
${GROUNDING_INSTRUCTIONS}`;
}

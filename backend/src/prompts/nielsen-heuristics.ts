/**
 * Nielsen's Heuristics Evaluation prompt.
 * Evaluates the 6 heuristics that can be assessed from static screenshots
 * (skips H2 Real World Match, H7 Flexibility, H9 Error Recovery, H10 Help).
 */
export function buildNielsenHeuristicsPrompt(lintContext: string, flowContext?: string): string {
  const flowBlock = flowContext
    ? `\nFlow context (multiple screens in this flow):\n${flowContext}\n`
    : '';

  return `Evaluate this UI screenshot against Nielsen's 10 Usability Heuristics. Focus on the 6 heuristics that can be assessed visually. Skip H2 (Real World Match), H7 (Flexibility & Efficiency), H9 (Error Recovery), and H10 (Help & Documentation) — these require domain knowledge or interaction testing.

Context from automated lint:
${lintContext}
${flowBlock}
Evaluate each heuristic below. For each one, provide a rating, 2-3 specific evidence items from the screenshot, and a recommendation if the rating is not "pass".

## H1: Visibility of System Status
The system should always keep users informed about what is going on through appropriate feedback within reasonable time.
Look for: loading indicators, progress bars, active/selected states on navigation, current step indicators in multi-step flows, feedback after actions (success/error badges), real-time status updates.
PASS: Clear system status indicators present where needed.
NEEDS_IMPROVEMENT: Some status indicators present but gaps exist (e.g., no loading state, unclear active tab).
FAIL: No visible system status — user cannot tell what state the system is in.

## H3: User Control & Freedom
Users often perform actions by mistake. They need a clearly marked "emergency exit" to leave the unwanted action.
Look for: back/close buttons on modals and overlays, undo affordances, cancel buttons alongside confirm, breadcrumbs for navigation history, clear exit paths from flows.
PASS: All modals/overlays have close buttons; destructive actions have cancel options; navigation provides back paths.
NEEDS_IMPROVEMENT: Most controls present but 1-2 exit paths missing (e.g., modal without close button, no cancel on form).
FAIL: Users appear trapped — no visible way to go back, close, or undo.

## H4: Consistency & Standards
Users should not have to wonder whether different words, situations, or actions mean the same thing.
Look for: consistent button styles for same-level actions, consistent iconography, platform conventions followed (iOS/Android/Web), consistent terminology, consistent spacing and alignment patterns.
PASS: Visual language is consistent throughout; platform conventions followed.
NEEDS_IMPROVEMENT: Generally consistent but 1-2 deviations (mixed icon styles, inconsistent button hierarchy).
FAIL: Significant inconsistencies — mixed visual languages, contradictory conventions.

## H5: Error Prevention
Even better than good error messages is a careful design which prevents a problem from occurring in the first place.
Look for: confirmation dialogs for destructive actions (delete, discard), input constraints (character counters, format hints), safe defaults (opt-out rather than opt-in for risky actions), disabled states for unavailable actions, inline validation hints.
PASS: Destructive actions have safeguards; inputs show constraints; defaults are safe.
NEEDS_IMPROVEMENT: Some error prevention present but gaps (e.g., delete without confirmation, no input hints).
FAIL: No error prevention visible — destructive actions lack confirmation, no input guidance.

## H6: Recognition Rather Than Recall
Minimize the user's memory load by making objects, actions, and options visible or easily retrievable.
Look for: visible labels (not icon-only buttons without tooltips), breadcrumbs showing path, recently used items, visible options rather than hidden menus, search with suggestions, placeholder text that explains expected input.
PASS: All actions labeled; navigation context visible; options discoverable.
NEEDS_IMPROVEMENT: Most elements labeled but some icon-only buttons without clear meaning; some navigation context missing.
FAIL: Heavy reliance on recall — unlabeled icons, hidden options, no navigation context.

## H8: Aesthetic & Minimalist Design
Every extra unit of information in an interface competes with relevant units of information and diminishes their relative visibility.
Look for: information density appropriate for the context, noise-to-signal ratio, visual clutter (unnecessary borders, shadows, decorations), content hierarchy that surfaces what matters, purposeful use of whitespace.
PASS: Clean design with only relevant information; clear content hierarchy; purposeful whitespace.
NEEDS_IMPROVEMENT: Mostly clean but some unnecessary elements or slightly cluttered areas.
FAIL: Cluttered — excessive decorations, too much information competing for attention, poor signal-to-noise ratio.

Respond in this exact JSON format:
{
  "heuristics": [
    {
      "id": "H1",
      "name": "Visibility of System Status",
      "rating": "pass|needs_improvement|fail",
      "evidence": ["<observation 1>", "<observation 2>"],
      "recommendation": "<actionable suggestion or null if pass>"
    },
    {
      "id": "H3",
      "name": "User Control & Freedom",
      "rating": "pass|needs_improvement|fail",
      "evidence": ["<observation 1>", "<observation 2>"],
      "recommendation": "<actionable suggestion or null if pass>"
    },
    {
      "id": "H4",
      "name": "Consistency & Standards",
      "rating": "pass|needs_improvement|fail",
      "evidence": ["<observation 1>", "<observation 2>"],
      "recommendation": "<actionable suggestion or null if pass>"
    },
    {
      "id": "H5",
      "name": "Error Prevention",
      "rating": "pass|needs_improvement|fail",
      "evidence": ["<observation 1>", "<observation 2>"],
      "recommendation": "<actionable suggestion or null if pass>"
    },
    {
      "id": "H6",
      "name": "Recognition Rather Than Recall",
      "rating": "pass|needs_improvement|fail",
      "evidence": ["<observation 1>", "<observation 2>"],
      "recommendation": "<actionable suggestion or null if pass>"
    },
    {
      "id": "H8",
      "name": "Aesthetic & Minimalist Design",
      "rating": "pass|needs_improvement|fail",
      "evidence": ["<observation 1>", "<observation 2>"],
      "recommendation": "<actionable suggestion or null if pass>"
    }
  ],
  "overallCompliance": 0-100,
  "criticalViolations": [
    { "heuristic": "<H1|H3|H4|H5|H6|H8>", "description": "<what is critically wrong>" }
  ],
  "summary": "<2-3 sentence summary of heuristic compliance>"
}`;
}

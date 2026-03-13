/**
 * Build the AI prompt for multi-frame flow analysis.
 * Sent alongside screenshots of all frames in the flow.
 */
export function buildFlowAnalysisPrompt(
  graphDescription: string,
  frameNames: string[],
  graphIssues: string,
): string {
  return `You are analyzing a complete user flow consisting of ${frameNames.length} screens.

## Flow Graph
${graphDescription}

## Automated Graph Issues (already detected)
${graphIssues || 'No structural issues detected.'}

## Your Task
Analyze the screenshots of ALL screens in this flow. Evaluate:

### 1. Scenario Completeness
Check if the flow covers all necessary states:
- Is the happy path complete (can user achieve the goal)?
- Are error states present (validation errors, server errors, empty states)?
- Are loading/skeleton states shown for async operations?
- Is there a confirmation/success screen?
- Are onboarding/first-run states addressed?
- Is there a way to recover from errors?

### 2. Cross-Screen Consistency
Compare all screens for visual consistency:
- Do colors stay consistent across screens?
- Is typography (sizes, weights, fonts) consistent?
- Are layouts following the same structural pattern?
- Is terminology consistent (same action labeled the same everywhere)?
- Are interactive elements styled consistently?

### 3. Navigation & Wayfinding
- Can the user always tell where they are in the flow?
- Is back navigation available on every non-entry screen?
- Are breadcrumbs or progress indicators present for multi-step flows?
- Is the navigation pattern consistent (top bar, bottom tabs, etc.)?

Respond in this exact JSON format:
{
  "scenarioAnalysis": {
    "missingScreens": [
      { "type": "error|loading|empty|confirmation|onboarding", "description": "<what's missing>", "afterFrameName": "<which screen it should follow>" }
    ],
    "happyPathComplete": true|false,
    "errorRecoveryPaths": true|false,
    "backNavigationPresent": true|false
  },
  "consistencyAnalysis": {
    "colorDrift": true|false,
    "typographyDrift": true|false,
    "layoutConsistency": "pass|needs_improvement|fail",
    "terminologyConsistency": "pass|needs_improvement|fail",
    "evidence": ["<observation 1>", "<observation 2>", "<observation 3>"]
  },
  "recommendations": [
    { "title": "<short title>", "description": "<specific action>", "severity": "critical|warning|info", "affectedFrames": ["<frame name>"] }
  ],
  "summary": "<3-4 sentence summary of the flow quality>"
}`;
}

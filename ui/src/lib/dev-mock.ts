/**
 * Dev-mode mock data for showcasing the chat UI without a Figma runtime.
 *
 * Only imported when `import.meta.env.DEV` is true.
 * Populates the chat with sample messages that exercise every visual component:
 *   - ScoreCard (score-card)
 *   - AiMessage with Markdown (ai-text)
 *   - IssuesList (issues-list)
 *   - User bubble (user-text)
 *   - Streaming typing indicator (ai-text + streaming)
 *   - ActionButtons (action-buttons)
 */

import type { ChatMessageType, ScoreBreakdown, LintError, ActionButton } from './messages';

// ── Sample score breakdown ──────────────────────────────────

const mockScore: ScoreBreakdown = {
  overall: 74,
  grade: 'needs-work',
  tokens: { score: 65, passed: 13, failed: 7 },
  spacing: { score: 80, passed: 16, failed: 4 },
  layout: { score: 90, passed: 18, failed: 2 },
  accessibility: { score: 55, passed: 11, failed: 9 },
  naming: { score: 85, passed: 17, failed: 3 },
  visualQuality: { score: 70, passed: 14, failed: 6 },
  microcopy: { score: 82, passed: 16, failed: 4 },
  conversion: { score: 78, passed: 15, failed: 5 },
  cognitive: { score: 88, passed: 18, failed: 2 },
};

// ── Sample lint errors ──────────────────────────────────────

const mockErrors: LintError[] = [
  {
    nodeId: 'mock-1',
    nodeName: 'Button / Primary',
    nodeType: 'FRAME',
    errorType: 'fill',
    message: 'Fill color #3B82F6 is not bound to a design token.',
    value: '#3B82F6',
    path: 'Page > Hero Section > CTA',
    severity: 'critical',
  },
  {
    nodeId: 'mock-2',
    nodeName: 'Card Header',
    nodeType: 'TEXT',
    errorType: 'spacing',
    message: 'Padding top is 13px, nearest grid value is 12px.',
    value: '13px',
    path: 'Page > Cards > Card 1',
    property: 'paddingTop',
    severity: 'warning',
  },
  {
    nodeId: 'mock-3',
    nodeName: 'Icon / Search',
    nodeType: 'VECTOR',
    errorType: 'accessibility',
    message: 'Touch target is 24x24px, minimum recommended is 44x44px.',
    value: '24x24',
    path: 'Page > Nav > Search',
    severity: 'critical',
  },
  {
    nodeId: 'mock-4',
    nodeName: 'Frame 47',
    nodeType: 'FRAME',
    errorType: 'radius',
    message: 'Border radius 5px is not in the token scale [0, 2, 4, 8, 12, 16, 9999].',
    value: '5px',
    path: 'Page > Footer > Container',
    severity: 'info',
  },
];

// ── Sample AI markdown text ─────────────────────────────────

const markdownContent = `**4 issues** found -- biggest impact: **7** fill styles, **9** accessibility, **4** off-grid spacing + 2 more. **2 auto-fixable.**

### Key Observations

- The **CTA button** uses a hardcoded fill instead of the \`color.primary\` token
- Touch targets on icon buttons are **below the 44px minimum** recommended by WCAG 2.1
- Spacing between card elements drifts from the 4px grid

### Recommendations

1. Bind all fills and strokes to design tokens
2. Increase icon-only button hit areas to at least 44x44
3. Run \`Fix spacing\` to snap paddings to the nearest grid value`;

// ── Sample action buttons ───────────────────────────────────

const mockButtons: ActionButton[] = [
  { id: 'fix-all', label: 'Fix all (2)', variant: 'primary', action: 'fix-all' },
  { id: 'fix-spacing', label: 'Fix spacing (4)', variant: 'secondary', action: 'fix-all-spacing' },
  { id: 'walkthrough', label: 'Walk through issues', variant: 'ghost', action: 'walkthrough' },
  { id: 'rescan', label: 'Re-scan', variant: 'ghost', action: 'rescan' },
];

// ── Ordered mock messages with delays ───────────────────────

export interface MockStep {
  delay: number; // ms from mount
  msg: ChatMessageType;
}

export const DEV_MOCK_STEPS: MockStep[] = [
  {
    delay: 300,
    msg: { kind: 'score-card', data: mockScore },
  },
  {
    delay: 600,
    msg: { kind: 'ai-text', content: markdownContent },
  },
  {
    delay: 900,
    msg: { kind: 'issues-list', data: mockErrors, fixableCount: 2 },
  },
  {
    delay: 1400,
    msg: { kind: 'user-text', content: 'Can you explain the accessibility issues in more detail?' },
  },
  {
    delay: 1800,
    msg: { kind: 'ai-text', content: '', streaming: true },
  },
  {
    delay: 2200,
    msg: { kind: 'action-buttons', buttons: mockButtons },
  },
];

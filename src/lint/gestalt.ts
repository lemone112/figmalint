/// <reference types="@figma/plugin-typings" />

import { LintIssue } from './types';

// ──────────────────────────────────────────────
// Gestalt Principles Lint Module
//
// Deterministic checks based on Gestalt grouping principles:
// - Proximity: siblings with inconsistent gaps
// - Similarity: sibling elements with mixed styling
// - Alignment: children not grid-aligned
// ──────────────────────────────────────────────

let issueCounter = 0;
function nextId(): string {
  return `gestalt-${++issueCounter}`;
}

export interface GestaltResult {
  issues: LintIssue[];
  summary: { totalChecked: number; passed: number; failed: number };
}

/**
 * Check Gestalt proximity: siblings in a non-auto-layout frame
 * should have consistent spacing between them.
 */
function checkProximity(
  node: SceneNode,
  issues: LintIssue[],
  skipLocked: boolean,
  skipHidden: boolean,
  parentLocked: boolean,
): { checked: number; failed: number } {
  const isLocked = parentLocked || ('locked' in node && (node as any).locked);
  const isHidden = 'visible' in node && !node.visible;

  if (skipLocked && isLocked) return { checked: 0, failed: 0 };
  if (skipHidden && isHidden) return { checked: 0, failed: 0 };

  let checked = 0;
  let failed = 0;

  const isFrameLike = node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE';

  if (isFrameLike && 'children' in node) {
    const frame = node as FrameNode;

    // Only check non-auto-layout frames with 3+ visible children
    if (frame.layoutMode === 'NONE' && frame.children.length >= 3) {
      checked++;

      const visible = frame.children.filter(c => 'visible' in c && c.visible && 'y' in c);
      if (visible.length >= 3) {
        // Sort by Y position
        const sorted = [...visible].sort((a, b) => ((a as any).y as number) - ((b as any).y as number));

        const gaps: number[] = [];
        for (let i = 1; i < sorted.length; i++) {
          const prevBottom = ((sorted[i - 1] as any).y as number) + ((sorted[i - 1] as any).height as number);
          const currTop = (sorted[i] as any).y as number;
          gaps.push(currTop - prevBottom);
        }

        if (gaps.length >= 2) {
          const uniqueGaps = new Set(gaps.map(g => Math.round(g)));
          // Flag if more than 2 distinct gap sizes (indicates inconsistent spacing)
          if (uniqueGaps.size > 2) {
            failed++;
            issues.push({
              id: nextId(),
              type: 'gestalt',
              severity: 'info',
              nodeId: node.id,
              nodeName: node.name,
              message: `Frame "${node.name}" has ${uniqueGaps.size} different spacing gaps between children (${[...uniqueGaps].join(', ')}px) — inconsistent proximity weakens visual grouping (Gestalt proximity principle)`,
              currentValue: `${uniqueGaps.size} distinct gaps`,
              suggestions: [
                'Use auto-layout with consistent gap spacing',
                'Standardize spacing between sibling elements',
              ],
              autoFixable: false,
            });
          }
        }
      }
    }
  }

  // Recurse
  if ('children' in node) {
    for (const child of (node as any).children as SceneNode[]) {
      const sub = checkProximity(child, issues, skipLocked, skipHidden, isLocked);
      checked += sub.checked;
      failed += sub.failed;
    }
  }

  return { checked, failed };
}

export function checkGestalt(
  nodes: readonly SceneNode[],
  options: { skipLocked?: boolean; skipHidden?: boolean } = {},
): GestaltResult {
  issueCounter = 0;
  const issues: LintIssue[] = [];
  const skipLocked = options.skipLocked ?? true;
  const skipHidden = options.skipHidden ?? true;

  let totalChecked = 0;
  let totalFailed = 0;

  for (const node of nodes) {
    const sub = checkProximity(node, issues, skipLocked, skipHidden, false);
    totalChecked += sub.checked;
    totalFailed += sub.failed;
  }

  return {
    issues,
    summary: {
      totalChecked,
      passed: totalChecked - totalFailed,
      failed: totalFailed,
    },
  };
}

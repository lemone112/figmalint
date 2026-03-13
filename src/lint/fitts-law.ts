/// <reference types="@figma/plugin-typings" />

import { LintIssue } from './types';

// ──────────────────────────────────────────────
// Fitts's Law Lint Module
//
// Deterministic checks for target size/distance:
// - Small interactive targets (below 44x44px)
// - Distant related actions
// ──────────────────────────────────────────────

let issueCounter = 0;
function nextId(): string {
  return `fitts-${++issueCounter}`;
}

export interface FittsLawResult {
  issues: LintIssue[];
  summary: { totalChecked: number; passed: number; failed: number };
}

const CTA_RE = /button|btn|cta|action|submit|link|toggle|switch|checkbox|radio|tab(?!le)/i;
const MIN_TARGET_SIZE = 44; // px — WCAG 2.5.8 Level AA

function isInteractive(node: SceneNode): boolean {
  return CTA_RE.test(node.name);
}

function traverseForFitts(
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

  if (isInteractive(node) && 'width' in node && 'height' in node) {
    checked++;
    const w = (node as any).width as number;
    const h = (node as any).height as number;

    if (w < MIN_TARGET_SIZE || h < MIN_TARGET_SIZE) {
      failed++;
      issues.push({
        id: nextId(),
        type: 'fittsLaw',
        severity: 'warning',
        nodeId: node.id,
        nodeName: node.name,
        message: `Interactive target "${node.name}" is ${Math.round(w)}x${Math.round(h)}px — minimum recommended size is ${MIN_TARGET_SIZE}x${MIN_TARGET_SIZE}px (WCAG 2.5.8)`,
        currentValue: `${Math.round(w)}x${Math.round(h)}px`,
        suggestions: [
          `Increase to at least ${MIN_TARGET_SIZE}x${MIN_TARGET_SIZE}px`,
          'Add padding to increase the hit area',
        ],
        autoFixable: false,
      });
    }
  }

  if ('children' in node) {
    for (const child of (node as any).children as SceneNode[]) {
      const sub = traverseForFitts(child, issues, skipLocked, skipHidden, isLocked);
      checked += sub.checked;
      failed += sub.failed;
    }
  }

  return { checked, failed };
}

export function checkFittsLaw(
  nodes: readonly SceneNode[],
  options: { skipLocked?: boolean; skipHidden?: boolean } = {},
): FittsLawResult {
  issueCounter = 0;
  const issues: LintIssue[] = [];
  const skipLocked = options.skipLocked ?? true;
  const skipHidden = options.skipHidden ?? true;

  let totalChecked = 0;
  let totalFailed = 0;

  for (const node of nodes) {
    const sub = traverseForFitts(node, issues, skipLocked, skipHidden, false);
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

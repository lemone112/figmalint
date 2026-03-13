/// <reference types="@figma/plugin-typings" />

import { LintIssue } from './types';

// ──────────────────────────────────────────────
// Detached Instance Lint Module
//
// Flags frames that were likely detached from component instances
// (heuristic: frame with name containing "detach", or frames
// at shallow depth that look like they were once instances).
// ──────────────────────────────────────────────

let issueCounter = 0;
function nextId(): string {
  return `detach-${++issueCounter}`;
}

export interface DetachedInstanceResult {
  issues: LintIssue[];
  summary: { totalChecked: number; passed: number; failed: number };
}

const DETACH_RE = /detach/i;
const COMPONENT_NAME_RE = /^[A-Z][a-zA-Z]+(?:\s*[-\/]\s*[A-Za-z]+)*$/;

function traverseForDetached(
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

  // A FRAME (not COMPONENT or INSTANCE) whose name looks like a component name
  // and isn't at the page root level — likely detached
  if (node.type === 'FRAME' && 'children' in node) {
    checked++;

    const isDetachNamed = DETACH_RE.test(node.name);
    const looksLikeComponent = COMPONENT_NAME_RE.test(node.name) &&
      node.parent?.type !== 'PAGE' &&
      (node as FrameNode).children.length > 0;

    if (isDetachNamed) {
      failed++;
      issues.push({
        id: nextId(),
        type: 'detachedInstance',
        severity: 'warning',
        nodeId: node.id,
        nodeName: node.name,
        message: `Frame "${node.name}" appears to be a detached component instance. Detaching breaks the link to the source component and prevents design system updates.`,
        currentValue: 'Detached instance',
        suggestions: [
          'Re-attach by replacing with the original component instance',
          'If intentional, rename to remove "detach" from the name',
        ],
        autoFixable: false,
      });
    } else if (looksLikeComponent) {
      // Additional heuristic: frame with component-like name, multiple children,
      // but it's a plain FRAME not an INSTANCE
      // Only flag if it has a structured name (PascalCase with separators)
      const parts = node.name.split(/[\s\-\/]/);
      if (parts.length >= 2 && parts.every(p => p.length > 0)) {
        // This is a softer signal — don't flag unless confident
        // Skip for now to avoid false positives
      }
    }
  }

  if ('children' in node) {
    for (const child of (node as any).children as SceneNode[]) {
      const sub = traverseForDetached(child, issues, skipLocked, skipHidden, isLocked);
      checked += sub.checked;
      failed += sub.failed;
    }
  }

  return { checked, failed };
}

export function checkDetachedInstances(
  nodes: readonly SceneNode[],
  options: { skipLocked?: boolean; skipHidden?: boolean } = {},
): DetachedInstanceResult {
  issueCounter = 0;
  const issues: LintIssue[] = [];
  const skipLocked = options.skipLocked ?? true;
  const skipHidden = options.skipHidden ?? true;

  let totalChecked = 0;
  let totalFailed = 0;

  for (const node of nodes) {
    const sub = traverseForDetached(node, issues, skipLocked, skipHidden, false);
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

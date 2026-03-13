/// <reference types="@figma/plugin-typings" />

import { LintIssue, LintSeverity } from './types';

// ──────────────────────────────────────────────
// Constraints Validation Module
//
// Deterministic checks for node constraints:
// - No constraints set (default MIN/MIN) in fixed frames
// - SCALE on text nodes (distortion risk)
// - Conflicting constraints (STRETCH + fixed width)
// - Constraints in auto-layout (ignored, confusing)
// ──────────────────────────────────────────────

let issueCounter = 0;
function nextId(): string {
  return `constraints-${++issueCounter}`;
}

export interface ConstraintsLintResult {
  issues: LintIssue[];
  summary: {
    totalChecked: number;
    noConstraints: number;
    scaleOnText: number;
    conflicting: number;
    ignoredInAutoLayout: number;
  };
}

// ── Helpers ─────────────────────────────────────

function isFrameLike(node: SceneNode): boolean {
  return node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE';
}

function hasAutoLayout(node: SceneNode): boolean {
  if (!isFrameLike(node)) return false;
  return (node as unknown as FrameNode).layoutMode !== 'NONE';
}

function getConstraints(node: SceneNode): { horizontal: string; vertical: string } | null {
  const raw = (node as any)?.constraints;
  if (raw && typeof raw.horizontal === 'string' && typeof raw.vertical === 'string') {
    return raw as { horizontal: string; vertical: string };
  }
  return null;
}

function pushIssue(
  issues: LintIssue[],
  severity: LintSeverity,
  nodeId: string,
  nodeName: string,
  message: string,
  currentValue?: string,
  suggestions?: string[],
): void {
  issues.push({
    id: nextId(),
    type: 'autoLayout',
    severity,
    nodeId,
    nodeName,
    message,
    currentValue,
    suggestions,
    autoFixable: false,
  });
}

// ── Check: No constraints set (default MIN/MIN) ──

function checkDefaultConstraints(
  node: SceneNode,
  parent: SceneNode,
  issues: LintIssue[],
): boolean {
  // Only relevant for children of non-auto-layout frames
  if (hasAutoLayout(parent)) return false;

  const constraints = getConstraints(node);
  if (!constraints) return false;

  if (constraints.horizontal === 'MIN' && constraints.vertical === 'MIN') {
    pushIssue(
      issues,
      'warning',
      node.id,
      node.name,
      `Default constraints (MIN, MIN) inside fixed frame "${parent.name}" — will break on resize`,
      'MIN, MIN',
      ['STRETCH', 'CENTER', 'MAX'],
    );
    return true;
  }

  return false;
}

// ── Check: SCALE on text ──

function checkScaleOnText(
  node: SceneNode,
  issues: LintIssue[],
): boolean {
  if (node.type !== 'TEXT') return false;

  const constraints = getConstraints(node);
  if (!constraints) return false;

  const hasScale = constraints.horizontal === 'SCALE' || constraints.vertical === 'SCALE';
  if (hasScale) {
    const axis = constraints.horizontal === 'SCALE' ? 'horizontal' : 'vertical';
    pushIssue(
      issues,
      'critical',
      node.id,
      node.name,
      `SCALE constraint on text node will distort text — use MIN or STRETCH instead`,
      `SCALE (${axis})`,
      ['MIN', 'STRETCH'],
    );
    return true;
  }

  return false;
}

// ── Check: Conflicting constraints (STRETCH + fixed dimension) ──

function checkConflictingConstraints(
  node: SceneNode,
  issues: LintIssue[],
): number {
  const constraints = getConstraints(node);
  if (!constraints) return 0;

  let count = 0;

  // Detect "fixed size" via layoutSizingHorizontal/Vertical rather than
  // width/height > 0 (almost every node has positive dimensions).
  const sizingH = (node as any).layoutSizingHorizontal as string | undefined;
  const sizingV = (node as any).layoutSizingVertical as string | undefined;

  // Check for STRETCH horizontal with a fixed width
  if (constraints.horizontal === 'STRETCH' && sizingH === 'FIXED') {
    const parent = node.parent;
    const parentIsFixed = parent && isFrameLike(parent as SceneNode) && !hasAutoLayout(parent as SceneNode);

    if (parentIsFixed) {
      const width = (node as any)?.width;
      pushIssue(
        issues,
        'warning',
        node.id,
        node.name,
        `STRETCH horizontal constraint but node has fixed width${typeof width === 'number' ? ` ${Math.round(width)}px` : ''} — potentially contradictory`,
        `STRETCH + FIXED width`,
        ['Remove fixed width or change constraint to MIN/CENTER'],
      );
      count++;
    }
  }

  if (constraints.vertical === 'STRETCH' && sizingV === 'FIXED') {
    const parent = node.parent;
    const parentIsFixed = parent && isFrameLike(parent as SceneNode) && !hasAutoLayout(parent as SceneNode);

    if (parentIsFixed) {
      const height = (node as any)?.height;
      pushIssue(
        issues,
        'warning',
        node.id,
        node.name,
        `STRETCH vertical constraint but node has fixed height${typeof height === 'number' ? ` ${Math.round(height)}px` : ''} — potentially contradictory`,
        `STRETCH + FIXED height`,
        ['Remove fixed height or change constraint to MIN/CENTER'],
      );
      count++;
    }
  }

  return count;
}

// ── Check: Constraints in auto-layout parent (ignored) ──

function checkConstraintsInAutoLayout(
  node: SceneNode,
  parent: SceneNode,
  issues: LintIssue[],
): boolean {
  if (!hasAutoLayout(parent)) return false;

  // Skip absolutely positioned children — they DO respect constraints
  const positioning = (node as any)?.layoutPositioning;
  if (positioning === 'ABSOLUTE') return false;

  const constraints = getConstraints(node);
  if (!constraints) return false;

  // Only flag if constraints are non-default (someone explicitly set them)
  const isDefault = constraints.horizontal === 'MIN' && constraints.vertical === 'MIN';
  if (isDefault) return false;

  pushIssue(
    issues,
    'info',
    node.id,
    node.name,
    `Explicit constraints (${constraints.horizontal}, ${constraints.vertical}) inside auto-layout parent "${parent.name}" — constraints are ignored`,
    `${constraints.horizontal}, ${constraints.vertical}`,
    ['Remove explicit constraints or switch parent to fixed layout'],
  );

  return true;
}

// ── Recursive traversal ─────────────────────────

interface TraversalStats {
  totalChecked: number;
  noConstraints: number;
  scaleOnText: number;
  conflicting: number;
  ignoredInAutoLayout: number;
}

function emptyStats(): TraversalStats {
  return {
    totalChecked: 0,
    noConstraints: 0,
    scaleOnText: 0,
    conflicting: 0,
    ignoredInAutoLayout: 0,
  };
}

function traverse(
  node: SceneNode,
  issues: LintIssue[],
  skipLocked: boolean,
  skipHidden: boolean,
  parentLocked: boolean,
  parentNode: SceneNode | null,
): TraversalStats {
  const isLocked = parentLocked || ('locked' in node && (node as any).locked);
  const isHidden = 'visible' in node && !node.visible;

  if (skipLocked && isLocked) return emptyStats();
  if (skipHidden && isHidden) return emptyStats();

  const stats = emptyStats();

  // Only check nodes that have a parent frame context
  if (parentNode && isFrameLike(parentNode)) {
    const constraints = getConstraints(node);
    if (constraints) {
      stats.totalChecked++;

      if (checkScaleOnText(node, issues)) {
        stats.scaleOnText++;
      }

      if (checkDefaultConstraints(node, parentNode, issues)) {
        stats.noConstraints++;
      }

      stats.conflicting += checkConflictingConstraints(node, issues);

      if (checkConstraintsInAutoLayout(node, parentNode, issues)) {
        stats.ignoredInAutoLayout++;
      }
    }
  }

  // Recurse into children
  if ('children' in node) {
    for (const child of (node as any).children as SceneNode[]) {
      const sub = traverse(child, issues, skipLocked, skipHidden, isLocked, node);
      stats.totalChecked += sub.totalChecked;
      stats.noConstraints += sub.noConstraints;
      stats.scaleOnText += sub.scaleOnText;
      stats.conflicting += sub.conflicting;
      stats.ignoredInAutoLayout += sub.ignoredInAutoLayout;
    }
  }

  return stats;
}

// ── Public API ──────────────────────────────────

/**
 * Run constraints validation on the given nodes.
 * Checks for default constraints in fixed frames, SCALE on text,
 * conflicting STRETCH + fixed dimension, and ignored constraints in auto-layout.
 */
export function checkConstraints(
  nodes: readonly SceneNode[],
  opts?: { settings?: { skipLockedLayers?: boolean; skipHiddenLayers?: boolean } },
): ConstraintsLintResult {
  const skipLocked = opts?.settings?.skipLockedLayers ?? true;
  const skipHidden = opts?.settings?.skipHiddenLayers ?? true;
  issueCounter = 0;

  const issues: LintIssue[] = [];
  const totals = emptyStats();

  for (const node of nodes) {
    const sub = traverse(node, issues, skipLocked, skipHidden, false, null);
    totals.totalChecked += sub.totalChecked;
    totals.noConstraints += sub.noConstraints;
    totals.scaleOnText += sub.scaleOnText;
    totals.conflicting += sub.conflicting;
    totals.ignoredInAutoLayout += sub.ignoredInAutoLayout;
  }

  return {
    issues,
    summary: {
      totalChecked: totals.totalChecked,
      noConstraints: totals.noConstraints,
      scaleOnText: totals.scaleOnText,
      conflicting: totals.conflicting,
      ignoredInAutoLayout: totals.ignoredInAutoLayout,
    },
  };
}

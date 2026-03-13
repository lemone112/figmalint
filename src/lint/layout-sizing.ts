/// <reference types="@figma/plugin-typings" />

import { LintIssue, LintSeverity } from './types';

// ──────────────────────────────────────────────
// Layout Sizing Audit Module
//
// Deterministic checks for auto-layout sizing modes:
// - Inconsistent sizing strategy among siblings
// - FIXED sizing inside auto-layout parent
// - layoutGrow mismatch among siblings
// - Absolute positioning in auto-layout
// - Missing min/max constraints on FILL-sized frames
// ──────────────────────────────────────────────

let issueCounter = 0;
function nextId(): string {
  return `layout-sizing-${++issueCounter}`;
}

export interface LayoutSizingLintResult {
  issues: LintIssue[];
  summary: {
    totalChecked: number;
    inconsistentSizing: number;
    fixedInAutoLayout: number;
    layoutGrowMismatch: number;
    absoluteInAutoLayout: number;
    missingConstraints: number;
  };
}

// ── Helpers ─────────────────────────────────────

function isFrameLike(node: SceneNode): boolean {
  return node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE';
}

function asFrame(node: SceneNode): FrameNode {
  return node as unknown as FrameNode;
}

function hasAutoLayout(node: SceneNode): boolean {
  if (!isFrameLike(node)) return false;
  return asFrame(node).layoutMode !== 'NONE';
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

// ── Check: Inconsistent sizing strategy among siblings ──

function checkInconsistentSizing(parent: FrameNode, issues: LintIssue[]): number {
  if (!('children' in parent)) return 0;
  const children = (parent.children as SceneNode[]).filter(c => isFrameLike(c) && c.visible !== false);
  if (children.length < 2) return 0;

  let checked = 0;

  // Check primary axis sizing mode consistency
  const primaryModes = new Map<string, SceneNode[]>();
  const counterModes = new Map<string, SceneNode[]>();

  for (const child of children) {
    const frame = child as unknown as Record<string, unknown>;
    const primary = (frame['primaryAxisSizingMode'] as string) ?? 'UNKNOWN';
    const counter = (frame['counterAxisSizingMode'] as string) ?? 'UNKNOWN';

    if (!primaryModes.has(primary)) primaryModes.set(primary, []);
    primaryModes.get(primary)!.push(child);

    if (!counterModes.has(counter)) counterModes.set(counter, []);
    counterModes.get(counter)!.push(child);
  }

  checked += children.length;

  // If there are multiple different primary axis modes, flag minority nodes
  if (primaryModes.size > 1) {
    let maxCount = 0;
    let majorityMode = '';
    for (const [mode, nodes] of primaryModes) {
      if (nodes.length > maxCount) {
        maxCount = nodes.length;
        majorityMode = mode;
      }
    }

    for (const [mode, nodes] of primaryModes) {
      if (mode !== majorityMode) {
        for (const node of nodes) {
          pushIssue(
            issues,
            'warning',
            node.id,
            node.name,
            `Primary axis sizing "${mode}" differs from siblings' "${majorityMode}" in "${parent.name}"`,
            mode,
            [majorityMode],
          );
        }
      }
    }
  }

  // Same for counter axis
  if (counterModes.size > 1) {
    let maxCount = 0;
    let majorityMode = '';
    for (const [mode, nodes] of counterModes) {
      if (nodes.length > maxCount) {
        maxCount = nodes.length;
        majorityMode = mode;
      }
    }

    for (const [mode, nodes] of counterModes) {
      if (mode !== majorityMode) {
        for (const node of nodes) {
          pushIssue(
            issues,
            'warning',
            node.id,
            node.name,
            `Counter axis sizing "${mode}" differs from siblings' "${majorityMode}" in "${parent.name}"`,
            mode,
            [majorityMode],
          );
        }
      }
    }
  }

  return checked;
}

// ── Check: FIXED sizing inside auto-layout parent ──

function checkFixedInAutoLayout(parent: FrameNode, issues: LintIssue[]): number {
  if (!hasAutoLayout(parent as unknown as SceneNode)) return 0;
  if (!('children' in parent)) return 0;

  let checked = 0;

  for (const child of parent.children as SceneNode[]) {
    if (child.visible === false) continue;
    if (!isFrameLike(child)) continue;

    const frame = child as unknown as Record<string, unknown>;
    const positioning = frame['layoutPositioning'] as string | undefined;

    // Skip absolutely positioned children — they are handled separately
    if (positioning === 'ABSOLUTE') continue;

    checked++;

    const primaryMode = (frame['primaryAxisSizingMode'] as string) ?? undefined;
    const counterMode = (frame['counterAxisSizingMode'] as string) ?? undefined;

    if (primaryMode === 'FIXED') {
      pushIssue(
        issues,
        'warning',
        child.id,
        child.name,
        `FIXED primary axis sizing inside auto-layout parent "${parent.name}" may break layout`,
        'FIXED (primary)',
        ['HUG', 'FILL'],
      );
    }

    if (counterMode === 'FIXED') {
      pushIssue(
        issues,
        'warning',
        child.id,
        child.name,
        `FIXED counter axis sizing inside auto-layout parent "${parent.name}" may break layout`,
        'FIXED (counter)',
        ['HUG', 'FILL'],
      );
    }
  }

  return checked;
}

// ── Check: layoutGrow mismatch ──

function checkLayoutGrowMismatch(parent: FrameNode, issues: LintIssue[]): number {
  if (!hasAutoLayout(parent as unknown as SceneNode)) return 0;
  if (parent.layoutMode !== 'HORIZONTAL') return 0;
  if (!('children' in parent)) return 0;

  const children = (parent.children as SceneNode[]).filter(c => c.visible !== false);
  if (children.length < 2) return 0;

  let checked = 0;
  let hasGrow = false;
  let hasNoGrow = false;
  const growNodes: SceneNode[] = [];

  for (const child of children) {
    const frame = child as unknown as Record<string, unknown>;
    const positioning = frame['layoutPositioning'] as string | undefined;
    if (positioning === 'ABSOLUTE') continue;

    checked++;
    const grow = (frame['layoutGrow'] as number) ?? 0;

    if (grow === 1) {
      hasGrow = true;
      growNodes.push(child);
    } else {
      hasNoGrow = true;
    }
  }

  if (hasGrow && hasNoGrow) {
    for (const node of growNodes) {
      pushIssue(
        issues,
        'info',
        node.id,
        node.name,
        `layoutGrow: 1 while siblings have layoutGrow: 0 in horizontal layout "${parent.name}" — may cause unexpected stretching`,
        'layoutGrow: 1',
        ['Verify stretching is intentional'],
      );
    }
  }

  return checked;
}

// ── Check: Absolute positioning in auto-layout ──

function checkAbsoluteInAutoLayout(parent: FrameNode, issues: LintIssue[]): number {
  if (!hasAutoLayout(parent as unknown as SceneNode)) return 0;
  if (!('children' in parent)) return 0;

  let checked = 0;

  for (const child of parent.children as SceneNode[]) {
    if (child.visible === false) continue;

    const frame = child as unknown as Record<string, unknown>;
    const positioning = frame['layoutPositioning'] as string | undefined;

    if (positioning === 'ABSOLUTE') {
      checked++;
      pushIssue(
        issues,
        'info',
        child.id,
        child.name,
        `Absolute positioning inside auto-layout parent "${parent.name}" — verify this is intentional`,
        'layoutPositioning: ABSOLUTE',
        ['Remove absolute positioning or confirm intentional overlay'],
      );
    }
  }

  return checked;
}

// ── Check: Missing min/max constraints on FILL-sized frames ──

function checkMissingMinMax(node: SceneNode, issues: LintIssue[]): number {
  if (!isFrameLike(node)) return 0;

  const frame = node as unknown as Record<string, unknown>;
  const primaryMode = (frame['primaryAxisSizingMode'] as string) ?? undefined;
  const counterMode = (frame['counterAxisSizingMode'] as string) ?? undefined;

  let checked = 0;

  if (primaryMode === 'FILL' || counterMode === 'FILL') {
    checked++;

    const minW = (frame['minWidth'] as number | undefined) ?? null;
    const maxW = (frame['maxWidth'] as number | undefined) ?? null;
    const minH = (frame['minHeight'] as number | undefined) ?? null;
    const maxH = (frame['maxHeight'] as number | undefined) ?? null;

    const hasWidthConstraint = (minW !== null && minW > 0) || (maxW !== null && maxW < Infinity && maxW > 0);
    const hasHeightConstraint = (minH !== null && minH > 0) || (maxH !== null && maxH < Infinity && maxH > 0);

    if (primaryMode === 'FILL' && !hasWidthConstraint && !hasHeightConstraint) {
      pushIssue(
        issues,
        'info',
        node.id,
        node.name,
        `FILL sizing without min/max constraints — frame may collapse or overflow`,
        'FILL, no min/max',
        ['Add minWidth/maxWidth or minHeight/maxHeight'],
      );
    } else if (counterMode === 'FILL' && !hasWidthConstraint && !hasHeightConstraint) {
      pushIssue(
        issues,
        'info',
        node.id,
        node.name,
        `FILL counter-axis sizing without min/max constraints — frame may collapse or overflow`,
        'FILL (counter), no min/max',
        ['Add minWidth/maxWidth or minHeight/maxHeight'],
      );
    }
  }

  return checked;
}

// ── Recursive traversal ─────────────────────────

interface TraversalStats {
  totalChecked: number;
  inconsistentSizing: number;
  fixedInAutoLayout: number;
  layoutGrowMismatch: number;
  absoluteInAutoLayout: number;
  missingConstraints: number;
}

function traverse(
  node: SceneNode,
  issues: LintIssue[],
  skipLocked: boolean,
  skipHidden: boolean,
  parentLocked: boolean,
): TraversalStats {
  const isLocked = parentLocked || ('locked' in node && (node as any).locked);
  const isHidden = 'visible' in node && !node.visible;

  if (skipLocked && isLocked) return emptyStats();
  if (skipHidden && isHidden) return emptyStats();

  const stats: TraversalStats = emptyStats();

  if (isFrameLike(node)) {
    const frame = asFrame(node);

    const preInconsistent = issues.length;
    stats.totalChecked += checkInconsistentSizing(frame, issues);
    stats.inconsistentSizing += issues.length - preInconsistent;

    const preFixed = issues.length;
    stats.totalChecked += checkFixedInAutoLayout(frame, issues);
    stats.fixedInAutoLayout += issues.length - preFixed;

    const preGrow = issues.length;
    stats.totalChecked += checkLayoutGrowMismatch(frame, issues);
    stats.layoutGrowMismatch += issues.length - preGrow;

    const preAbsolute = issues.length;
    stats.totalChecked += checkAbsoluteInAutoLayout(frame, issues);
    stats.absoluteInAutoLayout += issues.length - preAbsolute;

    const preMinMax = issues.length;
    stats.totalChecked += checkMissingMinMax(node, issues);
    stats.missingConstraints += issues.length - preMinMax;
  }

  // Recurse into children
  if ('children' in node) {
    for (const child of (node as any).children as SceneNode[]) {
      const sub = traverse(child, issues, skipLocked, skipHidden, isLocked);
      stats.totalChecked += sub.totalChecked;
      stats.inconsistentSizing += sub.inconsistentSizing;
      stats.fixedInAutoLayout += sub.fixedInAutoLayout;
      stats.layoutGrowMismatch += sub.layoutGrowMismatch;
      stats.absoluteInAutoLayout += sub.absoluteInAutoLayout;
      stats.missingConstraints += sub.missingConstraints;
    }
  }

  return stats;
}

function emptyStats(): TraversalStats {
  return {
    totalChecked: 0,
    inconsistentSizing: 0,
    fixedInAutoLayout: 0,
    layoutGrowMismatch: 0,
    absoluteInAutoLayout: 0,
    missingConstraints: 0,
  };
}

// ── Public API ──────────────────────────────────

/**
 * Run layout sizing audit on the given nodes.
 * Checks sizing mode consistency, FIXED-in-auto-layout, layoutGrow mismatches,
 * absolute positioning in auto-layout, and missing min/max constraints.
 */
export function checkLayoutSizing(
  nodes: readonly SceneNode[],
  opts?: { settings?: { skipLockedLayers?: boolean; skipHiddenLayers?: boolean } },
): LayoutSizingLintResult {
  const skipLocked = opts?.settings?.skipLockedLayers ?? true;
  const skipHidden = opts?.settings?.skipHiddenLayers ?? true;
  issueCounter = 0;

  const issues: LintIssue[] = [];
  const totals = emptyStats();

  for (const node of nodes) {
    const sub = traverse(node, issues, skipLocked, skipHidden, false);
    totals.totalChecked += sub.totalChecked;
    totals.inconsistentSizing += sub.inconsistentSizing;
    totals.fixedInAutoLayout += sub.fixedInAutoLayout;
    totals.layoutGrowMismatch += sub.layoutGrowMismatch;
    totals.absoluteInAutoLayout += sub.absoluteInAutoLayout;
    totals.missingConstraints += sub.missingConstraints;
  }

  return {
    issues,
    summary: {
      totalChecked: totals.totalChecked,
      inconsistentSizing: totals.inconsistentSizing,
      fixedInAutoLayout: totals.fixedInAutoLayout,
      layoutGrowMismatch: totals.layoutGrowMismatch,
      absoluteInAutoLayout: totals.absoluteInAutoLayout,
      missingConstraints: totals.missingConstraints,
    },
  };
}

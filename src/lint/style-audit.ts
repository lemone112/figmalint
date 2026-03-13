/// <reference types="@figma/plugin-typings" />

import { LintIssue, LintSeverity } from './types';

// ──────────────────────────────────────────────
// Style Library Audit Module
//
// Deterministic checks for paint/text/effect style usage:
// - Orphaned local styles (defined but unused)
// - Hard-coded color matching an existing style
// - Style applied but overridden (fillStyleId set but fill differs)
// - Duplicate styles (identical color values)
//
// NOTE: This module is async because it uses
// figma.getLocalPaintStylesAsync() and related APIs.
// ──────────────────────────────────────────────

let issueCounter = 0;
function nextId(): string {
  return `style-audit-${++issueCounter}`;
}

export interface StyleAuditLintResult {
  issues: LintIssue[];
  summary: {
    totalChecked: number;
    orphanedStyles: number;
    hardCodedMatches: number;
    overriddenStyles: number;
    duplicateStyles: number;
  };
}

// ── Helpers ─────────────────────────────────────

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
    type: 'fill',
    severity,
    nodeId,
    nodeName,
    message,
    currentValue,
    suggestions,
    autoFixable: false,
  });
}

/**
 * Convert RGB float (0-1) to a 6-digit hex string for comparison.
 */
function rgbKey(r: number, g: number, b: number, opacity?: number): string {
  const ri = Math.round(r * 255);
  const gi = Math.round(g * 255);
  const bi = Math.round(b * 255);
  const hex = `#${ri.toString(16).padStart(2, '0')}${gi.toString(16).padStart(2, '0')}${bi.toString(16).padStart(2, '0')}`;
  if (opacity !== undefined && opacity < 1) {
    return `${hex} @ ${Math.round(opacity * 100)}%`;
  }
  return hex;
}

/**
 * Extract the first solid color key from a paints array.
 */
function firstSolidColorKey(paints: Paint[]): string | null {
  const solid = paints.find(p => p.type === 'SOLID' && p.visible !== false);
  if (!solid || solid.type !== 'SOLID') return null;
  const sp = solid as SolidPaint;
  return rgbKey(sp.color.r, sp.color.g, sp.color.b, solid.opacity);
}

// ── Style type abstraction (for local style APIs) ──

interface LocalPaintStyle {
  id: string;
  name: string;
  paints: Paint[];
}

interface LocalTextStyle {
  id: string;
  name: string;
}

interface LocalEffectStyle {
  id: string;
  name: string;
}

/**
 * Safely call an async Figma API that may not exist in older plugin versions.
 */
async function safeGetLocalPaintStyles(): Promise<LocalPaintStyle[]> {
  try {
    const api = figma as any;
    if (typeof api.getLocalPaintStylesAsync === 'function') {
      return await api.getLocalPaintStylesAsync();
    }
    if (typeof api.getLocalPaintStyles === 'function') {
      return api.getLocalPaintStyles();
    }
  } catch {
    // API not available
  }
  return [];
}

async function safeGetLocalTextStyles(): Promise<LocalTextStyle[]> {
  try {
    const api = figma as any;
    if (typeof api.getLocalTextStylesAsync === 'function') {
      return await api.getLocalTextStylesAsync();
    }
    if (typeof api.getLocalTextStyles === 'function') {
      return api.getLocalTextStyles();
    }
  } catch {
    // API not available
  }
  return [];
}

async function safeGetLocalEffectStyles(): Promise<LocalEffectStyle[]> {
  try {
    const api = figma as any;
    if (typeof api.getLocalEffectStylesAsync === 'function') {
      return await api.getLocalEffectStylesAsync();
    }
    if (typeof api.getLocalEffectStyles === 'function') {
      return api.getLocalEffectStyles();
    }
  } catch {
    // API not available
  }
  return [];
}

// ── Collect all nodes recursively ──

function collectAllNodes(
  node: SceneNode,
  skipLocked: boolean,
  skipHidden: boolean,
  parentLocked: boolean,
): SceneNode[] {
  const isLocked = parentLocked || ('locked' in node && (node as any).locked);
  const isHidden = 'visible' in node && !node.visible;

  if (skipLocked && isLocked) return [];
  if (skipHidden && isHidden) return [];

  const result: SceneNode[] = [node];

  if ('children' in node) {
    for (const child of (node as any).children as SceneNode[]) {
      result.push(...collectAllNodes(child, skipLocked, skipHidden, isLocked));
    }
  }

  return result;
}

// ── Check: Orphaned local styles ──

function checkOrphanedStyles(
  paintStyles: LocalPaintStyle[],
  textStyles: LocalTextStyle[],
  effectStyles: LocalEffectStyle[],
  allNodes: SceneNode[],
  issues: LintIssue[],
): number {
  let count = 0;

  // Collect all style IDs referenced by nodes
  const usedStyleIds = new Set<string>();
  for (const node of allNodes) {
    const n = node as any;
    if (n.fillStyleId && typeof n.fillStyleId === 'string' && n.fillStyleId !== '') {
      usedStyleIds.add(n.fillStyleId);
    }
    if (n.strokeStyleId && typeof n.strokeStyleId === 'string' && n.strokeStyleId !== '') {
      usedStyleIds.add(n.strokeStyleId);
    }
    if (n.textStyleId && typeof n.textStyleId === 'string' && n.textStyleId !== '') {
      usedStyleIds.add(n.textStyleId);
    }
    if (n.effectStyleId && typeof n.effectStyleId === 'string' && n.effectStyleId !== '') {
      usedStyleIds.add(n.effectStyleId);
    }
  }

  // Check paint styles
  for (const style of paintStyles) {
    if (!usedStyleIds.has(style.id)) {
      count++;
      pushIssue(
        issues,
        'info',
        style.id,
        style.name,
        `Paint style "${style.name}" is defined but not used by any visible node`,
        'Orphaned paint style',
        ['Remove unused style or apply it to a node'],
      );
    }
  }

  // Check text styles
  for (const style of textStyles) {
    if (!usedStyleIds.has(style.id)) {
      count++;
      pushIssue(
        issues,
        'info',
        style.id,
        style.name,
        `Text style "${style.name}" is defined but not used by any visible node`,
        'Orphaned text style',
        ['Remove unused style or apply it to a node'],
      );
    }
  }

  // Check effect styles
  for (const style of effectStyles) {
    if (!usedStyleIds.has(style.id)) {
      count++;
      pushIssue(
        issues,
        'info',
        style.id,
        style.name,
        `Effect style "${style.name}" is defined but not used by any visible node`,
        'Orphaned effect style',
        ['Remove unused style or apply it to a node'],
      );
    }
  }

  return count;
}

// ── Check: Hard-coded color matching an existing style ──

function checkHardCodedColorMatch(
  node: SceneNode,
  paintStyleColorMap: Map<string, string[]>,
  issues: LintIssue[],
): boolean {
  if (!('fills' in node)) return false;

  const fills = (node as any).fills;
  if (fills === figma.mixed || !Array.isArray(fills)) return false;

  // Skip if a fill style is already applied
  const fillStyleId = (node as any).fillStyleId;
  if (fillStyleId && typeof fillStyleId === 'string' && fillStyleId !== '') {
    return false;
  }

  // Skip if bound to a variable
  try {
    const bv = (node as any).boundVariables;
    if (bv?.fills) return false;
  } catch {
    // ignore
  }

  const colorKey = firstSolidColorKey(fills);
  if (!colorKey) return false;

  const matchingStyles = paintStyleColorMap.get(colorKey);
  if (matchingStyles && matchingStyles.length > 0) {
    pushIssue(
      issues,
      'warning',
      node.id,
      node.name,
      `Fill color ${colorKey} matches paint style "${matchingStyles[0]}" but is not linked`,
      colorKey,
      matchingStyles.map(s => `Apply style "${s}"`),
    );
    return true;
  }

  return false;
}

// ── Check: Style applied but overridden ──

function checkStyleOverridden(
  node: SceneNode,
  paintStyleMap: Map<string, LocalPaintStyle>,
  issues: LintIssue[],
): boolean {
  if (!('fills' in node)) return false;

  const fillStyleId = (node as any).fillStyleId;
  if (!fillStyleId || typeof fillStyleId !== 'string' || fillStyleId === '') {
    return false;
  }

  const style = paintStyleMap.get(fillStyleId);
  if (!style) return false;

  const nodeFills = (node as any).fills;
  if (nodeFills === figma.mixed || !Array.isArray(nodeFills)) return false;

  const nodeColorKey = firstSolidColorKey(nodeFills);
  const styleColorKey = firstSolidColorKey(style.paints);

  // Only flag if both have solid colors and they differ
  if (nodeColorKey && styleColorKey && nodeColorKey !== styleColorKey) {
    pushIssue(
      issues,
      'warning',
      node.id,
      node.name,
      `Fill style "${style.name}" is applied but overridden — node fill ${nodeColorKey} differs from style ${styleColorKey}`,
      `${nodeColorKey} (node) vs ${styleColorKey} (style)`,
      ['Reset fill to style definition', 'Detach style and keep override'],
    );
    return true;
  }

  return false;
}

// ── Check: Duplicate styles ──

function checkDuplicateStyles(
  paintStyles: LocalPaintStyle[],
  issues: LintIssue[],
): number {
  const colorToStyles = new Map<string, LocalPaintStyle[]>();

  for (const style of paintStyles) {
    const key = firstSolidColorKey(style.paints);
    if (!key) continue;

    if (!colorToStyles.has(key)) colorToStyles.set(key, []);
    colorToStyles.get(key)!.push(style);
  }

  let count = 0;
  for (const [colorKey, styles] of colorToStyles) {
    if (styles.length < 2) continue;

    // Report the second and subsequent duplicates
    for (let i = 1; i < styles.length; i++) {
      count++;
      const dupeNames = styles.map(s => s.name).join(', ');
      pushIssue(
        issues,
        'info',
        styles[i].id,
        styles[i].name,
        `Paint style "${styles[i].name}" has the same color (${colorKey}) as "${styles[0].name}" — possible duplicate`,
        `${colorKey} shared by: ${dupeNames}`,
        [`Merge into "${styles[0].name}"`, 'Verify they serve different purposes'],
      );
    }
  }

  return count;
}

// ── Public API ──────────────────────────────────

/**
 * Run style library audit on the given nodes.
 * Async — uses figma.getLocalPaintStylesAsync() and related APIs.
 *
 * Checks: orphaned styles, hard-coded color matches, overridden styles,
 * and duplicate paint styles.
 */
export async function checkStyleAudit(
  nodes: readonly SceneNode[],
  opts?: { settings?: { skipLockedLayers?: boolean; skipHiddenLayers?: boolean } },
): Promise<StyleAuditLintResult> {
  const skipLocked = opts?.settings?.skipLockedLayers ?? true;
  const skipHidden = opts?.settings?.skipHiddenLayers ?? true;
  issueCounter = 0;

  const issues: LintIssue[] = [];
  const summary = {
    totalChecked: 0,
    orphanedStyles: 0,
    hardCodedMatches: 0,
    overriddenStyles: 0,
    duplicateStyles: 0,
  };

  // Fetch local styles
  const [paintStyles, textStyles, effectStyles] = await Promise.all([
    safeGetLocalPaintStyles(),
    safeGetLocalTextStyles(),
    safeGetLocalEffectStyles(),
  ]);

  // If no local styles exist, there is nothing to audit
  if (paintStyles.length === 0 && textStyles.length === 0 && effectStyles.length === 0) {
    return { issues, summary };
  }

  // Collect all visible nodes from the input tree
  const allNodes: SceneNode[] = [];
  for (const node of nodes) {
    allNodes.push(...collectAllNodes(node, skipLocked, skipHidden, false));
  }

  summary.totalChecked = allNodes.length;

  // Build lookup maps for paint styles
  const paintStyleMap = new Map<string, LocalPaintStyle>();
  const paintStyleColorMap = new Map<string, string[]>();

  for (const style of paintStyles) {
    paintStyleMap.set(style.id, style);

    const colorKey = firstSolidColorKey(style.paints);
    if (colorKey) {
      if (!paintStyleColorMap.has(colorKey)) paintStyleColorMap.set(colorKey, []);
      paintStyleColorMap.get(colorKey)!.push(style.name);
    }
  }

  // 1. Orphaned styles
  summary.orphanedStyles = checkOrphanedStyles(paintStyles, textStyles, effectStyles, allNodes, issues);

  // 2 & 3. Per-node checks
  for (const node of allNodes) {
    if (checkHardCodedColorMatch(node, paintStyleColorMap, issues)) {
      summary.hardCodedMatches++;
    }
    if (checkStyleOverridden(node, paintStyleMap, issues)) {
      summary.overriddenStyles++;
    }
  }

  // 4. Duplicate styles
  summary.duplicateStyles = checkDuplicateStyles(paintStyles, issues);

  return { issues, summary };
}

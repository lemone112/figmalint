/// <reference types="@figma/plugin-typings" />

import { LintIssue, DEFAULT_SPACING_SCALE } from './types';

// ──────────────────────────────────────────────
// Grid System Check Module
//
// Deterministic checks for grid usage across frames:
// - No grid on top-level frames
// - Inconsistent grid columns across top-level frames
// - Grid not from a style (hard-coded)
// - Grid gutter mismatch with spacing scale
// ──────────────────────────────────────────────

let issueCounter = 0;
function nextId(): string {
  return `grid-${++issueCounter}`;
}

export interface GridCheckLintResult {
  issues: LintIssue[];
  summary: {
    totalFrames: number;
    framesWithGrid: number;
    framesWithoutGrid: number;
    inconsistentColumns: number;
    hardCodedGrids: number;
    gutterMismatches: number;
  };
}

// ── Helpers ──

interface GridInfo {
  pattern: string;
  count?: number;
  gutterSize?: number;
  alignment?: string;
  sectionSize?: number;
  offset?: number;
}

/**
 * Extract grid info from a layout grid, guarding all property access.
 */
function extractGridInfo(grid: unknown): GridInfo | null {
  if (!grid || typeof grid !== 'object') return null;

  const g = grid as Record<string, unknown>;
  const pattern = g.pattern as string | undefined;

  if (!pattern) return null;

  // Skip invisible grids
  if (g.visible === false) return null;

  const info: GridInfo = { pattern };

  if (pattern === 'COLUMNS' || pattern === 'ROWS') {
    if (typeof g.count === 'number') info.count = g.count;
    if (typeof g.gutterSize === 'number') info.gutterSize = g.gutterSize;
    if (typeof g.alignment === 'string') info.alignment = g.alignment;
    if (typeof g.sectionSize === 'number') info.sectionSize = g.sectionSize;
    if (typeof g.offset === 'number') info.offset = g.offset;
  } else if (pattern === 'GRID') {
    if (typeof g.sectionSize === 'number') info.sectionSize = g.sectionSize;
  }

  return info;
}

/**
 * Determine whether a frame is "top-level" — direct child of the page.
 * In Figma, a top-level frame's parent is the page (PageNode),
 * or it may be a direct child of the root selection.
 */
function isTopLevelFrame(node: SceneNode): boolean {
  const parent = node.parent;
  if (!parent) return true;

  // PageNode type check — in the Figma API, page nodes have type "PAGE"
  const parentType = (parent as any).type;
  if (parentType === 'PAGE') return true;

  // Also treat SECTION children as top-level for grid purposes
  if (parentType === 'SECTION') return true;

  return false;
}

// ── Check functions ──

function checkNoGridOnTopLevel(
  node: SceneNode,
  issues: LintIssue[]
): boolean {
  const layoutGrids = (node as any).layoutGrids as unknown[] | undefined;

  if (!Array.isArray(layoutGrids) || layoutGrids.length === 0) {
    issues.push({
      id: nextId(),
      type: 'spacing',
      severity: 'info',
      nodeId: node.id,
      nodeName: node.name,
      message: `Top-level frame "${node.name}" has no layout grid attached`,
      currentValue: 'No grid',
      suggestions: ['Add a layout grid for consistent alignment'],
      autoFixable: false,
    });
    return false; // no grid
  }

  // Check if any grids are visible
  const visibleGrids = layoutGrids.filter(g => {
    if (!g || typeof g !== 'object') return false;
    return (g as Record<string, unknown>).visible !== false;
  });

  if (visibleGrids.length === 0) {
    issues.push({
      id: nextId(),
      type: 'spacing',
      severity: 'info',
      nodeId: node.id,
      nodeName: node.name,
      message: `Top-level frame "${node.name}" has layout grids but all are hidden`,
      currentValue: `${layoutGrids.length} hidden grid(s)`,
      suggestions: ['Enable at least one layout grid for development reference'],
      autoFixable: false,
    });
    return false;
  }

  return true;
}

function checkGridNotFromStyle(
  node: SceneNode,
  localGridStyleIds: Set<string>,
  issues: LintIssue[]
): void {
  const layoutGrids = (node as any).layoutGrids as unknown[] | undefined;
  if (!Array.isArray(layoutGrids) || layoutGrids.length === 0) return;

  const gridStyleId = (node as any).gridStyleId as string | undefined;

  // If no style is applied but grids exist, it's hard-coded
  if (!gridStyleId || gridStyleId === '') {
    issues.push({
      id: nextId(),
      type: 'spacing',
      severity: 'info',
      nodeId: node.id,
      nodeName: node.name,
      message: `Frame "${node.name}" has a hard-coded layout grid (not from a grid style)`,
      currentValue: 'Hard-coded grid',
      suggestions: ['Create a grid style and apply it for consistency across frames'],
      autoFixable: false,
    });
  } else if (localGridStyleIds.size > 0 && !localGridStyleIds.has(gridStyleId)) {
    // Style ID exists but doesn't match any local style — may be from a library
    // This is fine, don't flag it
  }
}

function checkGridGutterMismatch(
  node: SceneNode,
  spacingScale: readonly number[],
  issues: LintIssue[]
): void {
  const layoutGrids = (node as any).layoutGrids as unknown[] | undefined;
  if (!Array.isArray(layoutGrids)) return;

  for (const grid of layoutGrids) {
    const info = extractGridInfo(grid);
    if (!info) continue;

    if (info.gutterSize !== undefined && !spacingScale.includes(info.gutterSize)) {
      issues.push({
        id: nextId(),
        type: 'spacing',
        severity: 'info',
        nodeId: node.id,
        nodeName: node.name,
        message: `Grid gutter ${info.gutterSize}px on "${node.name}" is not in the spacing scale [${spacingScale.join(', ')}]`,
        currentValue: `${info.gutterSize}px gutter`,
        suggestions: spacingScale
          .filter(v => Math.abs(v - (info.gutterSize ?? 0)) <= 8)
          .map(v => `${v}px`),
        autoFixable: false,
      });
    }
  }
}

// ── Collection and traversal ──

function collectTopLevelFrames(
  nodes: readonly SceneNode[],
  skipLocked: boolean,
  skipHidden: boolean
): SceneNode[] {
  const result: SceneNode[] = [];

  function walk(node: SceneNode, parentLocked: boolean): void {
    const isLocked = parentLocked || ('locked' in node && (node as any).locked === true);
    const isHidden = 'visible' in node && !node.visible;

    if (skipLocked && isLocked) return;
    if (skipHidden && isHidden) return;

    if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
      if (isTopLevelFrame(node)) {
        result.push(node);
      }
    }

    // If this is a SECTION, look inside for top-level frames
    if (node.type === 'SECTION' || (!isTopLevelFrame(node) && 'children' in node)) {
      // Only recurse into sections and non-top-level containers to find top-level frames
    }

    // For the initial selection, recurse to find frames that are page-level children
    if ('children' in node) {
      const children = (node as any).children;
      if (Array.isArray(children)) {
        for (const child of children as SceneNode[]) {
          // Only recurse if the current node is a section or page-like container
          const nodeType = node.type;
          if (nodeType === 'SECTION' || nodeType === 'GROUP') {
            walk(child, isLocked);
          }
        }
      }
    }
  }

  // For the root selection, treat each selected node as potentially top-level
  for (const node of nodes) {
    if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
      result.push(node);
    } else if ('children' in node) {
      const children = (node as any).children;
      if (Array.isArray(children)) {
        for (const child of children as SceneNode[]) {
          walk(child, false);
        }
      }
    }
  }

  return result;
}

function checkInconsistentColumns(
  frames: SceneNode[],
  issues: LintIssue[]
): void {
  // Collect column counts from frames with COLUMNS grids
  const columnCounts: Array<{ nodeId: string; nodeName: string; count: number }> = [];

  for (const frame of frames) {
    const layoutGrids = (frame as any).layoutGrids as unknown[] | undefined;
    if (!Array.isArray(layoutGrids)) continue;

    for (const grid of layoutGrids) {
      const info = extractGridInfo(grid);
      if (!info || info.pattern !== 'COLUMNS') continue;

      if (info.count !== undefined && isFinite(info.count)) {
        columnCounts.push({
          nodeId: frame.id,
          nodeName: frame.name,
          count: info.count,
        });
      }
    }
  }

  if (columnCounts.length < 2) return;

  // Check for inconsistency
  const uniqueCounts = [...new Set(columnCounts.map(c => c.count))];
  if (uniqueCounts.length <= 1) return;

  // Find the most common column count
  const countFreq = new Map<number, number>();
  for (const { count } of columnCounts) {
    countFreq.set(count, (countFreq.get(count) ?? 0) + 1);
  }

  let mostCommonCount = uniqueCounts[0];
  let maxFreq = 0;
  for (const [count, freq] of countFreq) {
    if (freq > maxFreq) {
      mostCommonCount = count;
      maxFreq = freq;
    }
  }

  // Flag frames that deviate from the most common count
  for (const entry of columnCounts) {
    if (entry.count !== mostCommonCount) {
      issues.push({
        id: nextId(),
        type: 'spacing',
        severity: 'warning',
        nodeId: entry.nodeId,
        nodeName: entry.nodeName,
        message: `Frame "${entry.nodeName}" uses ${entry.count}-column grid while most frames use ${mostCommonCount} columns`,
        currentValue: `${entry.count} columns`,
        suggestions: [`Change to ${mostCommonCount} columns for consistency`],
        autoFixable: false,
      });
    }
  }
}

// ── Async grid style fetching ──

async function getLocalGridStyleIds(): Promise<Set<string>> {
  try {
    const api = figma as any;
    let styles: Array<{ id: string }> = [];

    if (typeof api.getLocalGridStylesAsync === 'function') {
      styles = await (api.getLocalGridStylesAsync as () => Promise<Array<{ id: string }>>)();
    } else if (typeof api.getLocalGridStyles === 'function') {
      styles = (api.getLocalGridStyles as () => Array<{ id: string }>)();
    }

    return new Set((styles ?? []).map(s => s.id));
  } catch {
    return new Set();
  }
}

// ── Public API ──

export async function checkGrid(
  nodes: readonly SceneNode[],
  options: {
    skipLocked?: boolean;
    skipHidden?: boolean;
    spacingScale?: readonly number[];
  } = {}
): Promise<GridCheckLintResult> {
  const { skipLocked = true, skipHidden = true, spacingScale = DEFAULT_SPACING_SCALE } = options;
  issueCounter = 0;

  const issues: LintIssue[] = [];

  // 1. Collect top-level frames
  const topFrames = collectTopLevelFrames(nodes, skipLocked, skipHidden);

  // 2. Fetch local grid styles
  const localGridStyleIds = await getLocalGridStyleIds();

  // 3. Per-frame checks
  let framesWithGrid = 0;

  for (const frame of topFrames) {
    const hasGrid = checkNoGridOnTopLevel(frame, issues);
    if (hasGrid) {
      framesWithGrid++;
      checkGridNotFromStyle(frame, localGridStyleIds, issues);
      checkGridGutterMismatch(frame, spacingScale, issues);
    }
  }

  // 4. Cross-frame consistency check
  checkInconsistentColumns(topFrames, issues);

  return {
    issues,
    summary: {
      totalFrames: topFrames.length,
      framesWithGrid,
      framesWithoutGrid: topFrames.length - framesWithGrid,
      inconsistentColumns: issues.filter(i => i.message.includes('column grid while')).length,
      hardCodedGrids: issues.filter(i => i.message.includes('hard-coded')).length,
      gutterMismatches: issues.filter(i => i.message.includes('gutter')).length,
    },
  };
}

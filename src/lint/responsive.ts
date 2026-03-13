/// <reference types="@figma/plugin-typings" />

import { LintIssue } from './types';

// ──────────────────────────────────────────────
// Responsive Design Lint Module
//
// Deterministic checks for responsive design issues:
// - Fixed-width elements without fill sizing
// - Text truncation risk (fixed width + long content)
// - Missing wrap on multi-column layouts
// - Breakpoint variant detection
// ──────────────────────────────────────────────

let issueCounter = 0;
function nextId(): string {
  return `resp-${++issueCounter}`;
}

export interface ResponsiveResult {
  issues: LintIssue[];
  metrics: {
    fixedWidthElements: number;
    textTruncationRisk: number;
    missingAutoLayout: number;
    breakpointVariants: string[];
  };
  summary: { totalChecked: number; passed: number; failed: number };
}

// ── Breakpoint detection patterns ──────────────────────
const BREAKPOINT_PATTERNS = [
  // "Home - Desktop", "Home - Tablet", "Home - Mobile"
  /^(.+)\s*[-–—]\s*(desktop|tablet|mobile|phone|sm|md|lg|xl|xxl|small|medium|large)\s*$/i,
  // "Home/desktop", "Home/mobile"
  /^(.+)\/(desktop|tablet|mobile|phone|sm|md|lg|xl|xxl|small|medium|large)\s*$/i,
  // "Desktop/Home", "Mobile/Home"
  /^(desktop|tablet|mobile|phone|sm|md|lg|xl|xxl|small|medium|large)\s*[-–—/]\s*(.+)$/i,
  // "Home [Desktop]", "Home [Mobile]"
  /^(.+)\s*\[(desktop|tablet|mobile|phone|sm|md|lg|xl|xxl|small|medium|large)\]\s*$/i,
];

const BREAKPOINT_KEYWORDS = new Set([
  'desktop', 'tablet', 'mobile', 'phone',
  'sm', 'md', 'lg', 'xl', 'xxl',
  'small', 'medium', 'large',
]);

/** Average character width ratio relative to font size (rough heuristic). */
const AVG_CHAR_WIDTH_RATIO = 0.5;

// ── Helpers ──────────────────────────────────

function isFrameLike(node: SceneNode): node is FrameNode | ComponentNode | InstanceNode {
  return node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE';
}

function detectBreakpointLabel(name: string): string | null {
  for (const pattern of BREAKPOINT_PATTERNS) {
    const match = name.match(pattern);
    if (match) {
      // Return the breakpoint keyword that matched
      for (const group of match.slice(1)) {
        if (BREAKPOINT_KEYWORDS.has(group.toLowerCase())) {
          return group.toLowerCase();
        }
      }
    }
  }
  return null;
}

// ── Checks ──────────────────────────────────

function checkFixedWidth(
  node: SceneNode,
  issues: LintIssue[],
  skipLocked: boolean,
  skipHidden: boolean,
  parentLocked: boolean,
): { checked: number; failed: number; fixedWidthCount: number } {
  const isLocked = parentLocked || ('locked' in node && (node as any).locked);
  const isHidden = 'visible' in node && !node.visible;

  if (skipLocked && isLocked) return { checked: 0, failed: 0, fixedWidthCount: 0 };
  if (skipHidden && isHidden) return { checked: 0, failed: 0, fixedWidthCount: 0 };

  let checked = 0;
  let failed = 0;
  let fixedWidthCount = 0;

  if (isFrameLike(node)) {
    const frame = node as FrameNode;
    checked++;

    // Check if this frame has explicit width but no fill sizing and no auto-layout parent handling
    const hasFixedWidth = frame.layoutSizingHorizontal === 'FIXED' || frame.layoutSizingHorizontal === undefined;
    const isRootLevel = !frame.parent || frame.parent.type === 'PAGE';
    const hasAutoLayout = frame.layoutMode !== 'NONE';
    const hasMinMax = ('minWidth' in frame && frame.minWidth !== null && frame.minWidth !== undefined) ||
                      ('maxWidth' in frame && frame.maxWidth !== null && frame.maxWidth !== undefined);

    if (hasFixedWidth && !isRootLevel && !hasMinMax && hasAutoLayout && frame.width > 200) {
      fixedWidthCount++;
      failed++;
      issues.push({
        id: nextId(),
        type: 'responsive',
        severity: 'warning',
        nodeId: node.id,
        nodeName: node.name,
        message: `Frame "${node.name}" has fixed width (${Math.round(frame.width)}px) with auto-layout but no fill/hug sizing — may not adapt to different screen sizes`,
        currentValue: `${Math.round(frame.width)}px fixed`,
        suggestions: [
          'Set horizontal sizing to "Fill" for responsive behavior',
          'Add min-width/max-width constraints',
          'Use "Hug contents" if the frame should shrink-wrap',
        ],
        autoFixable: false,
      });
    }
  }

  // Recurse
  if ('children' in node) {
    for (const child of (node as any).children as SceneNode[]) {
      const sub = checkFixedWidth(child, issues, skipLocked, skipHidden, isLocked);
      checked += sub.checked;
      failed += sub.failed;
      fixedWidthCount += sub.fixedWidthCount;
    }
  }

  return { checked, failed, fixedWidthCount };
}

function checkTextTruncation(
  node: SceneNode,
  issues: LintIssue[],
  skipLocked: boolean,
  skipHidden: boolean,
  parentLocked: boolean,
): { checked: number; failed: number; riskCount: number } {
  const isLocked = parentLocked || ('locked' in node && (node as any).locked);
  const isHidden = 'visible' in node && !node.visible;

  if (skipLocked && isLocked) return { checked: 0, failed: 0, riskCount: 0 };
  if (skipHidden && isHidden) return { checked: 0, failed: 0, riskCount: 0 };

  let checked = 0;
  let failed = 0;
  let riskCount = 0;

  if (node.type === 'TEXT') {
    const textNode = node as TextNode;
    checked++;

    const fontSize = textNode.fontSize !== figma.mixed ? textNode.fontSize : 14;
    const textResize = textNode.textAutoResize;

    // Only check text nodes with fixed width (not auto-width or auto-height)
    if (textResize === 'NONE' || textResize === 'TRUNCATE') {
      const charCount = textNode.characters.length;
      const estimatedTextWidth = charCount * (fontSize as number) * AVG_CHAR_WIDTH_RATIO;
      const nodeWidth = textNode.width;

      // Flag if text fills > 80% of available width
      if (charCount > 5 && estimatedTextWidth > nodeWidth * 0.8) {
        riskCount++;
        failed++;
        issues.push({
          id: nextId(),
          type: 'responsive',
          severity: 'info',
          nodeId: node.id,
          nodeName: node.name,
          message: `Text "${node.name}" may truncate — content fills ~${Math.round((estimatedTextWidth / nodeWidth) * 100)}% of fixed width (${Math.round(nodeWidth)}px). Translations or dynamic content could overflow.`,
          currentValue: `${charCount} chars in ${Math.round(nodeWidth)}px`,
          suggestions: [
            'Use auto-width or auto-height text resizing',
            'Allow text to wrap by setting textAutoResize to HEIGHT',
            'Add ellipsis handling if truncation is intentional',
          ],
          autoFixable: false,
        });
      }
    }
  }

  // Recurse
  if ('children' in node) {
    for (const child of (node as any).children as SceneNode[]) {
      const sub = checkTextTruncation(child, issues, skipLocked, skipHidden, isLocked);
      checked += sub.checked;
      failed += sub.failed;
      riskCount += sub.riskCount;
    }
  }

  return { checked, failed, riskCount };
}

function checkMissingWrap(
  node: SceneNode,
  issues: LintIssue[],
  skipLocked: boolean,
  skipHidden: boolean,
  parentLocked: boolean,
): { checked: number; failed: number; missingCount: number } {
  const isLocked = parentLocked || ('locked' in node && (node as any).locked);
  const isHidden = 'visible' in node && !node.visible;

  if (skipLocked && isLocked) return { checked: 0, failed: 0, missingCount: 0 };
  if (skipHidden && isHidden) return { checked: 0, failed: 0, missingCount: 0 };

  let checked = 0;
  let failed = 0;
  let missingCount = 0;

  if (isFrameLike(node)) {
    const frame = node as FrameNode;

    // Check horizontal auto-layout with 3+ children and no wrap
    if (frame.layoutMode === 'HORIZONTAL' && 'children' in frame) {
      const visibleChildren = frame.children.filter(c => 'visible' in c && c.visible);

      if (visibleChildren.length >= 3) {
        checked++;

        const layoutWrap = ('layoutWrap' in frame) ? (frame as any).layoutWrap : 'NO_WRAP';
        if (layoutWrap !== 'WRAP') {
          missingCount++;
          failed++;
          issues.push({
            id: nextId(),
            type: 'responsive',
            severity: 'warning',
            nodeId: node.id,
            nodeName: node.name,
            message: `Horizontal layout "${node.name}" has ${visibleChildren.length} children without wrap — content won't reflow on smaller screens`,
            currentValue: `${visibleChildren.length} children, no wrap`,
            suggestions: [
              'Enable "Wrap" on the auto-layout to allow content reflow',
              'Consider switching to vertical layout on mobile breakpoints',
              'Use min-width on children to control when wrapping occurs',
            ],
            autoFixable: false,
          });
        }
      }
    }
  }

  // Recurse
  if ('children' in node) {
    for (const child of (node as any).children as SceneNode[]) {
      const sub = checkMissingWrap(child, issues, skipLocked, skipHidden, isLocked);
      checked += sub.checked;
      failed += sub.failed;
      missingCount += sub.missingCount;
    }
  }

  return { checked, failed, missingCount };
}

function detectBreakpointVariants(
  nodes: readonly SceneNode[],
): string[] {
  const variantNames: Set<string> = new Set();

  for (const node of nodes) {
    collectBreakpointVariantNames(node, variantNames);
  }

  return Array.from(variantNames);
}

function collectBreakpointVariantNames(
  node: SceneNode,
  results: Set<string>,
): void {
  const label = detectBreakpointLabel(node.name);
  if (label) {
    results.add(node.name);
  }

  if ('children' in node) {
    // Only check top-level frames (direct children of pages) for breakpoint variants
    for (const child of (node as any).children as SceneNode[]) {
      const childLabel = detectBreakpointLabel(child.name);
      if (childLabel) {
        results.add(child.name);
      }
    }
  }
}

// ── Public API ──────────────────────────────────

export function checkResponsive(
  nodes: readonly SceneNode[],
  opts?: { skipLocked?: boolean; skipHidden?: boolean },
): ResponsiveResult {
  issueCounter = 0;
  const issues: LintIssue[] = [];
  const skipLocked = opts?.skipLocked ?? true;
  const skipHidden = opts?.skipHidden ?? true;

  let totalChecked = 0;
  let totalFailed = 0;
  let totalFixedWidth = 0;
  let totalTruncation = 0;
  let totalMissingWrap = 0;

  for (const node of nodes) {
    const fw = checkFixedWidth(node, issues, skipLocked, skipHidden, false);
    totalChecked += fw.checked;
    totalFailed += fw.failed;
    totalFixedWidth += fw.fixedWidthCount;

    const tt = checkTextTruncation(node, issues, skipLocked, skipHidden, false);
    totalChecked += tt.checked;
    totalFailed += tt.failed;
    totalTruncation += tt.riskCount;

    const mw = checkMissingWrap(node, issues, skipLocked, skipHidden, false);
    totalChecked += mw.checked;
    totalFailed += mw.failed;
    totalMissingWrap += mw.missingCount;
  }

  const breakpointVariants = detectBreakpointVariants(nodes);

  return {
    issues,
    metrics: {
      fixedWidthElements: totalFixedWidth,
      textTruncationRisk: totalTruncation,
      missingAutoLayout: totalMissingWrap,
      breakpointVariants,
    },
    summary: {
      totalChecked,
      passed: totalChecked - totalFailed,
      failed: totalFailed,
    },
  };
}

/// <reference types="@figma/plugin-typings" />

import { LintIssue } from './types';

// ──────────────────────────────────────────────
// Cognitive Accessibility Lint Module
//
// Deterministic checks for cognitive load:
// - Information overload (too many nav items)
// - Choice overload (too many CTAs)
// - Heading hierarchy gaps
// - Disabled elements without visible reason
// - Excessive nesting depth
// - Icon-only buttons without labels
// ──────────────────────────────────────────────

let issueCounter = 0;
function nextId(): string {
  return `cog-${++issueCounter}`;
}

export interface CognitiveLintResult {
  issues: LintIssue[];
  metrics: {
    navItemCount: number;
    ctaCount: number;
    maxNestingDepth: number;
    headingLevels: number[];
    iconOnlyButtons: number;
  };
  summary: {
    totalChecked: number;
    passed: number;
    failed: number;
  };
}

const NAV_RE = /nav|menu|sidebar|tab.?bar|bottom.?bar|header.?nav|navigation|top.?bar/i;
const NAV_ITEM_RE = /nav.?item|menu.?item|tab(?!le)|link/i;
const CTA_RE = /button|btn|cta|action|submit|primary/i;
const HEADING_RE = /heading|title|h[1-6]|headline/i;
const DISABLED_RE = /disabled|inactive|dimmed|greyed/i;
const ICON_RE = /icon|ico|svg|glyph/i;

// ── Helpers ──────────────────────────────────

function isNavContainer(node: SceneNode): boolean {
  return NAV_RE.test(node.name);
}

function isNavItem(node: SceneNode): boolean {
  return NAV_ITEM_RE.test(node.name);
}

function isCTA(node: SceneNode): boolean {
  return CTA_RE.test(node.name);
}

function isHeading(node: SceneNode): boolean {
  return HEADING_RE.test(node.name);
}

function isDisabled(node: SceneNode): boolean {
  return DISABLED_RE.test(node.name);
}

function isIconOnly(node: SceneNode): boolean {
  if (!ICON_RE.test(node.name) && !CTA_RE.test(node.name)) return false;
  if (!('children' in node)) return false;
  const children = (node as any).children as SceneNode[];
  // Has children that are all non-text (icons/vectors) with no text sibling
  const hasText = children.some((c: SceneNode) => c.type === 'TEXT');
  const hasIcon = children.some((c: SceneNode) =>
    c.type === 'VECTOR' || c.type === 'BOOLEAN_OPERATION' || ICON_RE.test(c.name)
  );
  return hasIcon && !hasText;
}

// ── Collectors ──────────────────────────────────

function collectNavItems(
  node: SceneNode,
  results: SceneNode[],
  skipLocked: boolean,
  skipHidden: boolean,
): void {
  if (skipLocked && 'locked' in node && (node as any).locked) return;
  if (skipHidden && 'visible' in node && !node.visible) return;

  if (isNavItem(node)) {
    results.push(node);
    return; // Don't recurse into nav items
  }

  if ('children' in node) {
    for (const child of (node as any).children) {
      collectNavItems(child, results, skipLocked, skipHidden);
    }
  }
}

function collectCTAs(
  node: SceneNode,
  results: SceneNode[],
  skipLocked: boolean,
  skipHidden: boolean,
): void {
  if (skipLocked && 'locked' in node && (node as any).locked) return;
  if (skipHidden && 'visible' in node && !node.visible) return;

  if (isCTA(node)) {
    results.push(node);
  }

  if ('children' in node) {
    for (const child of (node as any).children) {
      collectCTAs(child, results, skipLocked, skipHidden);
    }
  }
}

function extractHeadingLevel(name: string): number | null {
  const match = name.match(/h(\d)/i);
  if (match) return parseInt(match[1], 10);
  if (/title|headline/i.test(name)) return 1;
  if (/subtitle|subhead/i.test(name)) return 2;
  if (/heading/i.test(name)) return 2;
  return null;
}

function collectHeadings(
  node: SceneNode,
  results: Array<{ node: SceneNode; level: number }>,
  skipLocked: boolean,
  skipHidden: boolean,
): void {
  if (skipLocked && 'locked' in node && (node as any).locked) return;
  if (skipHidden && 'visible' in node && !node.visible) return;

  if (isHeading(node)) {
    const level = extractHeadingLevel(node.name);
    if (level !== null) {
      results.push({ node, level });
    }
  }

  if ('children' in node) {
    for (const child of (node as any).children) {
      collectHeadings(child, results, skipLocked, skipHidden);
    }
  }
}

function measureNestingDepth(
  node: SceneNode,
  currentDepth: number,
  skipLocked: boolean,
  skipHidden: boolean,
): number {
  if (skipLocked && 'locked' in node && (node as any).locked) return currentDepth;
  if (skipHidden && 'visible' in node && !node.visible) return currentDepth;

  let max = currentDepth;
  if ('children' in node) {
    for (const child of (node as any).children) {
      const childDepth = measureNestingDepth(child, currentDepth + 1, skipLocked, skipHidden);
      if (childDepth > max) max = childDepth;
    }
  }
  return max;
}

function collectDisabledElements(
  node: SceneNode,
  results: SceneNode[],
  skipLocked: boolean,
  skipHidden: boolean,
): void {
  if (skipLocked && 'locked' in node && (node as any).locked) return;
  if (skipHidden && 'visible' in node && !node.visible) return;

  if (isDisabled(node) && ('opacity' in node && (node as any).opacity < 1)) {
    results.push(node);
  }

  if ('children' in node) {
    for (const child of (node as any).children) {
      collectDisabledElements(child, results, skipLocked, skipHidden);
    }
  }
}

function collectIconOnlyButtons(
  node: SceneNode,
  results: SceneNode[],
  skipLocked: boolean,
  skipHidden: boolean,
): void {
  if (skipLocked && 'locked' in node && (node as any).locked) return;
  if (skipHidden && 'visible' in node && !node.visible) return;

  if (isCTA(node) && isIconOnly(node)) {
    results.push(node);
  }

  if ('children' in node) {
    for (const child of (node as any).children) {
      collectIconOnlyButtons(child, results, skipLocked, skipHidden);
    }
  }
}

// ── Checks ──────────────────────────────────

function checkNavItemOverload(
  frame: SceneNode,
  issues: LintIssue[],
  skipLocked: boolean,
  skipHidden: boolean,
): number {
  // Find nav containers and count their items
  const navContainers: SceneNode[] = [];
  findNavContainers(frame, navContainers, skipLocked, skipHidden);

  let totalNavItems = 0;

  for (const nav of navContainers) {
    const items: SceneNode[] = [];
    collectNavItems(nav, items, skipLocked, skipHidden);
    totalNavItems += items.length;

    if (items.length > 7) {
      issues.push({
        id: nextId(),
        type: 'accessibility',
        severity: 'warning',
        nodeId: nav.id,
        nodeName: nav.name,
        message: `Navigation has ${items.length} items — Miller's Law suggests 7±2 is the working memory limit. Consider grouping or progressive disclosure.`,
        currentValue: `${items.length} nav items`,
        suggestions: [
          'Group related items under expandable sections',
          'Use "More" menu for less-used items',
          'Limit primary navigation to 5-7 items',
        ],
        autoFixable: false,
      });
    }
  }

  return totalNavItems;
}

function findNavContainers(
  node: SceneNode,
  results: SceneNode[],
  skipLocked: boolean,
  skipHidden: boolean,
): void {
  if (skipLocked && 'locked' in node && (node as any).locked) return;
  if (skipHidden && 'visible' in node && !node.visible) return;

  if (isNavContainer(node)) {
    results.push(node);
    return; // Don't recurse into nav containers
  }

  if ('children' in node) {
    for (const child of (node as any).children) {
      findNavContainers(child, results, skipLocked, skipHidden);
    }
  }
}

function checkCTAOverload(
  frame: SceneNode,
  issues: LintIssue[],
  skipLocked: boolean,
  skipHidden: boolean,
): number {
  const ctas: SceneNode[] = [];
  collectCTAs(frame, ctas, skipLocked, skipHidden);

  if (ctas.length > 5) {
    issues.push({
      id: nextId(),
      type: 'accessibility',
      severity: 'warning',
      nodeId: frame.id,
      nodeName: frame.name,
      message: `${ctas.length} CTAs/buttons on one screen — choice overload reduces decision-making ability (Hick's Law). Prioritize one primary action.`,
      currentValue: `${ctas.length} CTAs`,
      suggestions: [
        'Establish clear primary/secondary/tertiary action hierarchy',
        'Reduce to 1 primary CTA per viewport',
        'Group related actions in a dropdown or overflow menu',
      ],
      autoFixable: false,
    });
  }

  return ctas.length;
}

function checkHeadingHierarchy(
  frame: SceneNode,
  issues: LintIssue[],
  skipLocked: boolean,
  skipHidden: boolean,
): number[] {
  const headings: Array<{ node: SceneNode; level: number }> = [];
  collectHeadings(frame, headings, skipLocked, skipHidden);

  if (headings.length < 2) return headings.map(h => h.level);

  // Sort by position (top to bottom)
  const sorted = headings.sort((a, b) => {
    const aY = 'y' in a.node ? (a.node as any).y : 0;
    const bY = 'y' in b.node ? (b.node as any).y : 0;
    return aY - bY;
  });

  // Check for hierarchy gaps (e.g., h1 → h3 skipping h2)
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].level;
    const curr = sorted[i].level;
    if (curr > prev + 1) {
      issues.push({
        id: nextId(),
        type: 'accessibility',
        severity: 'info',
        nodeId: sorted[i].node.id,
        nodeName: sorted[i].node.name,
        message: `Heading hierarchy gap: jumps from level ${prev} to level ${curr}. Screen readers and users rely on sequential heading structure.`,
        currentValue: `h${prev} → h${curr}`,
        suggestions: [
          `Add an h${prev + 1} between these levels`,
          'Ensure headings follow a logical descending order',
        ],
        autoFixable: false,
      });
    }
  }

  return sorted.map(h => h.level);
}

function checkDisabledWithoutReason(
  frame: SceneNode,
  issues: LintIssue[],
  skipLocked: boolean,
  skipHidden: boolean,
): void {
  const disabled: SceneNode[] = [];
  collectDisabledElements(frame, disabled, skipLocked, skipHidden);

  for (const node of disabled) {
    // Check if there's a nearby text node explaining why it's disabled
    const parent = node.parent;
    let hasExplanation = false;
    if (parent && 'children' in parent) {
      for (const sibling of (parent as any).children) {
        if (sibling.type === 'TEXT' && sibling.id !== node.id) {
          const text = (sibling as TextNode).characters?.toLowerCase() || '';
          if (text.includes('required') || text.includes('complete') || text.includes('fill') || text.includes('select') || text.includes('first')) {
            hasExplanation = true;
            break;
          }
        }
      }
    }

    if (!hasExplanation) {
      issues.push({
        id: nextId(),
        type: 'accessibility',
        severity: 'info',
        nodeId: node.id,
        nodeName: node.name,
        message: `Disabled element "${node.name}" without visible explanation. Users should understand WHY an action is unavailable and how to enable it.`,
        suggestions: [
          'Add helper text explaining what needs to happen first',
          'Use a tooltip on hover explaining the disabled state',
          'Show a brief inline message (e.g., "Complete all fields to continue")',
        ],
        autoFixable: false,
      });
    }
  }
}

function checkIconOnlyButtons(
  frame: SceneNode,
  issues: LintIssue[],
  skipLocked: boolean,
  skipHidden: boolean,
): number {
  const iconButtons: SceneNode[] = [];
  collectIconOnlyButtons(frame, iconButtons, skipLocked, skipHidden);

  if (iconButtons.length > 3) {
    issues.push({
      id: nextId(),
      type: 'accessibility',
      severity: 'info',
      nodeId: frame.id,
      nodeName: frame.name,
      message: `${iconButtons.length} icon-only buttons without text labels. Icons alone are ambiguous — add labels or ensure tooltips are present.`,
      currentValue: `${iconButtons.length} icon-only`,
      suggestions: [
        'Add visible text labels to icon buttons',
        'Add tooltips that appear on hover/focus',
        'Use aria-label for accessibility (ensure design indicates this)',
      ],
      autoFixable: false,
    });
  }

  return iconButtons.length;
}

// ── Public API ──────────────────────────────────

export function checkCognitive(
  nodes: readonly SceneNode[],
  options: { skipLocked?: boolean; skipHidden?: boolean } = {},
): CognitiveLintResult {
  issueCounter = 0;
  const issues: LintIssue[] = [];
  const skipLocked = options.skipLocked ?? true;
  const skipHidden = options.skipHidden ?? true;

  let totalNavItems = 0;
  let totalCTAs = 0;
  let maxDepth = 0;
  let allHeadingLevels: number[] = [];
  let totalIconOnly = 0;
  let totalChecked = 0;

  for (const node of nodes) {
    totalNavItems += checkNavItemOverload(node, issues, skipLocked, skipHidden);
    totalChecked++;

    totalCTAs += checkCTAOverload(node, issues, skipLocked, skipHidden);
    totalChecked++;

    const levels = checkHeadingHierarchy(node, issues, skipLocked, skipHidden);
    allHeadingLevels = [...allHeadingLevels, ...levels];
    totalChecked++;

    checkDisabledWithoutReason(node, issues, skipLocked, skipHidden);
    totalChecked++;

    totalIconOnly += checkIconOnlyButtons(node, issues, skipLocked, skipHidden);
    totalChecked++;

    const depth = measureNestingDepth(node, 0, skipLocked, skipHidden);
    if (depth > maxDepth) maxDepth = depth;
  }

  return {
    issues,
    metrics: {
      navItemCount: totalNavItems,
      ctaCount: totalCTAs,
      maxNestingDepth: maxDepth,
      headingLevels: [...new Set(allHeadingLevels)].sort(),
      iconOnlyButtons: totalIconOnly,
    },
    summary: {
      totalChecked,
      passed: totalChecked - issues.length,
      failed: issues.length,
    },
  };
}

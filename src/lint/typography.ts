/// <reference types="@figma/plugin-typings" />

import { LintIssue, LintSeverity } from './types';

// ──────────────────────────────────────────────
// Typography Compliance Module
//
// Deterministic checks for text properties:
// - Inconsistent textAlignHorizontal within same component
// - Non-standard letterSpacing on body text
// - UPPERCASE without letterSpacing
// - Missing paragraphSpacing on multi-block layouts
// - Non-standard lineHeight ratio
// - textDecoration on non-link text
// ──────────────────────────────────────────────

let issueCounter = 0;
function nextId(): string {
  return `typo-${++issueCounter}`;
}

export interface TypographyLintResult {
  issues: LintIssue[];
  summary: {
    totalChecked: number;
    inconsistentAlignment: number;
    nonStandardLetterSpacing: number;
    uppercaseMissingSpacing: number;
    missingParagraphSpacing: number;
    badLineHeightRatio: number;
    suspiciousDecoration: number;
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
    type: 'textStyle',
    severity,
    nodeId,
    nodeName,
    message,
    currentValue,
    suggestions,
    autoFixable: false,
  });
}

function isFrameLike(node: SceneNode): boolean {
  return node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE';
}

/**
 * Heuristic: names suggesting a link pattern.
 */
const LINK_PATTERN = /\b(link|anchor|href|url|nav-link|breadcrumb|hyperlink)\b/i;

function isLikelyLink(node: SceneNode): boolean {
  if (LINK_PATTERN.test(node.name)) return true;
  // Check parent name too
  if (node.parent && 'name' in node.parent) {
    return LINK_PATTERN.test((node.parent as SceneNode).name);
  }
  return false;
}

// ── Collect text nodes within a component/frame ──

function collectTextNodes(node: SceneNode): TextNode[] {
  const texts: TextNode[] = [];
  if (node.type === 'TEXT') {
    texts.push(node as TextNode);
  }
  if ('children' in node) {
    for (const child of (node as any).children as SceneNode[]) {
      texts.push(...collectTextNodes(child));
    }
  }
  return texts;
}

// ── Check: Inconsistent textAlignHorizontal within same component ──

function checkInconsistentAlignment(
  parent: SceneNode,
  issues: LintIssue[],
): number {
  if (!isFrameLike(parent)) return 0;

  const textNodes = collectTextNodes(parent);
  if (textNodes.length < 2) return 0;

  // Only check body-size text (ignore headings/large text which may differ)
  const bodyTexts = textNodes.filter(t => {
    const fs = t.fontSize;
    return typeof fs === 'number' && fs <= 18;
  });
  if (bodyTexts.length < 2) return 0;

  const alignments = new Map<string, TextNode[]>();
  for (const t of bodyTexts) {
    const align = t.textAlignHorizontal ?? 'LEFT';
    if (!alignments.has(align)) alignments.set(align, []);
    alignments.get(align)!.push(t);
  }

  if (alignments.size <= 1) return 0;

  // Find majority alignment
  let maxCount = 0;
  let majorityAlign = 'LEFT';
  for (const [align, nodes] of alignments) {
    if (nodes.length > maxCount) {
      maxCount = nodes.length;
      majorityAlign = align;
    }
  }

  let checked = 0;
  for (const [align, nodes] of alignments) {
    if (align !== majorityAlign) {
      for (const t of nodes) {
        checked++;
        pushIssue(
          issues,
          'info',
          t.id,
          t.name,
          `Text alignment "${align}" differs from majority body text alignment "${majorityAlign}" in "${parent.name}"`,
          align,
          [majorityAlign],
        );
      }
    }
  }

  return checked;
}

// ── Check: Non-standard letterSpacing on body text ──

function checkBodyLetterSpacing(
  node: TextNode,
  issues: LintIssue[],
): boolean {
  const fontSize = node.fontSize;
  if (typeof fontSize !== 'number' || fontSize > 16) return false;

  const ls = (node as any).letterSpacing;
  if (!ls || ls === figma.mixed) return false;

  const value = typeof ls === 'object' ? ls.value : undefined;
  if (typeof value !== 'number' || value === 0) return false;

  pushIssue(
    issues,
    'info',
    node.id,
    node.name,
    `Body text (${fontSize}px) has non-zero letterSpacing (${value}${ls.unit === 'PERCENT' ? '%' : 'px'}) — unusual for body text`,
    `${value}${ls.unit === 'PERCENT' ? '%' : 'px'}`,
    ['0px (default)', 'Remove letterSpacing for body text'],
  );

  return true;
}

// ── Check: UPPERCASE without letterSpacing ──

function checkUppercaseSpacing(
  node: TextNode,
  issues: LintIssue[],
): boolean {
  const textCase = (node as any).textCase;
  if (textCase !== 'UPPER' && textCase !== 'ORIGINAL') {
    // Only check explicit UPPER
  }
  if (textCase !== 'UPPER') return false;

  const ls = (node as any).letterSpacing;
  const value = ls && typeof ls === 'object' ? ls.value : 0;

  if (typeof value === 'number' && value <= 0) {
    pushIssue(
      issues,
      'info',
      node.id,
      node.name,
      `UPPERCASE text without positive letterSpacing — add spacing for readability`,
      `textCase: UPPER, letterSpacing: ${value}`,
      ['letterSpacing: 0.5px', 'letterSpacing: 1px', 'letterSpacing: 2%'],
    );
    return true;
  }

  return false;
}

// ── Check: Missing paragraphSpacing ──

function checkParagraphSpacing(
  parent: SceneNode,
  issues: LintIssue[],
): number {
  if (!isFrameLike(parent)) return 0;

  const textNodes = collectTextNodes(parent);
  // Only flag when there are multiple text blocks
  if (textNodes.length < 2) return 0;

  let checked = 0;
  let missingCount = 0;

  for (const t of textNodes) {
    const ps = (t as any).paragraphSpacing;
    if (typeof ps === 'number' && ps === 0) {
      missingCount++;
    }
    checked++;
  }

  // Only flag if ALL text blocks lack paragraph spacing
  if (missingCount === textNodes.length && missingCount >= 2) {
    pushIssue(
      issues,
      'info',
      parent.id,
      parent.name,
      `${missingCount} text blocks without paragraphSpacing set — add spacing for better readability`,
      `${missingCount} texts, all paragraphSpacing: 0`,
      ['Set paragraphSpacing to match line height or spacing scale'],
    );
  }

  return checked;
}

// ── Check: Non-standard lineHeight ratio ──

function checkLineHeightRatio(
  node: TextNode,
  issues: LintIssue[],
): boolean {
  const fontSize = node.fontSize;
  if (typeof fontSize !== 'number' || fontSize === 0) return false;

  const lh = node.lineHeight;
  if (!lh || lh === figma.mixed) return false;

  let lineHeightPx: number | null = null;

  if (typeof lh === 'object' && 'unit' in lh) {
    if (lh.unit === 'PIXELS') {
      lineHeightPx = lh.value;
    } else if (lh.unit === 'PERCENT') {
      lineHeightPx = (lh.value / 100) * fontSize;
    } else if (lh.unit === 'AUTO') {
      // AUTO line height is handled by the engine, skip
      return false;
    }
  }

  if (lineHeightPx === null || lineHeightPx === 0) return false;

  const ratio = lineHeightPx / fontSize;

  if (ratio < 1.2) {
    pushIssue(
      issues,
      'warning',
      node.id,
      node.name,
      `Line height ratio ${ratio.toFixed(2)} (${Math.round(lineHeightPx)}px / ${fontSize}px) is below 1.2 — text may be cramped`,
      `${ratio.toFixed(2)} ratio`,
      ['1.2 (minimum)', '1.4 (comfortable)', '1.5 (spacious)'],
    );
    return true;
  }

  if (ratio > 2.0) {
    pushIssue(
      issues,
      'info',
      node.id,
      node.name,
      `Line height ratio ${ratio.toFixed(2)} (${Math.round(lineHeightPx)}px / ${fontSize}px) exceeds 2.0 — may be unintentional`,
      `${ratio.toFixed(2)} ratio`,
      ['1.4 (body)', '1.2 (heading)', '1.6 (loose)'],
    );
    return true;
  }

  return false;
}

// ── Check: textDecoration on non-link text ──

function checkSuspiciousDecoration(
  node: TextNode,
  issues: LintIssue[],
): boolean {
  const decoration = (node as any).textDecoration;
  if (decoration !== 'UNDERLINE') return false;

  // If the node or parent looks like a link, skip
  if (isLikelyLink(node)) return false;

  pushIssue(
    issues,
    'info',
    node.id,
    node.name,
    `Underline decoration on text that does not appear to be a link — may confuse users`,
    'textDecoration: UNDERLINE',
    ['Remove underline or rename layer to indicate link purpose'],
  );

  return true;
}

// ── Recursive traversal ─────────────────────────

interface TraversalStats {
  totalChecked: number;
  inconsistentAlignment: number;
  nonStandardLetterSpacing: number;
  uppercaseMissingSpacing: number;
  missingParagraphSpacing: number;
  badLineHeightRatio: number;
  suspiciousDecoration: number;
}

function emptyStats(): TraversalStats {
  return {
    totalChecked: 0,
    inconsistentAlignment: 0,
    nonStandardLetterSpacing: 0,
    uppercaseMissingSpacing: 0,
    missingParagraphSpacing: 0,
    badLineHeightRatio: 0,
    suspiciousDecoration: 0,
  };
}

function traverse(
  node: SceneNode,
  issues: LintIssue[],
  skipLocked: boolean,
  skipHidden: boolean,
  parentLocked: boolean,
  seenComponents: Set<string>,
): TraversalStats {
  const isLocked = parentLocked || ('locked' in node && (node as any).locked);
  const isHidden = 'visible' in node && !node.visible;

  if (skipLocked && isLocked) return emptyStats();
  if (skipHidden && isHidden) return emptyStats();

  const stats = emptyStats();

  // Per-text-node checks
  if (node.type === 'TEXT') {
    const textNode = node as TextNode;
    stats.totalChecked++;

    if (checkBodyLetterSpacing(textNode, issues)) stats.nonStandardLetterSpacing++;
    if (checkUppercaseSpacing(textNode, issues)) stats.uppercaseMissingSpacing++;
    if (checkLineHeightRatio(textNode, issues)) stats.badLineHeightRatio++;
    if (checkSuspiciousDecoration(textNode, issues)) stats.suspiciousDecoration++;
  }

  // Per-component/frame checks (run once per unique component)
  if (isFrameLike(node)) {
    const nodeId = node.id;
    if (!seenComponents.has(nodeId)) {
      seenComponents.add(nodeId);

      const preAlign = issues.length;
      stats.totalChecked += checkInconsistentAlignment(node, issues);
      stats.inconsistentAlignment += issues.length - preAlign;

      const preParagraph = issues.length;
      const paragraphChecked = checkParagraphSpacing(node, issues);
      stats.totalChecked += paragraphChecked;
      stats.missingParagraphSpacing += issues.length - preParagraph;
    }
  }

  // Recurse into children
  if ('children' in node) {
    for (const child of (node as any).children as SceneNode[]) {
      const sub = traverse(child, issues, skipLocked, skipHidden, isLocked, seenComponents);
      stats.totalChecked += sub.totalChecked;
      stats.inconsistentAlignment += sub.inconsistentAlignment;
      stats.nonStandardLetterSpacing += sub.nonStandardLetterSpacing;
      stats.uppercaseMissingSpacing += sub.uppercaseMissingSpacing;
      stats.missingParagraphSpacing += sub.missingParagraphSpacing;
      stats.badLineHeightRatio += sub.badLineHeightRatio;
      stats.suspiciousDecoration += sub.suspiciousDecoration;
    }
  }

  return stats;
}

// ── Public API ──────────────────────────────────

/**
 * Run typography compliance checks on the given nodes.
 * Checks text alignment consistency, letterSpacing, UPPERCASE spacing,
 * paragraph spacing, line height ratio, and suspicious underline decoration.
 */
export function checkTypography(
  nodes: readonly SceneNode[],
  opts?: { settings?: { skipLockedLayers?: boolean; skipHiddenLayers?: boolean } },
): TypographyLintResult {
  const skipLocked = opts?.settings?.skipLockedLayers ?? true;
  const skipHidden = opts?.settings?.skipHiddenLayers ?? true;
  issueCounter = 0;

  const issues: LintIssue[] = [];
  const seenComponents = new Set<string>();
  const totals = emptyStats();

  for (const node of nodes) {
    const sub = traverse(node, issues, skipLocked, skipHidden, false, seenComponents);
    totals.totalChecked += sub.totalChecked;
    totals.inconsistentAlignment += sub.inconsistentAlignment;
    totals.nonStandardLetterSpacing += sub.nonStandardLetterSpacing;
    totals.uppercaseMissingSpacing += sub.uppercaseMissingSpacing;
    totals.missingParagraphSpacing += sub.missingParagraphSpacing;
    totals.badLineHeightRatio += sub.badLineHeightRatio;
    totals.suspiciousDecoration += sub.suspiciousDecoration;
  }

  return {
    issues,
    summary: {
      totalChecked: totals.totalChecked,
      inconsistentAlignment: totals.inconsistentAlignment,
      nonStandardLetterSpacing: totals.nonStandardLetterSpacing,
      uppercaseMissingSpacing: totals.uppercaseMissingSpacing,
      missingParagraphSpacing: totals.missingParagraphSpacing,
      badLineHeightRatio: totals.badLineHeightRatio,
      suspiciousDecoration: totals.suspiciousDecoration,
    },
  };
}

/// <reference types="@figma/plugin-typings" />

import { LintIssue, LintSeverity } from './types';
import { rgbToHex } from '../utils/figma-helpers';

// ──────────────────────────────────────────────
// Visual Quality Lint Module
//
// Deterministic checks for visual design quality:
// - Whitespace ratio (content density)
// - Typography rhythm (font size scale adherence)
// - Line height ratio
// - Color palette count
// - Alignment grid adherence
// - Button/CTA size consistency
// ──────────────────────────────────────────────

export type VisualQualityIssueType =
  | 'density'
  | 'typographyRhythm'
  | 'lineHeight'
  | 'colorCount'
  | 'alignment'
  | 'sizeConsistency';

let issueCounter = 0;
function nextId(): string {
  return `vq-${++issueCounter}`;
}

export interface VisualQualityLintResult {
  issues: LintIssue[];
  metrics: {
    childCount: number;
    areaPx: number;
    density: number;
    uniqueFontSizes: number[];
    lineHeightRatios: Array<{ fontSize: number; lineHeight: number; ratio: number }>;
    uniqueColors: string[];
    misalignedCount: number;
  };
  summary: {
    totalChecked: number;
    passed: number;
    failed: number;
  };
}

// ── Standard typography scale (major third — 1.25x ratio) ──
const STANDARD_TYPE_SCALES: readonly number[][] = [
  [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72],  // common UI sizes
  [12, 14, 16, 20, 24, 32, 40, 48],                                 // Material 3
  [12, 14, 16, 18, 21, 24, 30, 36, 48, 60, 72],                    // Tailwind
];

function isOnAnyScale(size: number): boolean {
  return STANDARD_TYPE_SCALES.some(scale => scale.includes(size));
}

// ── Checks ──────────────────────────────────────

function checkDensity(
  frame: FrameNode | ComponentNode | InstanceNode,
  issues: LintIssue[],
): void {
  const area = frame.width * frame.height;
  if (area === 0) return;

  // Count direct children only (top-level elements)
  const visibleChildren = ('children' in frame)
    ? (frame.children as readonly SceneNode[]).filter(c => c.visible !== false)
    : [];

  const childCount = visibleChildren.length;
  const density = (childCount / area) * 1000; // elements per 1000px²

  if (density > 3.0) {
    issues.push({
      id: nextId(),
      type: 'accessibility', // mapped to visual quality in orchestrator
      severity: 'warning',
      nodeId: frame.id,
      nodeName: frame.name,
      message: `High visual density: ${childCount} elements in ${Math.round(area / 1000)}k px² (${density.toFixed(2)}/1000px²). Consider simplifying or using progressive disclosure.`,
      currentValue: `${density.toFixed(2)} elements/1000px²`,
      suggestions: ['Reduce visible elements to under 15 per viewport', 'Group related items', 'Use progressive disclosure'],
      autoFixable: false,
    });
  }
}

function collectFontSizes(
  node: SceneNode,
  sizes: Set<number>,
  lineHeightData: Array<{ fontSize: number; lineHeight: number; ratio: number }>,
  skipLocked: boolean,
  skipHidden: boolean,
): void {
  if (skipLocked && 'locked' in node && (node as any).locked) return;
  if (skipHidden && 'visible' in node && !node.visible) return;

  if (node.type === 'TEXT') {
    const textNode = node as TextNode;
    const fs = textNode.fontSize;
    if (fs !== figma.mixed && typeof fs === 'number') {
      sizes.add(fs);

      // Check line height ratio
      const lh = textNode.lineHeight;
      if (lh !== figma.mixed && typeof lh === 'object' && lh.unit === 'PIXELS') {
        const ratio = lh.value / fs;
        lineHeightData.push({ fontSize: fs, lineHeight: lh.value, ratio });
      }
    }
  }

  if ('children' in node) {
    for (const child of (node as any).children) {
      collectFontSizes(child, sizes, lineHeightData, skipLocked, skipHidden);
    }
  }
}

function checkTypographyRhythm(
  frame: SceneNode,
  issues: LintIssue[],
  skipLocked: boolean,
  skipHidden: boolean,
): { sizes: number[]; lineHeightData: Array<{ fontSize: number; lineHeight: number; ratio: number }> } {
  const sizes = new Set<number>();
  const lineHeightData: Array<{ fontSize: number; lineHeight: number; ratio: number }> = [];

  collectFontSizes(frame, sizes, lineHeightData, skipLocked, skipHidden);

  const sizeArr = Array.from(sizes).sort((a, b) => a - b);

  // Flag font sizes not on any standard scale
  const offScale = sizeArr.filter(s => !isOnAnyScale(s));
  if (offScale.length > 0) {
    issues.push({
      id: nextId(),
      type: 'accessibility',
      severity: 'info',
      nodeId: ('id' in frame) ? frame.id : '',
      nodeName: ('name' in frame) ? frame.name : '',
      message: `Non-standard font sizes: ${offScale.join(', ')}px. Consider using a type scale (e.g., 12/14/16/20/24/32).`,
      currentValue: offScale.map(s => `${s}px`).join(', '),
      suggestions: offScale.map(s => {
        const nearest = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48]
          .reduce((prev, curr) => Math.abs(curr - s) < Math.abs(prev - s) ? curr : prev);
        return `${s}px → ${nearest}px`;
      }),
      autoFixable: false,
    });
  }

  // Check line height ratios
  const badRatios = lineHeightData.filter(d => d.ratio < 1.2 || d.ratio > 2.0);
  if (badRatios.length > 0) {
    const worst = badRatios.reduce((prev, curr) =>
      Math.abs(curr.ratio - 1.5) > Math.abs(prev.ratio - 1.5) ? curr : prev
    );
    issues.push({
      id: nextId(),
      type: 'accessibility',
      severity: 'info',
      nodeId: ('id' in frame) ? frame.id : '',
      nodeName: ('name' in frame) ? frame.name : '',
      message: `Line height ratio ${worst.ratio.toFixed(2)} (${worst.lineHeight}px / ${worst.fontSize}px) is outside optimal range 1.3–1.6.`,
      currentValue: `${worst.ratio.toFixed(2)}`,
      suggestions: [
        `Set line height to ${Math.round(worst.fontSize * 1.5)}px (1.5× body) or ${Math.round(worst.fontSize * 1.3)}px (1.3× headings)`,
      ],
      autoFixable: false,
    });
  }

  return { sizes: sizeArr, lineHeightData };
}

function collectColors(
  node: SceneNode,
  colors: Set<string>,
  skipLocked: boolean,
  skipHidden: boolean,
): void {
  if (skipLocked && 'locked' in node && (node as any).locked) return;
  if (skipHidden && 'visible' in node && !node.visible) return;

  if ('fills' in node) {
    const fills = node.fills;
    if (fills !== figma.mixed && Array.isArray(fills)) {
      for (const fill of fills) {
        if (fill.visible !== false && fill.type === 'SOLID') {
          colors.add(rgbToHex(fill.color.r, fill.color.g, fill.color.b));
        }
      }
    }
  }

  if ('strokes' in node) {
    const strokes = (node as any).strokes as Paint[];
    if (Array.isArray(strokes)) {
      for (const stroke of strokes) {
        if ((stroke as any).visible !== false && stroke.type === 'SOLID') {
          colors.add(rgbToHex((stroke as SolidPaint).color.r, (stroke as SolidPaint).color.g, (stroke as SolidPaint).color.b));
        }
      }
    }
  }

  if ('children' in node) {
    for (const child of (node as any).children) {
      collectColors(child, colors, skipLocked, skipHidden);
    }
  }
}

function checkColorCount(
  frame: SceneNode,
  issues: LintIssue[],
  skipLocked: boolean,
  skipHidden: boolean,
): string[] {
  const colors = new Set<string>();
  collectColors(frame, colors, skipLocked, skipHidden);

  const colorArr = Array.from(colors);

  if (colorArr.length > 8) {
    issues.push({
      id: nextId(),
      type: 'accessibility',
      severity: 'warning',
      nodeId: ('id' in frame) ? frame.id : '',
      nodeName: ('name' in frame) ? frame.name : '',
      message: `${colorArr.length} unique colors detected. A cohesive palette typically uses 5–7 colors (primary, secondary, accent, neutrals).`,
      currentValue: `${colorArr.length} colors`,
      suggestions: ['Consolidate similar colors into design tokens', 'Limit palette to primary, secondary, accent, and 2-3 neutrals'],
      autoFixable: false,
    });
  }

  return colorArr;
}

function checkAlignment(
  frame: FrameNode | ComponentNode | InstanceNode,
  issues: LintIssue[],
  gridSize: number = 4,
): number {
  if (!('children' in frame)) return 0;

  const children = (frame.children as readonly SceneNode[]).filter(c => c.visible !== false);
  let misaligned = 0;

  for (const child of children) {
    if (!('x' in child) || !('y' in child)) continue;
    const x = child.x;
    const y = child.y;

    const xOff = Math.round(x) % gridSize;
    const yOff = Math.round(y) % gridSize;

    if (xOff !== 0 || yOff !== 0) {
      misaligned++;
    }
  }

  if (misaligned > 0 && misaligned / Math.max(children.length, 1) > 0.3) {
    issues.push({
      id: nextId(),
      type: 'accessibility',
      severity: 'info',
      nodeId: frame.id,
      nodeName: frame.name,
      message: `${misaligned}/${children.length} direct children are misaligned from ${gridSize}px grid.`,
      currentValue: `${misaligned} misaligned`,
      suggestions: [`Snap elements to ${gridSize}px grid for visual consistency`],
      autoFixable: false,
    });
  }

  return misaligned;
}

function collectButtonSizes(
  node: SceneNode,
  sizes: Array<{ nodeId: string; nodeName: string; width: number; height: number }>,
  skipLocked: boolean,
  skipHidden: boolean,
): void {
  if (skipLocked && 'locked' in node && (node as any).locked) return;
  if (skipHidden && 'visible' in node && !node.visible) return;

  const isButton = /button|btn|cta/i.test(node.name);
  if (isButton && 'width' in node && 'height' in node) {
    sizes.push({ nodeId: node.id, nodeName: node.name, width: node.width, height: node.height });
  }

  if ('children' in node) {
    for (const child of (node as any).children) {
      collectButtonSizes(child, sizes, skipLocked, skipHidden);
    }
  }
}

function checkSizeConsistency(
  frame: SceneNode,
  issues: LintIssue[],
  skipLocked: boolean,
  skipHidden: boolean,
): void {
  const buttons: Array<{ nodeId: string; nodeName: string; width: number; height: number }> = [];
  collectButtonSizes(frame, buttons, skipLocked, skipHidden);

  if (buttons.length < 2) return;

  const heights = buttons.map(b => b.height);
  const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
  const maxDeviation = Math.max(...heights.map(h => Math.abs(h - avgHeight)));
  const deviationPct = (maxDeviation / avgHeight) * 100;

  if (deviationPct > 15) {
    const smallest = Math.min(...heights);
    const largest = Math.max(...heights);
    issues.push({
      id: nextId(),
      type: 'accessibility',
      severity: 'warning',
      nodeId: ('id' in frame) ? frame.id : '',
      nodeName: ('name' in frame) ? frame.name : '',
      message: `Button height inconsistency: ${smallest}px to ${largest}px (${Math.round(deviationPct)}% variance). Standardize to 2-3 size tiers.`,
      currentValue: `${smallest}–${largest}px`,
      suggestions: ['Use consistent button heights: 32px (small), 40px (medium), 48px (large)'],
      autoFixable: false,
    });
  }
}

// ── Public API ──────────────────────────────────

export function checkVisualQuality(
  nodes: readonly SceneNode[],
  options: { skipLocked?: boolean; skipHidden?: boolean } = {},
): VisualQualityLintResult {
  issueCounter = 0;
  const issues: LintIssue[] = [];
  const skipLocked = options.skipLocked ?? true;
  const skipHidden = options.skipHidden ?? true;

  let totalChecked = 0;
  let allSizes: number[] = [];
  let allLineHeightData: Array<{ fontSize: number; lineHeight: number; ratio: number }> = [];
  let allColors: string[] = [];
  let totalMisaligned = 0;
  let totalChildren = 0;
  let totalArea = 0;

  for (const node of nodes) {
    // Density check (top-level frames only)
    if ('children' in node && 'width' in node && 'height' in node) {
      checkDensity(node as FrameNode, issues);
      totalChildren += (node as any).children.length;
      totalArea += (node as any).width * (node as any).height;
      totalChecked++;
    }

    // Typography rhythm + line height
    const typo = checkTypographyRhythm(node, issues, skipLocked, skipHidden);
    allSizes = [...new Set([...allSizes, ...typo.sizes])];
    allLineHeightData = [...allLineHeightData, ...typo.lineHeightData];
    totalChecked++;

    // Color count
    const colors = checkColorCount(node, issues, skipLocked, skipHidden);
    allColors = [...new Set([...allColors, ...colors])];
    totalChecked++;

    // Alignment grid
    if ('children' in node) {
      totalMisaligned += checkAlignment(node as FrameNode, issues);
      totalChecked++;
    }

    // Button/CTA size consistency
    checkSizeConsistency(node, issues, skipLocked, skipHidden);
    totalChecked++;
  }

  const density = totalArea > 0 ? (totalChildren / totalArea) * 1000 : 0;

  return {
    issues,
    metrics: {
      childCount: totalChildren,
      areaPx: totalArea,
      density,
      uniqueFontSizes: allSizes,
      lineHeightRatios: allLineHeightData,
      uniqueColors: allColors,
      misalignedCount: totalMisaligned,
    },
    summary: {
      totalChecked,
      passed: totalChecked - issues.length,
      failed: issues.length,
    },
  };
}

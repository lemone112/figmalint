/// <reference types="@figma/plugin-typings" />

import { FlowFrame, FlowGraphIssue } from './types';
import { rgbToHex } from '../utils/figma-helpers';

// ──────────────────────────────────────────────
// Cross-Screen Deterministic Consistency Checks
//
// Compares design values across frames to detect drift:
// - Color palette drift
// - Typography drift (font families, sizes)
// - Spacing scale drift
// - Component naming inconsistency
// ──────────────────────────────────────────────

interface FrameDesignValues {
  frameId: string;
  frameName: string;
  colors: Set<string>;           // hex values
  fontFamilies: Set<string>;
  fontSizes: Set<number>;
  spacingValues: Set<number>;    // gap, padding values
  componentNames: Set<string>;   // instance component names
}

// ── Extractors ──────────────────────────────────

function extractDesignValues(
  node: SceneNode,
  values: FrameDesignValues,
  skipLocked: boolean,
  skipHidden: boolean,
): void {
  if (skipLocked && 'locked' in node && (node as any).locked) return;
  if (skipHidden && 'visible' in node && !node.visible) return;

  // Colors (fills + strokes)
  if ('fills' in node) {
    const fills = node.fills;
    if (fills !== figma.mixed && Array.isArray(fills)) {
      for (const fill of fills) {
        if (fill.type === 'SOLID' && fill.visible !== false) {
          values.colors.add(rgbToHex(fill.color.r, fill.color.g, fill.color.b));
        }
      }
    }
  }
  if ('strokes' in node) {
    const strokes = (node as any).strokes as Paint[];
    if (Array.isArray(strokes)) {
      for (const stroke of strokes) {
        if (stroke.type === 'SOLID' && stroke.visible !== false) {
          values.colors.add(rgbToHex((stroke as SolidPaint).color.r, (stroke as SolidPaint).color.g, (stroke as SolidPaint).color.b));
        }
      }
    }
  }

  // Typography
  if (node.type === 'TEXT') {
    const textNode = node as TextNode;
    if (textNode.fontName !== figma.mixed) {
      values.fontFamilies.add((textNode.fontName as FontName).family);
    }
    if (textNode.fontSize !== figma.mixed) {
      values.fontSizes.add(textNode.fontSize as number);
    }
  }

  // Spacing (auto-layout)
  if ('layoutMode' in node && (node as any).layoutMode !== 'NONE') {
    const frame = node as FrameNode;
    if (typeof frame.itemSpacing === 'number') values.spacingValues.add(frame.itemSpacing);
    if (typeof frame.paddingTop === 'number') values.spacingValues.add(frame.paddingTop);
    if (typeof frame.paddingBottom === 'number') values.spacingValues.add(frame.paddingBottom);
    if (typeof frame.paddingLeft === 'number') values.spacingValues.add(frame.paddingLeft);
    if (typeof frame.paddingRight === 'number') values.spacingValues.add(frame.paddingRight);
  }

  // Component instances
  if (node.type === 'INSTANCE') {
    const mainComponent = (node as InstanceNode).mainComponent;
    if (mainComponent) {
      values.componentNames.add(mainComponent.name);
    }
  }

  // Recurse
  if ('children' in node) {
    for (const child of (node as any).children) {
      extractDesignValues(child, values, skipLocked, skipHidden);
    }
  }
}

// ── Analysis ──────────────────────────────────

function setDifference<T>(a: Set<T>, b: Set<T>): Set<T> {
  const diff = new Set<T>();
  for (const item of a) {
    if (!b.has(item)) diff.add(item);
  }
  return diff;
}

function setIntersection<T>(a: Set<T>, b: Set<T>): Set<T> {
  const inter = new Set<T>();
  for (const item of a) {
    if (b.has(item)) inter.add(item);
  }
  return inter;
}

/**
 * Run cross-screen consistency checks on multiple frames.
 * Returns FlowGraphIssues for any detected drift.
 */
export function checkCrossScreenConsistency(
  frameNodes: Array<{ frame: FlowFrame; node: SceneNode }>,
  options: { skipLocked?: boolean; skipHidden?: boolean } = {},
): FlowGraphIssue[] {
  const skipLocked = options.skipLocked ?? true;
  const skipHidden = options.skipHidden ?? true;
  const issues: FlowGraphIssue[] = [];

  if (frameNodes.length < 2) return issues;

  // Extract design values for each frame
  const allValues: FrameDesignValues[] = frameNodes.map(({ frame, node }) => {
    const values: FrameDesignValues = {
      frameId: frame.id,
      frameName: frame.name,
      colors: new Set(),
      fontFamilies: new Set(),
      fontSizes: new Set(),
      spacingValues: new Set(),
      componentNames: new Set(),
    };
    extractDesignValues(node, values, skipLocked, skipHidden);
    return values;
  });

  // ── Color drift ──
  // Build global color palette (colors used in >50% of frames)
  const colorFrequency = new Map<string, number>();
  for (const v of allValues) {
    for (const color of v.colors) {
      colorFrequency.set(color, (colorFrequency.get(color) || 0) + 1);
    }
  }
  const threshold = allValues.length * 0.5;
  const globalPalette = new Set<string>();
  for (const [color, freq] of colorFrequency) {
    if (freq >= threshold) globalPalette.add(color);
  }

  // Flag frames that use colors not in the global palette (>3 unique colors)
  for (const v of allValues) {
    const uniqueColors = setDifference(v.colors, globalPalette);
    if (uniqueColors.size > 3) {
      issues.push({
        type: 'dead-end', // reusing type, will display as consistency issue
        severity: 'warning',
        frameIds: [v.frameId],
        message: `"${v.frameName}" uses ${uniqueColors.size} colors not found in other screens (${[...uniqueColors].slice(0, 3).join(', ')}${uniqueColors.size > 3 ? '...' : ''}). Check for color inconsistency.`,
      });
    }
  }

  // ── Font family drift ──
  // Collect all font families across all frames
  const allFonts = new Set<string>();
  for (const v of allValues) {
    for (const font of v.fontFamilies) allFonts.add(font);
  }

  if (allFonts.size > 3) {
    const fontList = [...allFonts].join(', ');
    issues.push({
      type: 'dead-end',
      severity: 'warning',
      frameIds: allValues.map(v => v.frameId),
      message: `${allFonts.size} different font families across flow: ${fontList}. Flows should use 1-2 font families for consistency.`,
    });
  }

  // Per-frame font check: flag frames using fonts no other frame uses
  for (const v of allValues) {
    const otherFonts = new Set<string>();
    for (const other of allValues) {
      if (other.frameId !== v.frameId) {
        for (const f of other.fontFamilies) otherFonts.add(f);
      }
    }
    const uniqueFonts = setDifference(v.fontFamilies, otherFonts);
    if (uniqueFonts.size > 0 && allValues.length > 2) {
      issues.push({
        type: 'dead-end',
        severity: 'info',
        frameIds: [v.frameId],
        message: `"${v.frameName}" uses font${uniqueFonts.size > 1 ? 's' : ''} not seen elsewhere: ${[...uniqueFonts].join(', ')}.`,
      });
    }
  }

  // ── Font size scale drift ──
  // Check if frames use vastly different type scales
  const allSizes = new Set<number>();
  for (const v of allValues) {
    for (const size of v.fontSizes) allSizes.add(size);
  }

  if (allSizes.size > 10) {
    issues.push({
      type: 'dead-end',
      severity: 'info',
      frameIds: allValues.map(v => v.frameId),
      message: `${allSizes.size} unique font sizes across the flow. Consider using a type scale with fewer sizes for consistency.`,
    });
  }

  // ── Spacing scale drift ──
  // Check if frames use consistent spacing
  const allSpacing = new Set<number>();
  for (const v of allValues) {
    for (const s of v.spacingValues) {
      if (s > 0) allSpacing.add(s);
    }
  }

  // Check for non-standard spacing (not multiples of 4 or 8)
  const nonStandard = [...allSpacing].filter(s => s % 4 !== 0 && s !== 2);
  if (nonStandard.length > 3) {
    issues.push({
      type: 'dead-end',
      severity: 'info',
      frameIds: allValues.map(v => v.frameId),
      message: `${nonStandard.length} non-standard spacing values across flow (${nonStandard.slice(0, 4).join(', ')}px). Consider aligning to a 4px/8px grid.`,
    });
  }

  return issues;
}

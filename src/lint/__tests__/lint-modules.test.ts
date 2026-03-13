/**
 * Unit tests for FigmaLint lint modules.
 *
 * These modules run in Figma's QuickJS sandbox with global Figma types.
 * We mock the minimum surface area each module actually reads.
 */
import { describe, it, expect, beforeEach } from 'vitest';

// ── Figma global mock ────────────────────────────
// typography.ts reads `figma.mixed` as a sentinel value.
// We define it before any module import so the reference resolves.
const MIXED_SENTINEL = Symbol('figma.mixed');
(globalThis as any).figma = {
  mixed: MIXED_SENTINEL,
};

import { checkLayoutSizing } from '../layout-sizing';
import { checkConstraints } from '../constraints';
import { checkTypography } from '../typography';
import { checkComponentProps } from '../component-props';

// ── Mock node factories ──────────────────────────

let nodeIdCounter = 0;

function nextNodeId(): string {
  return `node-${++nodeIdCounter}`;
}

interface MockFrameOpts {
  name?: string;
  type?: string;
  visible?: boolean;
  locked?: boolean;
  layoutMode?: string;
  primaryAxisSizingMode?: string;
  counterAxisSizingMode?: string;
  layoutPositioning?: string;
  layoutGrow?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  children?: any[];
  parent?: any;
}

function createMockFrame(opts: MockFrameOpts = {}): any {
  return {
    id: nextNodeId(),
    name: opts.name ?? 'Frame',
    type: opts.type ?? 'FRAME',
    visible: opts.visible ?? true,
    locked: opts.locked ?? false,
    layoutMode: opts.layoutMode ?? 'NONE',
    primaryAxisSizingMode: opts.primaryAxisSizingMode ?? 'FIXED',
    counterAxisSizingMode: opts.counterAxisSizingMode ?? 'FIXED',
    layoutPositioning: opts.layoutPositioning,
    layoutGrow: opts.layoutGrow ?? 0,
    minWidth: opts.minWidth,
    maxWidth: opts.maxWidth,
    minHeight: opts.minHeight,
    maxHeight: opts.maxHeight,
    children: opts.children ?? [],
    parent: opts.parent ?? null,
  };
}

interface MockTextOpts {
  name?: string;
  visible?: boolean;
  locked?: boolean;
  fontSize?: number | symbol;
  fontName?: { family: string; style: string } | symbol;
  lineHeight?: { unit: string; value: number } | symbol;
  letterSpacing?: { unit: string; value: number } | symbol;
  textAlignHorizontal?: string;
  textCase?: string;
  textDecoration?: string;
  paragraphSpacing?: number;
  constraints?: { horizontal: string; vertical: string };
  parent?: any;
}

function createMockText(opts: MockTextOpts = {}): any {
  return {
    id: nextNodeId(),
    name: opts.name ?? 'Text',
    type: 'TEXT',
    visible: opts.visible ?? true,
    locked: opts.locked ?? false,
    fontSize: opts.fontSize ?? 14,
    fontName: opts.fontName ?? { family: 'Inter', style: 'Regular' },
    lineHeight: opts.lineHeight ?? { unit: 'AUTO', value: 0 },
    letterSpacing: opts.letterSpacing,
    textAlignHorizontal: opts.textAlignHorizontal ?? 'LEFT',
    textCase: opts.textCase,
    textDecoration: opts.textDecoration,
    paragraphSpacing: opts.paragraphSpacing ?? 0,
    constraints: opts.constraints,
    parent: opts.parent ?? null,
  };
}

interface MockComponentOpts {
  name?: string;
  type?: string;
  visible?: boolean;
  locked?: boolean;
  description?: string;
  componentPropertyDefinitions?: Record<string, any>;
  children?: any[];
}

function createMockComponent(opts: MockComponentOpts = {}): any {
  return {
    id: nextNodeId(),
    name: opts.name ?? 'Component',
    type: opts.type ?? 'COMPONENT',
    visible: opts.visible ?? true,
    locked: opts.locked ?? false,
    description: opts.description ?? '',
    componentPropertyDefinitions: opts.componentPropertyDefinitions ?? {},
    children: opts.children ?? [],
  };
}

function createMockComponentSet(opts: MockComponentOpts & { children?: any[] } = {}): any {
  return {
    id: nextNodeId(),
    name: opts.name ?? 'ComponentSet',
    type: 'COMPONENT_SET',
    visible: opts.visible ?? true,
    locked: opts.locked ?? false,
    description: opts.description ?? '',
    componentPropertyDefinitions: opts.componentPropertyDefinitions ?? {},
    children: opts.children ?? [],
  };
}

// ── Reset counter between tests ──────────────────

beforeEach(() => {
  nodeIdCounter = 0;
});

// ═══════════════════════════════════════════════════
// checkLayoutSizing
// ═══════════════════════════════════════════════════

describe('checkLayoutSizing', () => {
  it('returns empty issues for empty nodes array', () => {
    const result = checkLayoutSizing([]);
    expect(result.issues).toEqual([]);
    expect(result.summary.totalChecked).toBe(0);
  });

  it('returns no issues for a simple frame without auto-layout', () => {
    const frame = createMockFrame({ layoutMode: 'NONE' });
    const result = checkLayoutSizing([frame]);
    expect(result.issues).toHaveLength(0);
  });

  it('detects FIXED sizing inside auto-layout parent', () => {
    const child1 = createMockFrame({
      name: 'Child',
      primaryAxisSizingMode: 'FIXED',
      counterAxisSizingMode: 'FIXED',
    });
    const parent = createMockFrame({
      name: 'AutoParent',
      layoutMode: 'HORIZONTAL',
      children: [child1],
    });

    const result = checkLayoutSizing([parent]);
    const fixedIssues = result.issues.filter(i => i.message.includes('FIXED'));
    expect(fixedIssues.length).toBeGreaterThan(0);
    expect(result.summary.fixedInAutoLayout).toBeGreaterThan(0);
  });

  it('detects inconsistent sizing among siblings', () => {
    const child1 = createMockFrame({
      name: 'ChildA',
      primaryAxisSizingMode: 'FILL',
      counterAxisSizingMode: 'FILL',
    });
    const child2 = createMockFrame({
      name: 'ChildB',
      primaryAxisSizingMode: 'FILL',
      counterAxisSizingMode: 'FILL',
    });
    const child3 = createMockFrame({
      name: 'ChildC',
      primaryAxisSizingMode: 'HUG',
      counterAxisSizingMode: 'FILL',
    });
    const parent = createMockFrame({
      name: 'Container',
      layoutMode: 'HORIZONTAL',
      children: [child1, child2, child3],
    });

    const result = checkLayoutSizing([parent]);
    const inconsistentIssues = result.issues.filter(i => i.message.includes('differs from siblings'));
    expect(inconsistentIssues.length).toBeGreaterThan(0);
    expect(result.summary.inconsistentSizing).toBeGreaterThan(0);
  });

  it('detects layoutGrow mismatch in horizontal layout', () => {
    const child1 = createMockFrame({
      name: 'GrowChild',
      layoutGrow: 1,
    });
    const child2 = createMockFrame({
      name: 'NoGrowChild',
      layoutGrow: 0,
    });
    const parent = createMockFrame({
      name: 'HRow',
      layoutMode: 'HORIZONTAL',
      children: [child1, child2],
    });

    const result = checkLayoutSizing([parent]);
    const growIssues = result.issues.filter(i => i.message.includes('layoutGrow'));
    expect(growIssues.length).toBeGreaterThan(0);
    expect(result.summary.layoutGrowMismatch).toBeGreaterThan(0);
  });

  it('detects absolute positioning in auto-layout', () => {
    const absChild = createMockFrame({
      name: 'Overlay',
      layoutPositioning: 'ABSOLUTE',
    });
    const parent = createMockFrame({
      name: 'AutoFrame',
      layoutMode: 'VERTICAL',
      children: [absChild],
    });

    const result = checkLayoutSizing([parent]);
    const absIssues = result.issues.filter(i => i.message.includes('Absolute positioning'));
    expect(absIssues.length).toBe(1);
    expect(result.summary.absoluteInAutoLayout).toBe(1);
  });

  it('detects FILL sizing without min/max constraints', () => {
    const fillFrame = createMockFrame({
      name: 'FillFrame',
      primaryAxisSizingMode: 'FILL',
      counterAxisSizingMode: 'FIXED',
      // no minWidth/maxWidth/minHeight/maxHeight
    });

    const result = checkLayoutSizing([fillFrame]);
    const constraintIssues = result.issues.filter(i => i.message.includes('min/max'));
    expect(constraintIssues.length).toBe(1);
    expect(result.summary.missingConstraints).toBe(1);
  });

  it('does not flag FILL sizing when minWidth is set', () => {
    const fillFrame = createMockFrame({
      name: 'ConstrainedFill',
      primaryAxisSizingMode: 'FILL',
      counterAxisSizingMode: 'FIXED',
      minWidth: 100,
    });

    const result = checkLayoutSizing([fillFrame]);
    const constraintIssues = result.issues.filter(i => i.message.includes('min/max'));
    expect(constraintIssues.length).toBe(0);
  });

  it('skips hidden nodes when skipHiddenLayers is true', () => {
    const hiddenChild = createMockFrame({
      name: 'HiddenChild',
      visible: false,
      primaryAxisSizingMode: 'FIXED',
    });
    const parent = createMockFrame({
      name: 'AutoParent',
      layoutMode: 'HORIZONTAL',
      children: [hiddenChild],
    });

    const result = checkLayoutSizing([parent], { settings: { skipHiddenLayers: true } });
    expect(result.issues).toHaveLength(0);
  });

  it('skips locked nodes when skipLockedLayers is true', () => {
    const lockedFrame = createMockFrame({
      name: 'LockedFrame',
      locked: true,
      layoutMode: 'HORIZONTAL',
      children: [
        createMockFrame({ name: 'Child', primaryAxisSizingMode: 'FIXED' }),
      ],
    });

    const result = checkLayoutSizing([lockedFrame], { settings: { skipLockedLayers: true } });
    expect(result.issues).toHaveLength(0);
  });

  it('returns correct result structure', () => {
    const result = checkLayoutSizing([]);
    expect(result).toHaveProperty('issues');
    expect(result).toHaveProperty('summary');
    expect(result.summary).toHaveProperty('totalChecked');
    expect(result.summary).toHaveProperty('inconsistentSizing');
    expect(result.summary).toHaveProperty('fixedInAutoLayout');
    expect(result.summary).toHaveProperty('layoutGrowMismatch');
    expect(result.summary).toHaveProperty('absoluteInAutoLayout');
    expect(result.summary).toHaveProperty('missingConstraints');
  });
});

// ═══════════════════════════════════════════════════
// checkConstraints
// ═══════════════════════════════════════════════════

describe('checkConstraints', () => {
  it('returns empty issues for empty nodes array', () => {
    const result = checkConstraints([]);
    expect(result.issues).toEqual([]);
    expect(result.summary.totalChecked).toBe(0);
  });

  it('detects default MIN/MIN constraints in a fixed frame', () => {
    const child = createMockFrame({
      name: 'InnerBox',
    });
    (child as any).constraints = { horizontal: 'MIN', vertical: 'MIN' };

    const parent = createMockFrame({
      name: 'FixedParent',
      layoutMode: 'NONE', // non-auto-layout
      children: [child],
    });

    const result = checkConstraints([parent]);
    const defaultIssues = result.issues.filter(i => i.message.includes('Default constraints'));
    expect(defaultIssues.length).toBe(1);
    expect(result.summary.noConstraints).toBe(1);
  });

  it('detects SCALE constraint on text nodes', () => {
    const textNode = createMockText({
      name: 'ScaledText',
    });
    (textNode as any).constraints = { horizontal: 'SCALE', vertical: 'MIN' };

    const parent = createMockFrame({
      name: 'FixedParent',
      layoutMode: 'NONE',
      children: [textNode],
    });

    const result = checkConstraints([parent]);
    const scaleIssues = result.issues.filter(i => i.message.includes('SCALE'));
    expect(scaleIssues.length).toBe(1);
    expect(result.summary.scaleOnText).toBe(1);
  });

  it('detects constraints ignored in auto-layout parent', () => {
    const child = createMockFrame({
      name: 'ConstrainedChild',
    });
    (child as any).constraints = { horizontal: 'STRETCH', vertical: 'CENTER' };

    const parent = createMockFrame({
      name: 'AutoParent',
      layoutMode: 'HORIZONTAL',
      children: [child],
    });

    const result = checkConstraints([parent]);
    const ignoredIssues = result.issues.filter(i => i.message.includes('constraints are ignored'));
    expect(ignoredIssues.length).toBe(1);
    expect(result.summary.ignoredInAutoLayout).toBe(1);
  });

  it('does not flag default constraints in auto-layout parent', () => {
    const child = createMockFrame({
      name: 'DefaultChild',
    });
    (child as any).constraints = { horizontal: 'MIN', vertical: 'MIN' };

    const parent = createMockFrame({
      name: 'AutoParent',
      layoutMode: 'HORIZONTAL',
      children: [child],
    });

    const result = checkConstraints([parent]);
    // Default MIN/MIN inside auto-layout should not be flagged as "ignored"
    const ignoredIssues = result.issues.filter(i => i.message.includes('constraints are ignored'));
    expect(ignoredIssues.length).toBe(0);
  });

  it('detects conflicting STRETCH + fixed width', () => {
    const parent = createMockFrame({
      name: 'FixedParent',
      layoutMode: 'NONE',
    });

    const child = createMockFrame({
      name: 'StretchedFixed',
    });
    (child as any).constraints = { horizontal: 'STRETCH', vertical: 'MIN' };
    (child as any).layoutSizingHorizontal = 'FIXED';
    (child as any).width = 200;
    child.parent = parent;
    parent.children = [child];

    const result = checkConstraints([parent]);
    const conflictIssues = result.issues.filter(i => i.message.includes('STRETCH horizontal constraint'));
    expect(conflictIssues.length).toBe(1);
    expect(result.summary.conflicting).toBe(1);
  });

  it('skips nodes without constraints', () => {
    const child = createMockFrame({
      name: 'NoConstraints',
    });
    // No .constraints property set

    const parent = createMockFrame({
      name: 'Parent',
      layoutMode: 'NONE',
      children: [child],
    });

    const result = checkConstraints([parent]);
    expect(result.issues).toHaveLength(0);
    expect(result.summary.totalChecked).toBe(0);
  });

  it('returns correct result structure', () => {
    const result = checkConstraints([]);
    expect(result).toHaveProperty('issues');
    expect(result).toHaveProperty('summary');
    expect(result.summary).toHaveProperty('totalChecked');
    expect(result.summary).toHaveProperty('noConstraints');
    expect(result.summary).toHaveProperty('scaleOnText');
    expect(result.summary).toHaveProperty('conflicting');
    expect(result.summary).toHaveProperty('ignoredInAutoLayout');
  });
});

// ═══════════════════════════════════════════════════
// checkTypography
// ═══════════════════════════════════════════════════

describe('checkTypography', () => {
  it('returns empty issues for empty nodes array', () => {
    const result = checkTypography([]);
    expect(result.issues).toEqual([]);
    expect(result.summary.totalChecked).toBe(0);
  });

  it('returns no issues for well-formatted text', () => {
    const text = createMockText({
      name: 'GoodText',
      fontSize: 14,
      lineHeight: { unit: 'PIXELS', value: 20 }, // ratio 1.43
      textAlignHorizontal: 'LEFT',
    });

    const frame = createMockFrame({
      name: 'Container',
      children: [text],
    });

    const result = checkTypography([frame]);
    // No issues should be raised for well-formatted text
    const lineHeightIssues = result.issues.filter(i => i.message.includes('Line height'));
    expect(lineHeightIssues).toHaveLength(0);
  });

  it('detects low line height ratio (below 1.2)', () => {
    const text = createMockText({
      name: 'CrampedText',
      fontSize: 16,
      lineHeight: { unit: 'PIXELS', value: 16 }, // ratio 1.0
    });

    const frame = createMockFrame({
      name: 'Container',
      children: [text],
    });

    const result = checkTypography([frame]);
    const lineHeightIssues = result.issues.filter(i => i.message.includes('below 1.2'));
    expect(lineHeightIssues.length).toBe(1);
    expect(result.summary.badLineHeightRatio).toBe(1);
  });

  it('detects excessively high line height ratio (above 2.0)', () => {
    const text = createMockText({
      name: 'SpaceyText',
      fontSize: 14,
      lineHeight: { unit: 'PIXELS', value: 42 }, // ratio 3.0
    });

    const frame = createMockFrame({
      name: 'Container',
      children: [text],
    });

    const result = checkTypography([frame]);
    const lineHeightIssues = result.issues.filter(i => i.message.includes('exceeds 2.0'));
    expect(lineHeightIssues.length).toBe(1);
    expect(result.summary.badLineHeightRatio).toBe(1);
  });

  it('detects UPPERCASE text without letterSpacing', () => {
    const text = createMockText({
      name: 'UpperText',
      fontSize: 14,
      textCase: 'UPPER',
      letterSpacing: { unit: 'PIXELS', value: 0 },
    });

    const frame = createMockFrame({
      name: 'Container',
      children: [text],
    });

    const result = checkTypography([frame]);
    const uppercaseIssues = result.issues.filter(i => i.message.includes('UPPERCASE'));
    expect(uppercaseIssues.length).toBe(1);
    expect(result.summary.uppercaseMissingSpacing).toBe(1);
  });

  it('does not flag UPPERCASE with positive letterSpacing', () => {
    const text = createMockText({
      name: 'SpacedUpper',
      fontSize: 14,
      textCase: 'UPPER',
      letterSpacing: { unit: 'PIXELS', value: 1 },
    });

    const frame = createMockFrame({
      name: 'Container',
      children: [text],
    });

    const result = checkTypography([frame]);
    const uppercaseIssues = result.issues.filter(i => i.message.includes('UPPERCASE'));
    expect(uppercaseIssues.length).toBe(0);
  });

  it('detects suspicious underline on non-link text', () => {
    const text = createMockText({
      name: 'RegularText',
      textDecoration: 'UNDERLINE',
    });
    // Parent also not link-like
    const parent = createMockFrame({
      name: 'Container',
      children: [text],
    });
    text.parent = parent;

    const result = checkTypography([parent]);
    const decoIssues = result.issues.filter(i => i.message.includes('Underline'));
    expect(decoIssues.length).toBe(1);
    expect(result.summary.suspiciousDecoration).toBe(1);
  });

  it('does not flag underline on link-named text', () => {
    const text = createMockText({
      name: 'nav-link',
      textDecoration: 'UNDERLINE',
    });
    const parent = createMockFrame({
      name: 'Container',
      children: [text],
    });
    text.parent = parent;

    const result = checkTypography([parent]);
    const decoIssues = result.issues.filter(i => i.message.includes('Underline'));
    expect(decoIssues.length).toBe(0);
  });

  it('detects non-standard letterSpacing on body text', () => {
    const text = createMockText({
      name: 'SpacedBody',
      fontSize: 14,
      letterSpacing: { unit: 'PIXELS', value: 2 },
    });

    const frame = createMockFrame({
      name: 'Container',
      children: [text],
    });

    const result = checkTypography([frame]);
    const lsIssues = result.issues.filter(i => i.message.includes('non-zero letterSpacing'));
    expect(lsIssues.length).toBe(1);
    expect(result.summary.nonStandardLetterSpacing).toBe(1);
  });

  it('detects inconsistent text alignment within a frame', () => {
    const text1 = createMockText({
      name: 'TextA',
      fontSize: 14,
      textAlignHorizontal: 'LEFT',
    });
    const text2 = createMockText({
      name: 'TextB',
      fontSize: 14,
      textAlignHorizontal: 'LEFT',
    });
    const text3 = createMockText({
      name: 'TextC',
      fontSize: 14,
      textAlignHorizontal: 'CENTER',
    });

    const frame = createMockFrame({
      name: 'Card',
      children: [text1, text2, text3],
    });

    const result = checkTypography([frame]);
    const alignIssues = result.issues.filter(i => i.message.includes('differs from majority'));
    expect(alignIssues.length).toBe(1);
    expect(result.summary.inconsistentAlignment).toBe(1);
  });

  it('detects missing paragraph spacing on multiple text blocks', () => {
    const text1 = createMockText({
      name: 'Para1',
      fontSize: 14,
      paragraphSpacing: 0,
    });
    const text2 = createMockText({
      name: 'Para2',
      fontSize: 14,
      paragraphSpacing: 0,
    });

    const frame = createMockFrame({
      name: 'Article',
      children: [text1, text2],
    });

    const result = checkTypography([frame]);
    const psIssues = result.issues.filter(i => i.message.includes('paragraphSpacing'));
    expect(psIssues.length).toBe(1);
    expect(result.summary.missingParagraphSpacing).toBe(1);
  });

  it('skips hidden nodes', () => {
    const hiddenText = createMockText({
      name: 'HiddenText',
      visible: false,
      fontSize: 16,
      lineHeight: { unit: 'PIXELS', value: 10 }, // would fail if checked
    });

    const frame = createMockFrame({
      name: 'Container',
      children: [hiddenText],
    });

    const result = checkTypography([frame], { settings: { skipHiddenLayers: true } });
    expect(result.issues).toHaveLength(0);
  });

  it('returns correct result structure', () => {
    const result = checkTypography([]);
    expect(result).toHaveProperty('issues');
    expect(result).toHaveProperty('summary');
    expect(result.summary).toHaveProperty('totalChecked');
    expect(result.summary).toHaveProperty('inconsistentAlignment');
    expect(result.summary).toHaveProperty('nonStandardLetterSpacing');
    expect(result.summary).toHaveProperty('uppercaseMissingSpacing');
    expect(result.summary).toHaveProperty('missingParagraphSpacing');
    expect(result.summary).toHaveProperty('badLineHeightRatio');
    expect(result.summary).toHaveProperty('suspiciousDecoration');
  });
});

// ═══════════════════════════════════════════════════
// checkComponentProps
// ═══════════════════════════════════════════════════

describe('checkComponentProps', () => {
  it('returns empty issues for empty nodes array', () => {
    const result = checkComponentProps([]);
    expect(result.issues).toEqual([]);
    expect(result.summary.totalChecked).toBe(0);
  });

  it('returns no issues for a well-configured component', () => {
    const comp = createMockComponent({
      name: 'Button',
      description: 'A primary action button.',
      componentPropertyDefinitions: {
        label: { type: 'TEXT' },
        isDisabled: { type: 'BOOLEAN' },
      },
    });

    const result = checkComponentProps([comp]);
    expect(result.issues).toHaveLength(0);
  });

  it('detects too many boolean properties', () => {
    const booleans: Record<string, any> = {};
    for (let i = 0; i < 7; i++) {
      booleans[`flag${i}`] = { type: 'BOOLEAN' };
    }

    const comp = createMockComponent({
      name: 'Overloaded',
      description: 'A component with many booleans.',
      componentPropertyDefinitions: booleans,
    });

    const result = checkComponentProps([comp]);
    const boolIssues = result.issues.filter(i => i.message.includes('boolean properties'));
    expect(boolIssues.length).toBe(1);
    expect(result.summary.booleanOveruse).toBe(1);
  });

  it('detects missing component description', () => {
    const comp = createMockComponent({
      name: 'NoDesc',
      description: '', // empty
      componentPropertyDefinitions: {
        label: { type: 'TEXT' },
      },
    });

    const result = checkComponentProps([comp]);
    const descIssues = result.issues.filter(i => i.message.includes('no description'));
    expect(descIssues.length).toBe(1);
    expect(result.summary.missingDescription).toBe(1);
  });

  it('detects property names with spaces', () => {
    const comp = createMockComponent({
      name: 'SpacedProps',
      description: 'Has spaced props.',
      componentPropertyDefinitions: {
        'Has Icon': { type: 'BOOLEAN' },
        'Show Label': { type: 'BOOLEAN' },
      },
    });

    const result = checkComponentProps([comp]);
    const spaceIssues = result.issues.filter(i => i.message.includes('contains spaces'));
    expect(spaceIssues.length).toBe(2);
    expect(result.summary.spacedNames).toBe(2);
  });

  it('detects inconsistent variant naming in component sets', () => {
    const compSet = createMockComponentSet({
      name: 'ButtonSet',
      description: 'Button variants.',
      componentPropertyDefinitions: {
        Size: {
          type: 'VARIANT',
          variantOptions: ['Small', 'medium', 'LARGE'], // mixed casing
        },
      },
      children: [
        { name: 'Size=Small', id: 'v1' },
        { name: 'Size=medium', id: 'v2' },
        { name: 'Size=LARGE', id: 'v3' },
      ],
    });

    const result = checkComponentProps([compSet]);
    const namingIssues = result.issues.filter(i => i.message.includes('inconsistent casing'));
    expect(namingIssues.length).toBe(1);
    expect(result.summary.inconsistentNaming).toBe(1);
  });

  it('detects unused variant values', () => {
    const compSet = createMockComponentSet({
      name: 'SizeSet',
      description: 'Sizes.',
      componentPropertyDefinitions: {
        Size: {
          type: 'VARIANT',
          variantOptions: ['small', 'medium', 'large', 'xlarge'],
        },
      },
      children: [
        { name: 'Size=small', id: 'v1' },
        { name: 'Size=medium', id: 'v2' },
        // 'large' and 'xlarge' are defined but no child uses them
      ],
    });

    const result = checkComponentProps([compSet]);
    const unusedIssues = result.issues.filter(i => i.message.includes('no child component uses it'));
    expect(unusedIssues.length).toBe(2);
    expect(result.summary.unusedVariants).toBe(2);
  });

  it('skips hidden components', () => {
    const comp = createMockComponent({
      name: 'HiddenComp',
      visible: false,
      description: '', // would fail if checked
      componentPropertyDefinitions: { label: { type: 'TEXT' } },
    });

    const result = checkComponentProps([comp], { skipHidden: true });
    expect(result.issues).toHaveLength(0);
  });

  it('skips locked components', () => {
    const comp = createMockComponent({
      name: 'LockedComp',
      locked: true,
      description: '', // would fail if checked
      componentPropertyDefinitions: { label: { type: 'TEXT' } },
    });

    const result = checkComponentProps([comp], { skipLocked: true });
    expect(result.issues).toHaveLength(0);
  });

  it('returns correct result structure', () => {
    const result = checkComponentProps([]);
    expect(result).toHaveProperty('issues');
    expect(result).toHaveProperty('summary');
    expect(result.summary).toHaveProperty('totalChecked');
    expect(result.summary).toHaveProperty('booleanOveruse');
    expect(result.summary).toHaveProperty('missingDescription');
    expect(result.summary).toHaveProperty('inconsistentNaming');
    expect(result.summary).toHaveProperty('unusedVariants');
    expect(result.summary).toHaveProperty('spacedNames');
  });
});

// ═══════════════════════════════════════════════════
// LintIssue structure validation (cross-module)
// ═══════════════════════════════════════════════════

describe('LintIssue structure', () => {
  it('every issue from checkLayoutSizing has required fields', () => {
    const child = createMockFrame({
      name: 'Overlay',
      layoutPositioning: 'ABSOLUTE',
    });
    const parent = createMockFrame({
      name: 'AutoFrame',
      layoutMode: 'VERTICAL',
      children: [child],
    });

    const result = checkLayoutSizing([parent]);
    for (const issue of result.issues) {
      expect(issue).toHaveProperty('id');
      expect(issue).toHaveProperty('type');
      expect(issue).toHaveProperty('severity');
      expect(issue).toHaveProperty('nodeId');
      expect(issue).toHaveProperty('nodeName');
      expect(issue).toHaveProperty('message');
      expect(issue).toHaveProperty('autoFixable');
      expect(typeof issue.id).toBe('string');
      expect(typeof issue.message).toBe('string');
      expect(['critical', 'warning', 'info']).toContain(issue.severity);
    }
  });

  it('every issue from checkConstraints has required fields', () => {
    const textNode = createMockText({ name: 'ScaledText' });
    (textNode as any).constraints = { horizontal: 'SCALE', vertical: 'MIN' };

    const parent = createMockFrame({
      name: 'FixedParent',
      layoutMode: 'NONE',
      children: [textNode],
    });

    const result = checkConstraints([parent]);
    for (const issue of result.issues) {
      expect(issue).toHaveProperty('id');
      expect(issue).toHaveProperty('type');
      expect(issue).toHaveProperty('severity');
      expect(issue).toHaveProperty('nodeId');
      expect(issue).toHaveProperty('nodeName');
      expect(issue).toHaveProperty('message');
      expect(issue).toHaveProperty('autoFixable');
    }
  });

  it('every issue from checkTypography has required fields', () => {
    const text = createMockText({
      name: 'CrampedText',
      fontSize: 16,
      lineHeight: { unit: 'PIXELS', value: 16 },
    });

    const frame = createMockFrame({
      name: 'Container',
      children: [text],
    });

    const result = checkTypography([frame]);
    for (const issue of result.issues) {
      expect(issue).toHaveProperty('id');
      expect(issue).toHaveProperty('type');
      expect(issue).toHaveProperty('severity');
      expect(issue).toHaveProperty('nodeId');
      expect(issue).toHaveProperty('nodeName');
      expect(issue).toHaveProperty('message');
      expect(issue).toHaveProperty('autoFixable');
    }
  });

  it('every issue from checkComponentProps has required fields', () => {
    const comp = createMockComponent({
      name: 'NoDesc',
      description: '',
      componentPropertyDefinitions: { label: { type: 'TEXT' } },
    });

    const result = checkComponentProps([comp]);
    for (const issue of result.issues) {
      expect(issue).toHaveProperty('id');
      expect(issue).toHaveProperty('type');
      expect(issue).toHaveProperty('severity');
      expect(issue).toHaveProperty('nodeId');
      expect(issue).toHaveProperty('nodeName');
      expect(issue).toHaveProperty('message');
      expect(issue).toHaveProperty('autoFixable');
    }
  });
});

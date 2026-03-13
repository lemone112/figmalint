/**
 * Unit tests for the core design-lint module (runDesignLint, DEFAULT_LINT_SETTINGS).
 *
 * design-lint.ts is the orchestrator — it imports many sub-lint modules and
 * references `figma.mixed` and `figma.currentPage`. We mock all of those.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock the `figma` global ──────────────────────
const MIXED_SENTINEL = Symbol('figma.mixed');
(globalThis as any).figma = {
  mixed: MIXED_SENTINEL,
  currentPage: { selection: [] },
};

// ── Mock all sub-lint modules that design-lint.ts imports ──
// Each mock returns an empty result so runDesignLint can complete
// without needing full Figma runtime.

function emptyLintResult() {
  return { issues: [], summary: {} };
}

vi.mock('../spacing', () => ({
  checkSpacing: vi.fn(() => emptyLintResult()),
}));
vi.mock('../auto-layout', () => ({
  checkAutoLayout: vi.fn(() => emptyLintResult()),
}));
vi.mock('../accessibility', () => ({
  checkAccessibility: vi.fn(() => emptyLintResult()),
}));
vi.mock('../visual-quality', () => ({
  checkVisualQuality: vi.fn(() => emptyLintResult()),
}));
vi.mock('../microcopy', () => ({
  checkMicrocopy: vi.fn(() => emptyLintResult()),
}));
vi.mock('../conversion', () => ({
  checkConversion: vi.fn(() => emptyLintResult()),
}));
vi.mock('../cognitive', () => ({
  checkCognitive: vi.fn(() => emptyLintResult()),
}));
vi.mock('../fitts-law', () => ({
  checkFittsLaw: vi.fn(() => emptyLintResult()),
}));
vi.mock('../gestalt', () => ({
  checkGestalt: vi.fn(() => emptyLintResult()),
}));
vi.mock('../detached-instance', () => ({
  checkDetachedInstances: vi.fn(() => emptyLintResult()),
}));
vi.mock('../responsive', () => ({
  checkResponsive: vi.fn(() => emptyLintResult()),
}));

// Mock rgbToHex — design-lint.ts imports it from utils
vi.mock('../../utils/figma-helpers', () => ({
  rgbToHex: vi.fn((_r: number, _g: number, _b: number) => '#000000'),
}));

import { runDesignLint, DEFAULT_LINT_SETTINGS } from '../../core/design-lint';

// ── Mock node factories ──────────────────────────

let nodeIdCounter = 0;

function nextNodeId(): string {
  return `node-${++nodeIdCounter}`;
}

function createMockFrame(overrides: Record<string, any> = {}): any {
  return {
    id: nextNodeId(),
    name: overrides.name ?? 'Frame',
    type: overrides.type ?? 'FRAME',
    visible: overrides.visible ?? true,
    locked: overrides.locked ?? false,
    layoutMode: overrides.layoutMode ?? 'NONE',
    children: overrides.children ?? [],
    parent: overrides.parent ?? null,
    fills: overrides.fills ?? [],
    strokes: overrides.strokes ?? [],
    effects: overrides.effects ?? [],
    cornerRadius: overrides.cornerRadius ?? 0,
    ...overrides,
  };
}

function createMockTextNode(overrides: Record<string, any> = {}): any {
  return {
    id: nextNodeId(),
    name: overrides.name ?? 'Text',
    type: 'TEXT',
    visible: overrides.visible ?? true,
    locked: overrides.locked ?? false,
    fontSize: overrides.fontSize ?? 14,
    fontName: overrides.fontName ?? { family: 'Inter', style: 'Regular' },
    lineHeight: overrides.lineHeight ?? { unit: 'AUTO', value: 0 },
    fills: overrides.fills ?? [],
    textStyleId: overrides.textStyleId ?? '',
    parent: overrides.parent ?? null,
    ...overrides,
  };
}

beforeEach(() => {
  nodeIdCounter = 0;
});

// ═══════════════════════════════════════════════════
// DEFAULT_LINT_SETTINGS
// ═══════════════════════════════════════════════════

describe('DEFAULT_LINT_SETTINGS', () => {
  it('has all check flags defined', () => {
    expect(DEFAULT_LINT_SETTINGS.checkFills).toBe(true);
    expect(DEFAULT_LINT_SETTINGS.checkStrokes).toBe(true);
    expect(DEFAULT_LINT_SETTINGS.checkEffects).toBe(true);
    expect(DEFAULT_LINT_SETTINGS.checkTextStyles).toBe(true);
    expect(DEFAULT_LINT_SETTINGS.checkRadius).toBe(true);
    expect(DEFAULT_LINT_SETTINGS.checkSpacing).toBe(true);
    expect(DEFAULT_LINT_SETTINGS.checkAutoLayout).toBe(true);
    expect(DEFAULT_LINT_SETTINGS.checkAccessibility).toBe(true);
    expect(DEFAULT_LINT_SETTINGS.checkVisualQuality).toBe(true);
    expect(DEFAULT_LINT_SETTINGS.checkMicrocopy).toBe(true);
    expect(DEFAULT_LINT_SETTINGS.checkConversion).toBe(true);
    expect(DEFAULT_LINT_SETTINGS.checkCognitive).toBe(true);
    expect(DEFAULT_LINT_SETTINGS.checkFittsLaw).toBe(true);
    expect(DEFAULT_LINT_SETTINGS.checkGestalt).toBe(true);
    expect(DEFAULT_LINT_SETTINGS.checkDetachedInstances).toBe(true);
    expect(DEFAULT_LINT_SETTINGS.checkResponsive).toBe(true);
  });

  it('has allowedRadii as an array of numbers', () => {
    expect(Array.isArray(DEFAULT_LINT_SETTINGS.allowedRadii)).toBe(true);
    expect(DEFAULT_LINT_SETTINGS.allowedRadii.length).toBeGreaterThan(0);
    for (const r of DEFAULT_LINT_SETTINGS.allowedRadii) {
      expect(typeof r).toBe('number');
    }
  });

  it('has skipLockedLayers and skipHiddenLayers as true by default', () => {
    expect(DEFAULT_LINT_SETTINGS.skipLockedLayers).toBe(true);
    expect(DEFAULT_LINT_SETTINGS.skipHiddenLayers).toBe(true);
  });
});

// ═══════════════════════════════════════════════════
// runDesignLint
// ═══════════════════════════════════════════════════

describe('runDesignLint', () => {
  it('returns a valid result for an empty nodes array', () => {
    const result = runDesignLint([]);
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('ignoredNodeIds');
    expect(result).toHaveProperty('ignoredErrorKeys');
    expect(result).toHaveProperty('summary');
    expect(result.errors).toEqual([]);
    expect(result.summary.totalErrors).toBe(0);
    expect(result.summary.totalNodes).toBe(0);
    expect(result.summary.nodesWithErrors).toBe(0);
  });

  it('returns correct result structure with summary.byType', () => {
    const result = runDesignLint([]);
    const byType = result.summary.byType;
    expect(byType).toHaveProperty('fill');
    expect(byType).toHaveProperty('stroke');
    expect(byType).toHaveProperty('effect');
    expect(byType).toHaveProperty('text');
    expect(byType).toHaveProperty('radius');
    expect(byType).toHaveProperty('spacing');
    expect(byType).toHaveProperty('autoLayout');
    expect(byType).toHaveProperty('accessibility');
    expect(byType).toHaveProperty('visualQuality');
    expect(byType).toHaveProperty('microcopy');
    expect(byType).toHaveProperty('conversion');
    expect(byType).toHaveProperty('cognitive');
    expect(byType).toHaveProperty('fittsLaw');
    expect(byType).toHaveProperty('gestalt');
    expect(byType).toHaveProperty('detachedInstance');
    expect(byType).toHaveProperty('responsive');
  });

  it('traverses a frame node and counts it', () => {
    const frame = createMockFrame({ name: 'TestFrame' });

    const result = runDesignLint([frame]);
    expect(result.summary.totalNodes).toBe(1);
  });

  it('traverses children recursively', () => {
    const child1 = createMockFrame({ name: 'Child1' });
    const child2 = createMockFrame({ name: 'Child2' });
    const parent = createMockFrame({
      name: 'Parent',
      children: [child1, child2],
    });

    const result = runDesignLint([parent]);
    expect(result.summary.totalNodes).toBe(3); // parent + 2 children
  });

  it('skips hidden nodes when skipHiddenLayers is true', () => {
    const hiddenChild = createMockFrame({
      name: 'HiddenChild',
      visible: false,
    });
    const parent = createMockFrame({
      name: 'Parent',
      children: [hiddenChild],
    });

    const settings = { ...DEFAULT_LINT_SETTINGS, skipHiddenLayers: true };
    const result = runDesignLint([parent], settings);
    // Only the parent should be counted
    expect(result.summary.totalNodes).toBe(1);
  });

  it('skips locked nodes when skipLockedLayers is true', () => {
    const lockedChild = createMockFrame({
      name: 'LockedChild',
      locked: true,
    });
    const parent = createMockFrame({
      name: 'Parent',
      children: [lockedChild],
    });

    const settings = { ...DEFAULT_LINT_SETTINGS, skipLockedLayers: true };
    const result = runDesignLint([parent], settings);
    expect(result.summary.totalNodes).toBe(1);
  });

  it('detects missing fill style on a frame with unstyled visible fills', () => {
    const frame = createMockFrame({
      name: 'Unstyled',
      fills: [
        { type: 'SOLID', color: { r: 1, g: 0, b: 0 }, visible: true },
      ],
      fillStyleId: '',
    });

    const result = runDesignLint([frame]);
    const fillErrors = result.errors.filter(e => e.errorType === 'fill');
    expect(fillErrors.length).toBe(1);
    expect(fillErrors[0].message).toContain('Missing fill style');
  });

  it('does not flag fills when a fill style is applied', () => {
    const frame = createMockFrame({
      name: 'Styled',
      fills: [
        { type: 'SOLID', color: { r: 1, g: 0, b: 0 }, visible: true },
      ],
      fillStyleId: 'S:abc123,',
    });

    const result = runDesignLint([frame]);
    const fillErrors = result.errors.filter(e => e.errorType === 'fill');
    expect(fillErrors.length).toBe(0);
  });

  it('detects missing stroke style', () => {
    const frame = createMockFrame({
      name: 'UnstyledStroke',
      strokes: [
        { type: 'SOLID', color: { r: 0, g: 0, b: 1 }, visible: true },
      ],
      strokeStyleId: '',
      strokeWeight: 1,
    });

    const result = runDesignLint([frame]);
    const strokeErrors = result.errors.filter(e => e.errorType === 'stroke');
    expect(strokeErrors.length).toBe(1);
    expect(strokeErrors[0].message).toContain('Missing stroke style');
  });

  it('detects missing effect style', () => {
    const frame = createMockFrame({
      name: 'UnstyledEffect',
      effects: [
        { type: 'DROP_SHADOW', visible: true, radius: 4, color: { r: 0, g: 0, b: 0 } },
      ],
      effectStyleId: '',
    });

    const result = runDesignLint([frame]);
    const effectErrors = result.errors.filter(e => e.errorType === 'effect');
    expect(effectErrors.length).toBe(1);
    expect(effectErrors[0].message).toContain('Missing effect style');
  });

  it('detects non-standard border radius', () => {
    const frame = createMockFrame({
      name: 'OddRadius',
      cornerRadius: 5, // not in DEFAULT_LINT_SETTINGS.allowedRadii
    });

    const result = runDesignLint([frame]);
    const radiusErrors = result.errors.filter(e => e.errorType === 'radius');
    expect(radiusErrors.length).toBe(1);
    expect(radiusErrors[0].message).toContain('Non-standard border radius');
  });

  it('does not flag allowed border radii', () => {
    const frame = createMockFrame({
      name: 'StandardRadius',
      cornerRadius: 8, // in DEFAULT_LINT_SETTINGS.allowedRadii
    });

    const result = runDesignLint([frame]);
    const radiusErrors = result.errors.filter(e => e.errorType === 'radius');
    expect(radiusErrors.length).toBe(0);
  });

  it('detects missing text style on text node', () => {
    const text = createMockTextNode({
      name: 'UnstyledText',
      textStyleId: '',
      fontSize: 16,
      fontName: { family: 'Roboto', style: 'Bold' },
    });

    const settings = { ...DEFAULT_LINT_SETTINGS, checkFills: false }; // skip fill check on text
    const result = runDesignLint([text], settings);
    const textErrors = result.errors.filter(e => e.errorType === 'text');
    expect(textErrors.length).toBe(1);
    expect(textErrors[0].message).toContain('Missing text style');
    expect(textErrors[0].message).toContain('Roboto');
  });

  it('does not flag text with applied text style', () => {
    const text = createMockTextNode({
      name: 'StyledText',
      textStyleId: 'S:abc123,',
    });

    const result = runDesignLint([text]);
    const textErrors = result.errors.filter(e => e.errorType === 'text');
    expect(textErrors.length).toBe(0);
  });

  it('skips GROUP, SLICE, and COMPONENT_SET nodes in lintNode', () => {
    // GROUP nodes should be traversed for children but not lint-checked themselves
    const group: any = {
      id: nextNodeId(),
      name: 'Group',
      type: 'GROUP',
      visible: true,
      locked: false,
      children: [],
    };

    const result = runDesignLint([group]);
    expect(result.summary.totalNodes).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it('respects settings that disable individual check categories', () => {
    const frame = createMockFrame({
      name: 'TestFrame',
      fills: [
        { type: 'SOLID', color: { r: 1, g: 0, b: 0 }, visible: true },
      ],
      fillStyleId: '',
      cornerRadius: 5,
    });

    const settings = {
      ...DEFAULT_LINT_SETTINGS,
      checkFills: false,
      checkRadius: false,
    };

    const result = runDesignLint([frame], settings);
    const fillErrors = result.errors.filter(e => e.errorType === 'fill');
    const radiusErrors = result.errors.filter(e => e.errorType === 'radius');
    expect(fillErrors.length).toBe(0);
    expect(radiusErrors.length).toBe(0);
  });

  it('uses severityOverrides to turn off specific error types', () => {
    const frame = createMockFrame({
      name: 'TestFrame',
      fills: [
        { type: 'SOLID', color: { r: 1, g: 0, b: 0 }, visible: true },
      ],
      fillStyleId: '',
    });

    const settings = {
      ...DEFAULT_LINT_SETTINGS,
      severityOverrides: { fill: 'off' as const },
    };

    const result = runDesignLint([frame], settings);
    const fillErrors = result.errors.filter(e => e.errorType === 'fill');
    expect(fillErrors.length).toBe(0);
  });

  it('applies ignorePatterns to filter errors by node name', () => {
    const frame = createMockFrame({
      name: 'Icon-24',
      fills: [
        { type: 'SOLID', color: { r: 1, g: 0, b: 0 }, visible: true },
      ],
      fillStyleId: '',
    });

    const settings = {
      ...DEFAULT_LINT_SETTINGS,
      ignorePatterns: ['Icon-*'],
    };

    const result = runDesignLint([frame], settings);
    expect(result.errors.length).toBe(0);
  });

  it('assigns default severity to errors that lack one', () => {
    const frame = createMockFrame({
      name: 'Frame',
      fills: [
        { type: 'SOLID', color: { r: 1, g: 0, b: 0 }, visible: true },
      ],
      fillStyleId: '',
    });

    const result = runDesignLint([frame]);
    for (const err of result.errors) {
      expect(err.severity).toBeDefined();
      expect(['critical', 'warning', 'info']).toContain(err.severity);
    }
  });
});

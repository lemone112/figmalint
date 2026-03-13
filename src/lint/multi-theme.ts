/// <reference types="@figma/plugin-typings" />

import { LintIssue } from './types';
import { getLuminance, getContrastRatio } from '../utils/figma-helpers';

// ──────────────────────────────────────────────
// Multi-Theme Validation Module
//
// Validates variable values across all modes simultaneously:
// - Identical values across modes (forgot to set dark mode value)
// - Missing mode values
// - Contrast degradation across modes (light vs dark)
// - Mode count mismatch within a collection
// ──────────────────────────────────────────────

let issueCounter = 0;
function nextId(): string {
  return `mtheme-${++issueCounter}`;
}

export interface MultiThemeLintResult {
  issues: LintIssue[];
  summary: {
    totalVariables: number;
    identicalAcrossModes: number;
    missingModeValues: number;
    contrastDegradation: number;
    modeCountMismatch: number;
  };
}

// ── Helpers ──

interface CollectionInfo {
  id: string;
  name: string;
  modes: Array<{ modeId: string; name: string }>;
  variableIds: string[];
}

interface VariableInfo {
  id: string;
  name: string;
  resolvedType: string;
  variableCollectionId: string;
  valuesByMode: Record<string, unknown>;
}

/**
 * Compare two variable values for equality.
 * Handles primitives, RGB, RGBA, and VariableAlias.
 */
function valuesAreEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (typeof a === 'object' && typeof b === 'object') {
    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;

    // VariableAlias
    if (ao.type === 'VARIABLE_ALIAS' && bo.type === 'VARIABLE_ALIAS') {
      return ao.id === bo.id;
    }

    // RGB / RGBA
    if ('r' in ao && 'g' in ao && 'b' in ao && 'r' in bo && 'g' in bo && 'b' in bo) {
      const tolerance = 0.001;
      if (Math.abs((ao.r as number) - (bo.r as number)) > tolerance) return false;
      if (Math.abs((ao.g as number) - (bo.g as number)) > tolerance) return false;
      if (Math.abs((ao.b as number) - (bo.b as number)) > tolerance) return false;
      if ('a' in ao && 'a' in bo) {
        if (Math.abs((ao.a as number) - (bo.a as number)) > tolerance) return false;
      }
      return true;
    }
  }

  return false;
}

/**
 * Extract RGB from a variable value (handles RGB, RGBA, ignores aliases).
 */
function extractRgb(value: unknown): { r: number; g: number; b: number } | null {
  if (!value || typeof value !== 'object') return null;
  const obj = value as Record<string, unknown>;

  // Skip aliases — cannot statically resolve
  if (obj.type === 'VARIABLE_ALIAS') return null;

  if (typeof obj.r === 'number' && typeof obj.g === 'number' && typeof obj.b === 'number') {
    return { r: obj.r as number, g: obj.g as number, b: obj.b as number };
  }

  return null;
}

/**
 * Format a variable value as human-readable string.
 */
function formatValue(value: unknown): string {
  if (value == null) return '(undefined)';
  if (typeof value === 'boolean' || typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  const obj = value as Record<string, unknown>;
  if (obj.type === 'VARIABLE_ALIAS') return `alias(${obj.id})`;
  if (typeof obj.r === 'number' && typeof obj.g === 'number' && typeof obj.b === 'number') {
    const r = Math.round((obj.r as number) * 255);
    const g = Math.round((obj.g as number) * 255);
    const b = Math.round((obj.b as number) * 255);
    return `rgb(${r}, ${g}, ${b})`;
  }
  return JSON.stringify(value);
}

// ── Naming convention heuristics for foreground/background pairing ──

/**
 * Attempt to find foreground/background pairs based on naming convention.
 * E.g., "fg-primary" pairs with "bg-primary", "text-primary" pairs with "surface-primary".
 */
function findFgBgPairs(
  variables: VariableInfo[]
): Array<{ fg: VariableInfo; bg: VariableInfo }> {
  const pairs: Array<{ fg: VariableInfo; bg: VariableInfo }> = [];
  const colorVars = variables.filter(v => v.resolvedType === 'COLOR');

  // Build maps for matching
  const fgPrefixes = ['fg', 'text', 'foreground', 'on'];
  const bgPrefixes = ['bg', 'surface', 'background'];

  const fgVars: Array<{ variable: VariableInfo; suffix: string }> = [];
  const bgVars: Array<{ variable: VariableInfo; suffix: string }> = [];

  for (const v of colorVars) {
    const nameLower = v.name.toLowerCase();
    const nameParts = nameLower.split(/[-_/]/);
    const firstPart = nameParts[0] ?? '';
    const suffix = nameParts.slice(1).join('-');

    if (fgPrefixes.includes(firstPart) && suffix) {
      fgVars.push({ variable: v, suffix });
    } else if (bgPrefixes.includes(firstPart) && suffix) {
      bgVars.push({ variable: v, suffix });
    }
  }

  // Match pairs by suffix
  for (const fg of fgVars) {
    const matchingBg = bgVars.find(bg => bg.suffix === fg.suffix);
    if (matchingBg) {
      pairs.push({ fg: fg.variable, bg: matchingBg.variable });
    }
  }

  return pairs;
}

// ── Async collection/variable fetching ──

async function getLocalCollections(): Promise<CollectionInfo[]> {
  try {
    const vars = figma.variables as any;
    const getCollections = vars.getLocalVariableCollectionsAsync;

    let collections: any[];
    if (typeof getCollections === 'function') {
      collections = await getCollections();
    } else if (typeof vars.getLocalVariableCollections === 'function') {
      collections = vars.getLocalVariableCollections();
    } else {
      return [];
    }

    return (collections ?? []).map((col: any) => ({
      id: (col?.id as string) ?? '',
      name: (col?.name as string) ?? '',
      modes: Array.isArray(col?.modes)
        ? (col.modes as Array<{ modeId: string; name: string }>)
        : [],
      variableIds: Array.isArray(col?.variableIds)
        ? (col.variableIds as string[])
        : [],
    }));
  } catch {
    return [];
  }
}

async function getVariableInfo(varId: string): Promise<VariableInfo | null> {
  try {
    const vars = figma.variables as any;
    let variable: any = null;

    if (typeof vars.getVariableByIdAsync === 'function') {
      variable = await vars.getVariableByIdAsync(varId);
    } else if (typeof vars.getVariableById === 'function') {
      variable = figma.variables.getVariableById(varId);
    }

    if (!variable) return null;

    return {
      id: varId,
      name: (variable.name as string) ?? '',
      resolvedType: (variable.resolvedType as string) ?? '',
      variableCollectionId: (variable.variableCollectionId as string) ?? '',
      valuesByMode: (variable.valuesByMode as Record<string, unknown>) ?? {},
    };
  } catch {
    return null;
  }
}

// ── Check functions ──

function checkIdenticalAcrossModes(
  variable: VariableInfo,
  collection: CollectionInfo,
  issues: LintIssue[]
): void {
  if (collection.modes.length < 2) return;

  const modeIds = collection.modes.map(m => m.modeId);
  const values = modeIds.map(mid => variable.valuesByMode[mid]);

  // Check if all values are identical
  const firstValue = values[0];
  const allIdentical = values.every(v => valuesAreEqual(v, firstValue));

  if (allIdentical && firstValue !== undefined) {
    // Only flag COLOR variables as warning (most common multi-theme issue)
    // Other types as info since they may be intentionally identical
    const severity = variable.resolvedType === 'COLOR' ? 'warning' as const : 'info' as const;

    // Skip if it's only info and not COLOR — too noisy for non-color vars
    if (severity === 'info') return;

    const modeNames = collection.modes.map(m => m.name).join(', ');
    issues.push({
      id: nextId(),
      type: 'theme',
      severity,
      nodeId: variable.id,
      nodeName: variable.name,
      message: `Variable "${variable.name}" has identical value across modes [${modeNames}] — may need per-mode values`,
      currentValue: formatValue(firstValue),
      suggestions: ['Set distinct values for each mode (e.g., light vs dark)'],
      autoFixable: false,
    });
  }
}

function checkMissingModeValues(
  variable: VariableInfo,
  collection: CollectionInfo,
  issues: LintIssue[]
): void {
  if (collection.modes.length < 2) return;

  const missingModes: string[] = [];
  for (const mode of collection.modes) {
    const value = variable.valuesByMode[mode.modeId];
    if (value === undefined) {
      missingModes.push(mode.name);
    }
  }

  if (missingModes.length > 0 && missingModes.length < collection.modes.length) {
    issues.push({
      id: nextId(),
      type: 'theme',
      severity: 'critical',
      nodeId: variable.id,
      nodeName: variable.name,
      message: `Variable "${variable.name}" is missing values for modes: ${missingModes.join(', ')}`,
      currentValue: `Defined in ${collection.modes.length - missingModes.length}/${collection.modes.length} modes`,
      suggestions: [`Add values for: ${missingModes.join(', ')}`],
      autoFixable: false,
    });
  }
}

function checkModeCountMismatch(
  variable: VariableInfo,
  collection: CollectionInfo,
  issues: LintIssue[]
): void {
  if (collection.modes.length < 2) return;

  const definedModeCount = Object.keys(variable.valuesByMode).filter(
    modeId => variable.valuesByMode[modeId] !== undefined
  ).length;

  if (definedModeCount > 0 && definedModeCount < collection.modes.length) {
    // Only flag if not already caught by checkMissingModeValues
    // (this targets edge cases where valuesByMode has extra/different keys)
    const definedKeys = new Set(Object.keys(variable.valuesByMode));
    const collectionModeIds = new Set(collection.modes.map(m => m.modeId));

    // Check for values in modes not in the collection (stale mode IDs)
    const staleModes = [...definedKeys].filter(k => !collectionModeIds.has(k));
    if (staleModes.length > 0) {
      issues.push({
        id: nextId(),
        type: 'theme',
        severity: 'warning',
        nodeId: variable.id,
        nodeName: variable.name,
        message: `Variable "${variable.name}" has ${definedModeCount} values but collection "${collection.name}" has ${collection.modes.length} modes`,
        currentValue: `${definedModeCount}/${collection.modes.length} modes defined`,
        suggestions: ['Ensure all collection modes have values assigned'],
        autoFixable: false,
      });
    }
  }
}

function checkContrastDegradation(
  fgVar: VariableInfo,
  bgVar: VariableInfo,
  collection: CollectionInfo,
  issues: LintIssue[]
): void {
  if (collection.modes.length < 2) return;

  const modeResults: Array<{
    modeName: string;
    ratio: number;
    passes: boolean;
  }> = [];

  for (const mode of collection.modes) {
    const fgValue = fgVar.valuesByMode[mode.modeId];
    const bgValue = bgVar.valuesByMode[mode.modeId];

    const fgRgb = extractRgb(fgValue);
    const bgRgb = extractRgb(bgValue);

    if (!fgRgb || !bgRgb) continue;

    const fgLum = getLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
    const bgLum = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
    const ratio = getContrastRatio(fgLum, bgLum);

    modeResults.push({
      modeName: mode.name,
      ratio,
      passes: ratio >= 4.5,
    });
  }

  if (modeResults.length < 2) return;

  // Check if contrast passes in some modes but fails in others
  const passingModes = modeResults.filter(r => r.passes);
  const failingModes = modeResults.filter(r => !r.passes);

  if (passingModes.length > 0 && failingModes.length > 0) {
    const failDetails = failingModes
      .map(m => `${m.modeName}: ${m.ratio.toFixed(1)}:1`)
      .join(', ');
    const passDetails = passingModes
      .map(m => `${m.modeName}: ${m.ratio.toFixed(1)}:1`)
      .join(', ');

    issues.push({
      id: nextId(),
      type: 'accessibility',
      severity: 'critical',
      nodeId: fgVar.id,
      nodeName: `${fgVar.name} / ${bgVar.name}`,
      message: `Contrast passes in [${passDetails}] but fails in [${failDetails}] — WCAG AA requires 4.5:1`,
      currentValue: failDetails,
      suggestions: ['Adjust colors so contrast meets WCAG AA in all modes'],
      autoFixable: false,
    });
  }
}

// ── Public API ──

/**
 * Run multi-theme validation across all variable collections and modes.
 * This is a document-level check that does not require node selection.
 *
 * @param _nodes - Unused but included for consistent module signature.
 */
export async function checkMultiTheme(
  _nodes: readonly SceneNode[],
  _options: { skipLocked?: boolean; skipHidden?: boolean } = {}
): Promise<MultiThemeLintResult> {
  issueCounter = 0;
  const issues: LintIssue[] = [];

  // 1. Get all local collections
  const collections = await getLocalCollections();
  if (collections.length === 0) {
    return {
      issues: [],
      summary: {
        totalVariables: 0,
        identicalAcrossModes: 0,
        missingModeValues: 0,
        contrastDegradation: 0,
        modeCountMismatch: 0,
      },
    };
  }

  let totalVariables = 0;

  // 2. Check each collection
  for (const collection of collections) {
    // Skip single-mode collections — no cross-mode checks possible
    if (collection.modes.length < 2) continue;

    const collectionVars: VariableInfo[] = [];

    for (const varId of collection.variableIds) {
      const variable = await getVariableInfo(varId);
      if (!variable) continue;

      collectionVars.push(variable);
      totalVariables++;

      checkIdenticalAcrossModes(variable, collection, issues);
      checkMissingModeValues(variable, collection, issues);
      checkModeCountMismatch(variable, collection, issues);
    }

    // 3. Check contrast degradation for fg/bg pairs
    const pairs = findFgBgPairs(collectionVars);
    for (const { fg, bg } of pairs) {
      checkContrastDegradation(fg, bg, collection, issues);
    }
  }

  return {
    issues,
    summary: {
      totalVariables,
      identicalAcrossModes: issues.filter(i => i.message.includes('identical value across modes')).length,
      missingModeValues: issues.filter(i => i.message.includes('missing values for modes')).length,
      contrastDegradation: issues.filter(i => i.message.includes('Contrast passes')).length,
      modeCountMismatch: issues.filter(i => i.message.includes('modes defined')).length,
    },
  };
}

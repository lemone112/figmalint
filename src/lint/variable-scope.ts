/// <reference types="@figma/plugin-typings" />

import { LintIssue } from './types';

// ──────────────────────────────────────────────
// Variable Scope Enforcement Module
//
// Checks that variables are used within their declared scopes:
// - COLOR variable used for non-color property
// - FLOAT variable scope mismatch (e.g., GAP var on CORNER_RADIUS)
// - ALL_SCOPES overuse (name suggests specific use)
// - Single-context usage but scoped to ALL
// ──────────────────────────────────────────────

let issueCounter = 0;
function nextId(): string {
  return `vscope-${++issueCounter}`;
}

export interface VariableScopeLintResult {
  issues: LintIssue[];
  summary: {
    totalChecked: number;
    colorScopeMismatch: number;
    floatScopeMismatch: number;
    allScopesOveruse: number;
    narrowingSuggestions: number;
  };
}

// ── Mapping from node bound-variable field to expected variable scopes ──

/**
 * Maps a node field name (from boundVariables) to the VariableScope values
 * that a variable should include in its `scopes` array.
 */
const FIELD_TO_EXPECTED_SCOPES: Record<string, string[]> = {
  // Color bindings (via fills/strokes)
  fills: ['ALL_FILLS', 'FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL', 'ALL_SCOPES'],
  strokes: ['STROKE_COLOR', 'ALL_SCOPES'],

  // Float bindings (spacing, sizing, radius)
  itemSpacing: ['GAP', 'ALL_SCOPES'],
  paddingLeft: ['GAP', 'ALL_SCOPES'],
  paddingRight: ['GAP', 'ALL_SCOPES'],
  paddingTop: ['GAP', 'ALL_SCOPES'],
  paddingBottom: ['GAP', 'ALL_SCOPES'],
  counterAxisSpacing: ['GAP', 'ALL_SCOPES'],
  topLeftRadius: ['CORNER_RADIUS', 'ALL_SCOPES'],
  topRightRadius: ['CORNER_RADIUS', 'ALL_SCOPES'],
  bottomLeftRadius: ['CORNER_RADIUS', 'ALL_SCOPES'],
  bottomRightRadius: ['CORNER_RADIUS', 'ALL_SCOPES'],
  width: ['WIDTH_HEIGHT', 'ALL_SCOPES'],
  height: ['WIDTH_HEIGHT', 'ALL_SCOPES'],
  minWidth: ['WIDTH_HEIGHT', 'ALL_SCOPES'],
  maxWidth: ['WIDTH_HEIGHT', 'ALL_SCOPES'],
  minHeight: ['WIDTH_HEIGHT', 'ALL_SCOPES'],
  maxHeight: ['WIDTH_HEIGHT', 'ALL_SCOPES'],
  strokeWeight: ['STROKE_FLOAT', 'ALL_SCOPES'],
  strokeTopWeight: ['STROKE_FLOAT', 'ALL_SCOPES'],
  strokeRightWeight: ['STROKE_FLOAT', 'ALL_SCOPES'],
  strokeBottomWeight: ['STROKE_FLOAT', 'ALL_SCOPES'],
  strokeLeftWeight: ['STROKE_FLOAT', 'ALL_SCOPES'],
  opacity: ['OPACITY', 'ALL_SCOPES'],

  // Text bindings
  fontFamily: ['FONT_FAMILY', 'ALL_SCOPES'],
  fontSize: ['FONT_SIZE', 'ALL_SCOPES'],
  fontStyle: ['FONT_STYLE', 'ALL_SCOPES'],
  fontWeight: ['FONT_WEIGHT', 'ALL_SCOPES'],
  lineHeight: ['LINE_HEIGHT', 'ALL_SCOPES'],
  letterSpacing: ['LETTER_SPACING', 'ALL_SCOPES'],
  paragraphSpacing: ['PARAGRAPH_SPACING', 'ALL_SCOPES'],
  paragraphIndent: ['PARAGRAPH_INDENT', 'ALL_SCOPES'],
};

/**
 * Human-readable label for a scope mismatch.
 */
function scopeLabel(field: string): string {
  const labels: Record<string, string> = {
    fills: 'fill color',
    strokes: 'stroke color',
    itemSpacing: 'gap',
    paddingLeft: 'padding',
    paddingRight: 'padding',
    paddingTop: 'padding',
    paddingBottom: 'padding',
    counterAxisSpacing: 'counter-axis gap',
    topLeftRadius: 'corner radius',
    topRightRadius: 'corner radius',
    bottomLeftRadius: 'corner radius',
    bottomRightRadius: 'corner radius',
    width: 'width',
    height: 'height',
    strokeWeight: 'stroke weight',
    opacity: 'opacity',
    fontSize: 'font size',
    fontFamily: 'font family',
    lineHeight: 'line height',
  };
  return labels[field] ?? field;
}

// ── Name-based scope suggestion patterns ──

const SCOPE_NAME_PATTERNS: Array<{ pattern: RegExp; expectedScopes: string[]; label: string }> = [
  { pattern: /^spacing[-_/]|[-_/]spacing$|^space[-_/]|[-_/]gap|^gap[-_/]/i, expectedScopes: ['GAP'], label: 'GAP/padding' },
  { pattern: /^radius[-_/]|[-_/]radius$|^corner[-_/]|^rounded[-_/]/i, expectedScopes: ['CORNER_RADIUS'], label: 'CORNER_RADIUS' },
  { pattern: /^size[-_/]|[-_/]size$|^width[-_/]|^height[-_/]/i, expectedScopes: ['WIDTH_HEIGHT'], label: 'WIDTH_HEIGHT' },
  { pattern: /^color[-_/]|[-_/]color$|^fg[-_/]|^bg[-_/]|^fill[-_/]|[-_/]fill$/i, expectedScopes: ['ALL_FILLS', 'STROKE_COLOR'], label: 'color fills/strokes' },
  { pattern: /^stroke[-_/]|[-_/]stroke$|^border[-_/]|[-_/]border$/i, expectedScopes: ['STROKE_COLOR', 'STROKE_FLOAT'], label: 'stroke' },
  { pattern: /^font[-_/]|[-_/]font$|^text[-_/]|[-_/]text$|^type[-_/]/i, expectedScopes: ['FONT_SIZE', 'FONT_FAMILY', 'FONT_WEIGHT', 'FONT_STYLE', 'LINE_HEIGHT', 'LETTER_SPACING', 'TEXT_FILL'], label: 'typography' },
  { pattern: /^opacity[-_/]|[-_/]opacity$/i, expectedScopes: ['OPACITY'], label: 'OPACITY' },
];

// ── Variable usage tracker (field -> variable ID set) ──

interface VariableUsage {
  variableId: string;
  field: string;
  nodeId: string;
  nodeName: string;
}

// ── Core check logic ──

function collectBoundVariableUsages(
  node: SceneNode,
  usages: VariableUsage[],
  skipLocked: boolean,
  skipHidden: boolean,
  parentLocked: boolean
): void {
  const isLocked = parentLocked || ('locked' in node && (node as any).locked === true);
  const isHidden = 'visible' in node && !node.visible;

  if (skipLocked && isLocked) return;
  if (skipHidden && isHidden) return;

  const bound = (node as any).boundVariables as
    | Record<string, unknown>
    | undefined;

  if (bound && typeof bound === 'object') {
    for (const [field, binding] of Object.entries(bound)) {
      if (!binding) continue;

      if (Array.isArray(binding)) {
        // Array bindings (fills, strokes, etc.)
        for (const alias of binding) {
          if (alias && typeof alias === 'object' && 'id' in alias) {
            usages.push({
              variableId: (alias as { id: string }).id,
              field,
              nodeId: node.id,
              nodeName: node.name,
            });
          }
        }
      } else if (typeof binding === 'object' && 'id' in binding) {
        // Single alias binding
        usages.push({
          variableId: (binding as { id: string }).id,
          field,
          nodeId: node.id,
          nodeName: node.name,
        });
      } else if (typeof binding === 'object') {
        // Nested object (e.g., componentProperties)
        for (const [_subKey, subBinding] of Object.entries(binding as Record<string, unknown>)) {
          if (subBinding && typeof subBinding === 'object' && 'id' in subBinding) {
            usages.push({
              variableId: (subBinding as { id: string }).id,
              field,
              nodeId: node.id,
              nodeName: node.name,
            });
          }
        }
      }
    }
  }

  // Recurse
  if ('children' in node) {
    const children = (node as any).children;
    if (Array.isArray(children)) {
      for (const child of children as SceneNode[]) {
        collectBoundVariableUsages(child, usages, skipLocked, skipHidden, isLocked);
      }
    }
  }
}

// ── Async variable resolution ──

interface ResolvedVariable {
  id: string;
  name: string;
  resolvedType: string;
  scopes: string[];
}

async function resolveVariable(variableId: string): Promise<ResolvedVariable | null> {
  try {
    const getByIdAsync = (figma.variables as any).getVariableByIdAsync;
    let variable: any = null;

    if (typeof getByIdAsync === 'function') {
      variable = await getByIdAsync(variableId);
    } else if (typeof figma.variables.getVariableById === 'function') {
      variable = figma.variables.getVariableById(variableId);
    }

    if (!variable) return null;

    return {
      id: variableId,
      name: (variable.name as string) ?? '',
      resolvedType: (variable.resolvedType as string) ?? '',
      scopes: Array.isArray(variable.scopes) ? (variable.scopes as string[]) : [],
    };
  } catch {
    return null;
  }
}

// ── Scope validation ──

/**
 * Map from a color field name to the specific scope(s) that are appropriate.
 * E.g. a variable bound to "fills" should have a fill-related scope,
 * while one bound to "strokes" should have STROKE_COLOR.
 */
const COLOR_FIELD_EXPECTED_SCOPES: Record<string, string[]> = {
  fills: ['ALL_FILLS', 'FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL'],
  strokes: ['STROKE_COLOR'],
  textRangeFills: ['TEXT_FILL', 'ALL_FILLS'],
};

function checkScopeMismatch(
  usage: VariableUsage,
  variable: ResolvedVariable,
  issues: LintIssue[]
): void {
  const expectedScopes = FIELD_TO_EXPECTED_SCOPES[usage.field];
  if (!expectedScopes) return;

  // Skip if variable has ALL_SCOPES — will be checked separately
  if (variable.scopes.includes('ALL_SCOPES')) return;

  // Check if any of the variable's scopes match the expected scopes for this field
  const hasMatchingScope = variable.scopes.some(s => expectedScopes.includes(s));

  if (!hasMatchingScope && variable.scopes.length > 0) {
    const severity: 'warning' | 'info' = 'warning';

    if (variable.resolvedType === 'COLOR') {
      // For COLOR variables, check field-specific scope alignment.
      // A STROKE_COLOR variable bound to fills (or vice versa) is a mismatch
      // even though both are "color fields".
      const fieldSpecificScopes = COLOR_FIELD_EXPECTED_SCOPES[usage.field];
      const hasFieldSpecificScope = fieldSpecificScopes
        ? variable.scopes.some(s => fieldSpecificScopes.includes(s))
        : false;

      if (!hasFieldSpecificScope) {
        const expectedLabel = fieldSpecificScopes
          ? fieldSpecificScopes.join(' or ')
          : scopeLabel(usage.field);
        issues.push({
          id: nextId(),
          type: 'naming',
          severity,
          nodeId: usage.nodeId,
          nodeName: usage.nodeName,
          message: `COLOR variable "${variable.name}" is bound to ${scopeLabel(usage.field)} — its scopes [${variable.scopes.join(', ')}] don't include ${expectedLabel}`,
          currentValue: `${variable.name} on ${usage.field}`,
          suggestions: [`Add ${expectedLabel} scope for ${scopeLabel(usage.field)} usage`],
          autoFixable: false,
        });
      }
    } else if (variable.resolvedType === 'FLOAT') {
      issues.push({
        id: nextId(),
        type: 'naming',
        severity,
        nodeId: usage.nodeId,
        nodeName: usage.nodeName,
        message: `FLOAT variable "${variable.name}" scoped to [${variable.scopes.join(', ')}] but bound to ${scopeLabel(usage.field)}`,
        currentValue: `${variable.name} on ${usage.field}`,
        suggestions: [`Verify scope includes ${expectedScopes.filter(s => s !== 'ALL_SCOPES').join(' or ')}`],
        autoFixable: false,
      });
    }
  }
}

function checkAllScopesOveruse(
  variable: ResolvedVariable,
  usageFields: string[],
  firstUsage: VariableUsage,
  issues: LintIssue[],
  seenVariableIds: Set<string>
): void {
  // Only flag once per variable
  if (seenVariableIds.has(variable.id)) return;
  seenVariableIds.add(variable.id);

  if (!variable.scopes.includes('ALL_SCOPES')) return;

  // Check if name suggests a specific scope
  for (const { pattern, label } of SCOPE_NAME_PATTERNS) {
    if (pattern.test(variable.name)) {
      issues.push({
        id: nextId(),
        type: 'naming',
        severity: 'info',
        nodeId: firstUsage.nodeId,
        nodeName: firstUsage.nodeName,
        message: `Variable "${variable.name}" has ALL_SCOPES but its name suggests it should be restricted to ${label}`,
        currentValue: `${variable.name}: ALL_SCOPES`,
        suggestions: [`Restrict scopes to ${label} for better picker organization`],
        autoFixable: false,
      });
      return; // One suggestion per variable
    }
  }

  // Check if only used in a single context
  const uniqueFields = [...new Set(usageFields)];
  if (uniqueFields.length === 1) {
    const expectedForField = FIELD_TO_EXPECTED_SCOPES[uniqueFields[0]];
    const narrowScope = expectedForField?.find(s => s !== 'ALL_SCOPES');
    if (narrowScope) {
      issues.push({
        id: nextId(),
        type: 'naming',
        severity: 'info',
        nodeId: firstUsage.nodeId,
        nodeName: firstUsage.nodeName,
        message: `Variable "${variable.name}" is only used for ${scopeLabel(uniqueFields[0])} but scoped to ALL — consider narrowing to ${narrowScope}`,
        currentValue: `${variable.name}: ALL_SCOPES (used in 1 context)`,
        suggestions: [`Narrow scope to ${narrowScope}`],
        autoFixable: false,
      });
    }
  }
}

// ── Public API ──

export async function checkVariableScope(
  nodes: readonly SceneNode[],
  options: { skipLocked?: boolean; skipHidden?: boolean } = {}
): Promise<VariableScopeLintResult> {
  const { skipLocked = true, skipHidden = true } = options;
  issueCounter = 0;

  const issues: LintIssue[] = [];
  const usages: VariableUsage[] = [];

  // 1. Collect all bound variable usages
  for (const node of nodes) {
    collectBoundVariableUsages(node, usages, skipLocked, skipHidden, false);
  }

  // 2. Resolve unique variables
  const uniqueVarIds = [...new Set(usages.map(u => u.variableId))];
  const resolvedCache = new Map<string, ResolvedVariable | null>();

  for (const varId of uniqueVarIds) {
    resolvedCache.set(varId, await resolveVariable(varId));
  }

  // 3. Group usages by variable ID for context analysis
  const usagesByVariable = new Map<string, VariableUsage[]>();
  for (const usage of usages) {
    const existing = usagesByVariable.get(usage.variableId) ?? [];
    existing.push(usage);
    usagesByVariable.set(usage.variableId, existing);
  }

  // 4. Run checks
  const seenForAllScopes = new Set<string>();

  for (const usage of usages) {
    const variable = resolvedCache.get(usage.variableId);
    if (!variable) continue;

    checkScopeMismatch(usage, variable, issues);
  }

  for (const [varId, varUsages] of usagesByVariable) {
    const variable = resolvedCache.get(varId);
    if (!variable || varUsages.length === 0) continue;

    checkAllScopesOveruse(
      variable,
      varUsages.map(u => u.field),
      varUsages[0],
      issues,
      seenForAllScopes
    );
  }

  return {
    issues,
    summary: {
      totalChecked: usages.length,
      colorScopeMismatch: issues.filter(i => i.message.includes('COLOR variable')).length,
      floatScopeMismatch: issues.filter(i => i.message.includes('FLOAT variable')).length,
      allScopesOveruse: issues.filter(i => i.message.includes('ALL_SCOPES') && i.message.includes('name suggests')).length,
      narrowingSuggestions: issues.filter(i => i.message.includes('consider narrowing')).length,
    },
  };
}

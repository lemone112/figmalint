/// <reference types="@figma/plugin-typings" />

import { LintIssue } from './types';

// ──────────────────────────────────────────────
// Component Property Lint Module
//
// Deterministic checks for component property hygiene:
// - Too many boolean properties (>5 suggests variant pattern)
// - Missing property description
// - Inconsistent variant naming (mixed casing)
// - Unused variant values
// - Property names with spaces
// ──────────────────────────────────────────────

let issueCounter = 0;
function nextId(): string {
  return `cprop-${++issueCounter}`;
}

export interface ComponentPropsLintResult {
  issues: LintIssue[];
  summary: {
    totalChecked: number;
    booleanOveruse: number;
    missingDescription: number;
    inconsistentNaming: number;
    unusedVariants: number;
    spacedNames: number;
  };
}

// ── Max booleans before suggesting variants ──
const MAX_BOOLEAN_PROPS = 5;

// ── Helpers ──

/**
 * Detect whether a set of strings uses mixed casing conventions.
 * Returns true if values contain a mix of patterns (e.g., "Primary" + "secondary").
 */
function hasMixedCasing(values: string[]): boolean {
  if (values.length < 2) return false;

  const patterns = new Set<string>();
  for (const v of values) {
    const trimmed = v.trim();
    if (trimmed.length === 0) continue;

    if (trimmed === trimmed.toUpperCase()) {
      patterns.add('UPPER');
    } else if (trimmed === trimmed.toLowerCase()) {
      patterns.add('lower');
    } else if (trimmed[0] === trimmed[0].toUpperCase() && trimmed.slice(1) !== trimmed.slice(1).toUpperCase()) {
      patterns.add('Title');
    } else {
      patterns.add('mixed');
    }
  }

  return patterns.size > 1;
}

/**
 * Check whether a property name contains spaces (should be camelCase or kebab-case).
 */
function hasSpaces(name: string): boolean {
  // Strip the Figma auto-appended ID suffix (e.g., "My Prop#1234:5")
  const baseName = name.includes('#') ? name.substring(0, name.indexOf('#')) : name;
  return /\s/.test(baseName.trim());
}

// ── Individual checks ──

function checkTooManyBooleans(
  node: SceneNode,
  propDefs: Record<string, { type: string }>,
  issues: LintIssue[]
): void {
  const booleanProps = Object.entries(propDefs).filter(
    ([_key, def]) => def?.type === 'BOOLEAN'
  );

  if (booleanProps.length > MAX_BOOLEAN_PROPS) {
    issues.push({
      id: nextId(),
      type: 'naming',
      severity: 'info',
      nodeId: node.id,
      nodeName: node.name,
      message: `Component has ${booleanProps.length} boolean properties (>${MAX_BOOLEAN_PROPS}) — consider using variants instead`,
      currentValue: `${booleanProps.length} booleans`,
      suggestions: ['Group related booleans into a single variant property'],
      autoFixable: false,
    });
  }
}

function checkMissingDescription(
  node: SceneNode,
  _propDefs: Record<string, { type: string; description?: string }>,
  issues: LintIssue[]
): void {
  // ComponentPropertyDefinition does NOT have a `description` field in the
  // Figma Plugin API. Only the component node itself exposes `.description`.
  const desc = (node as ComponentNode | ComponentSetNode).description;
  if (desc === undefined || desc === null || desc === '') {
    issues.push({
      id: nextId(),
      type: 'naming',
      severity: 'warning',
      nodeId: node.id,
      nodeName: node.name,
      message: `Component "${node.name}" has no description — consumers may not understand its purpose`,
      currentValue: `(no description)`,
      suggestions: ['Add a short description to the component explaining its intended usage'],
      autoFixable: false,
    });
  }
}

function checkInconsistentVariantNaming(
  node: SceneNode,
  propDefs: Record<string, { type: string; variantOptions?: string[] }>,
  issues: LintIssue[]
): void {
  // Only relevant for component sets with VARIANT properties
  if (node.type !== 'COMPONENT_SET') return;

  for (const [propName, def] of Object.entries(propDefs)) {
    if (!def || def.type !== 'VARIANT') continue;
    const options = def.variantOptions;
    if (!Array.isArray(options) || options.length < 2) continue;

    if (hasMixedCasing(options)) {
      const baseName = propName.includes('#') ? propName.substring(0, propName.indexOf('#')) : propName;
      issues.push({
        id: nextId(),
        type: 'naming',
        severity: 'warning',
        nodeId: node.id,
        nodeName: node.name,
        message: `Variant property "${baseName}" has inconsistent casing: ${options.map(o => `"${o}"`).join(', ')}`,
        currentValue: options.join(', '),
        suggestions: ['Use a consistent naming convention (e.g., all lowercase or all Title Case)'],
        autoFixable: false,
      });
    }
  }
}

function checkUnusedVariantValues(
  node: SceneNode,
  propDefs: Record<string, { type: string; variantOptions?: string[] }>,
  issues: LintIssue[]
): void {
  // Only relevant for component sets
  if (node.type !== 'COMPONENT_SET') return;

  const componentSet = node as ComponentSetNode;
  const children = componentSet.children;
  if (!Array.isArray(children) || children.length === 0) return;

  // Parse variant property values from child component names
  // Child names are like "Property=Value, Property2=Value2"
  const usedValues: Record<string, Set<string>> = {};

  for (const child of children) {
    const pairs = child.name.split(',').map((s: string) => s.trim());
    for (const pair of pairs) {
      const eqIdx = pair.indexOf('=');
      if (eqIdx === -1) continue;
      const key = pair.substring(0, eqIdx).trim();
      const val = pair.substring(eqIdx + 1).trim();
      if (!usedValues[key]) usedValues[key] = new Set();
      usedValues[key].add(val);
    }
  }

  for (const [propName, def] of Object.entries(propDefs)) {
    if (!def || def.type !== 'VARIANT') continue;
    const options = def.variantOptions;
    if (!Array.isArray(options)) continue;

    const baseName = propName.includes('#') ? propName.substring(0, propName.indexOf('#')) : propName;
    const used = usedValues[baseName];

    for (const option of options) {
      if (!used?.has(option)) {
        issues.push({
          id: nextId(),
          type: 'naming',
          severity: 'info',
          nodeId: node.id,
          nodeName: node.name,
          message: `Variant value "${option}" of "${baseName}" is defined but no child component uses it`,
          currentValue: `${baseName}=${option}`,
          suggestions: ['Remove the unused variant value or add a variant component for it'],
          autoFixable: false,
        });
      }
    }
  }
}

function checkPropertyNameSpaces(
  node: SceneNode,
  propDefs: Record<string, { type: string }>,
  issues: LintIssue[]
): void {
  for (const [propName, def] of Object.entries(propDefs)) {
    if (!def) continue;
    // Skip VARIANT types since those are user-visible labels
    if (def.type === 'VARIANT') continue;

    if (hasSpaces(propName)) {
      const baseName = propName.includes('#') ? propName.substring(0, propName.indexOf('#')) : propName;
      issues.push({
        id: nextId(),
        type: 'naming',
        severity: 'info',
        nodeId: node.id,
        nodeName: node.name,
        message: `Property name "${baseName}" contains spaces — use camelCase or kebab-case instead`,
        currentValue: baseName,
        suggestions: [
          baseName.replace(/\s+(.)/g, (_match, c: string) => c.toUpperCase()),
          baseName.replace(/\s+/g, '-').toLowerCase(),
        ],
        autoFixable: false,
      });
    }
  }
}

// ── Traversal ──

function traverseForComponentProps(
  node: SceneNode,
  issues: LintIssue[],
  skipLocked: boolean,
  skipHidden: boolean,
  parentLocked: boolean
): number {
  const isLocked = parentLocked || ('locked' in node && (node as any).locked === true);
  const isHidden = 'visible' in node && !node.visible;

  if (skipLocked && isLocked) return 0;
  if (skipHidden && isHidden) return 0;

  let checked = 0;

  // Check ComponentNode and ComponentSetNode
  if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
    const propDefs = (node as any).componentPropertyDefinitions as
      | Record<string, { type: string; variantOptions?: string[]; description?: string }>
      | undefined;

    if (propDefs && typeof propDefs === 'object') {
      checked++;

      checkTooManyBooleans(node, propDefs, issues);
      checkMissingDescription(node, propDefs, issues);
      checkInconsistentVariantNaming(node, propDefs, issues);
      checkUnusedVariantValues(node, propDefs, issues);
      checkPropertyNameSpaces(node, propDefs, issues);
    }
  }

  // Recurse into children
  if ('children' in node) {
    const children = (node as any).children;
    if (Array.isArray(children)) {
      for (const child of children as SceneNode[]) {
        checked += traverseForComponentProps(child, issues, skipLocked, skipHidden, isLocked);
      }
    }
  }

  return checked;
}

// ── Public API ──

export function checkComponentProps(
  nodes: readonly SceneNode[],
  options: { skipLocked?: boolean; skipHidden?: boolean } = {}
): ComponentPropsLintResult {
  const { skipLocked = true, skipHidden = true } = options;
  issueCounter = 0;

  const issues: LintIssue[] = [];
  let totalChecked = 0;

  for (const node of nodes) {
    totalChecked += traverseForComponentProps(node, issues, skipLocked, skipHidden, false);
  }

  return {
    issues,
    summary: {
      totalChecked,
      booleanOveruse: issues.filter(i => i.message.includes('boolean properties')).length,
      missingDescription: issues.filter(i => i.message.includes('no description')).length,
      inconsistentNaming: issues.filter(i => i.message.includes('inconsistent casing')).length,
      unusedVariants: issues.filter(i => i.message.includes('no child component uses it')).length,
      spacedNames: issues.filter(i => i.message.includes('contains spaces')).length,
    },
  };
}

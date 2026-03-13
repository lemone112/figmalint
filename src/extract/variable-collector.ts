/// <reference types="@figma/plugin-typings" />

// ──────────────────────────────────────────────
// Variable System Collector
// Extracts the full variable system from the Figma file.
// ──────────────────────────────────────────────

export interface VariableCollectionData {
  id: string;
  name: string;
  modes: Array<{ modeId: string; name: string }>;
  variables: VariableData[];
}

export interface VariableData {
  id: string;
  name: string;
  resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  description: string;
  valuesByMode: Record<string, unknown>; // modeId -> value
  scopes: string[];
  consumers: number; // how many nodes use this variable
}

export interface VariableSystemReport {
  collections: VariableCollectionData[];
  totalVariables: number;
  unusedVariables: string[]; // variable names with 0 consumers
  adoptionRate: number; // % of eligible nodes bound to variables
  modesCoverage: Record<string, number>; // modeName -> % variables with values
}

/**
 * Count how many nodes on the current page reference each variable ID.
 * Also counts total eligible nodes (those that *could* bind variables).
 */
function countVariableConsumers(
  nodes: readonly SceneNode[]
): { consumerMap: Map<string, number>; totalEligible: number; boundCount: number } {
  const consumerMap = new Map<string, number>();
  let totalEligible = 0;
  let boundCount = 0;

  function traverse(node: SceneNode): void {
    const n = node as any;
    // A node is eligible if it has fills, strokes, effects, or is a text node
    const hasFills = Array.isArray(n.fills) && n.fills.length > 0;
    const hasStrokes = Array.isArray(n.strokes) && n.strokes.length > 0;
    const hasEffects = Array.isArray(n.effects) && n.effects.length > 0;
    const isText = node.type === 'TEXT';
    const isFrame = node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE';

    if (hasFills || hasStrokes || hasEffects || isText || isFrame) {
      totalEligible++;
    }

    // Check boundVariables on the node itself
    let nodeBound = false;
    if ('boundVariables' in node && n.boundVariables) {
      const bv = n.boundVariables as Record<string, any>;
      for (const key of Object.keys(bv)) {
        const binding = bv[key];
        if (Array.isArray(binding)) {
          for (const b of binding) {
            if (b && b.id) {
              consumerMap.set(b.id, (consumerMap.get(b.id) || 0) + 1);
              nodeBound = true;
            }
          }
        } else if (binding && binding.id) {
          consumerMap.set(binding.id, (consumerMap.get(binding.id) || 0) + 1);
          nodeBound = true;
        }
      }
    }

    // Check boundVariables on fills and strokes
    if (Array.isArray(n.fills)) {
      for (const fill of n.fills) {
        if (fill.boundVariables) {
          for (const key of Object.keys(fill.boundVariables)) {
            const binding = fill.boundVariables[key];
            if (binding && binding.id) {
              consumerMap.set(binding.id, (consumerMap.get(binding.id) || 0) + 1);
              nodeBound = true;
            }
          }
        }
      }
    }

    if (nodeBound) {
      boundCount++;
    }

    // Recurse
    if ('children' in node && n.children) {
      for (const child of n.children as SceneNode[]) {
        traverse(child);
      }
    }
  }

  for (const node of nodes) {
    traverse(node);
  }

  return { consumerMap, totalEligible, boundCount };
}

/**
 * Collect the full variable system from the Figma file.
 * Traverses all local variable collections and counts consumers on the current page.
 */
export async function collectVariableSystem(): Promise<VariableSystemReport> {
  // Get all local variable collections
  const rawCollections = await figma.variables.getLocalVariableCollectionsAsync();

  // Count consumers from all nodes on the current page
  const allNodes = figma.currentPage.findAll(() => true);
  const { consumerMap, totalEligible, boundCount } = countVariableConsumers(allNodes);

  const collections: VariableCollectionData[] = [];
  let totalVariables = 0;
  const unusedVariables: string[] = [];
  const modeCoverageAccum: Record<string, { total: number; withValue: number }> = {};

  for (const collection of rawCollections) {
    const variables: VariableData[] = [];

    // Initialize mode coverage tracking for this collection
    for (const mode of collection.modes) {
      if (!modeCoverageAccum[mode.name]) {
        modeCoverageAccum[mode.name] = { total: 0, withValue: 0 };
      }
    }

    for (const varId of collection.variableIds) {
      const variable = await figma.variables.getVariableByIdAsync(varId);
      if (!variable) continue;

      totalVariables++;
      const consumers = consumerMap.get(variable.id) || 0;

      if (consumers === 0) {
        unusedVariables.push(variable.name);
      }

      // Serialize valuesByMode (the raw values may contain RGB objects etc.)
      const serializedValues: Record<string, unknown> = {};
      for (const [modeId, value] of Object.entries(variable.valuesByMode)) {
        serializedValues[modeId] = serializeVariableValue(value);
      }

      // Track mode coverage
      for (const mode of collection.modes) {
        modeCoverageAccum[mode.name].total++;
        const modeValue = variable.valuesByMode[mode.modeId];
        if (modeValue !== undefined && modeValue !== null) {
          modeCoverageAccum[mode.name].withValue++;
        }
      }

      variables.push({
        id: variable.id,
        name: variable.name,
        resolvedType: variable.resolvedType,
        description: variable.description,
        valuesByMode: serializedValues,
        scopes: variable.scopes,
        consumers,
      });
    }

    collections.push({
      id: collection.id,
      name: collection.name,
      modes: collection.modes.map(m => ({ modeId: m.modeId, name: m.name })),
      variables,
    });
  }

  // Calculate adoption rate
  const adoptionRate = totalEligible > 0
    ? Math.round((boundCount / totalEligible) * 100)
    : 0;

  // Calculate modes coverage
  const modesCoverage: Record<string, number> = {};
  for (const [modeName, counts] of Object.entries(modeCoverageAccum)) {
    modesCoverage[modeName] = counts.total > 0
      ? Math.round((counts.withValue / counts.total) * 100)
      : 100;
  }

  return {
    collections,
    totalVariables,
    unusedVariables,
    adoptionRate,
    modesCoverage,
  };
}

/**
 * Serialize a variable value for safe JSON transport.
 * Converts RGB/RGBA objects to hex strings, passes through primitives.
 */
function serializeVariableValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'boolean' || typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  // Check for VariableAlias
  if (typeof value === 'object' && (value as { type?: string }).type === 'VARIABLE_ALIAS') {
    return { type: 'VARIABLE_ALIAS', id: (value as { id: string }).id };
  }
  // Check for RGB/RGBA
  if (typeof value === 'object' && 'r' in (value as Record<string, unknown>)) {
    const rgb = value as { r: number; g: number; b: number; a?: number };
    const toHex = (n: number): string => {
      const hex = Math.round(n * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    if (rgb.a !== undefined && rgb.a < 1) {
      return `rgba(${Math.round(rgb.r * 255)}, ${Math.round(rgb.g * 255)}, ${Math.round(rgb.b * 255)}, ${rgb.a.toFixed(2)})`;
    }
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  }
  return value;
}

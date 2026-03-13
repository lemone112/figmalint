/// <reference types="@figma/plugin-typings" />

// ──────────────────────────────────────────────
// Mode Comparator
// Compares variable values across modes (e.g., Light vs Dark).
// ──────────────────────────────────────────────

export interface ModeComparisonData {
  collection: string;
  modes: Array<{
    modeId: string;
    modeName: string;
    screenshot?: string; // base64 if captured
  }>;
  variableDiffs: Array<{
    variableName: string;
    type: string;
    values: Record<string, unknown>; // modeName -> value
  }>;
  missingValues: Array<{
    variableName: string;
    missingModes: string[];
  }>;
}

/**
 * Compare variable values across all modes in a given collection.
 * Flags variables that differ between modes and those missing values in some modes.
 */
export async function compareModes(collectionId: string): Promise<ModeComparisonData> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const collection = collections.find(c => c.id === collectionId);
  if (!collection) {
    throw new Error(`Collection not found: ${collectionId}`);
  }

  const modes = collection.modes.map(m => ({
    modeId: m.modeId,
    modeName: m.name,
  }));

  const variableDiffs: ModeComparisonData['variableDiffs'] = [];
  const missingValues: ModeComparisonData['missingValues'] = [];

  for (const varId of collection.variableIds) {
    const variable = await figma.variables.getVariableByIdAsync(varId);
    if (!variable) continue;

    const values: Record<string, unknown> = {};
    const missing: string[] = [];
    let hasDiff = false;
    let firstValue: unknown = undefined;
    let firstSet = false;

    for (const mode of collection.modes) {
      const modeValue = variable.valuesByMode[mode.modeId];

      if (modeValue === undefined || modeValue === null) {
        missing.push(mode.name);
      } else {
        values[mode.name] = serializeValue(modeValue);
        if (!firstSet) {
          firstValue = JSON.stringify(serializeValue(modeValue));
          firstSet = true;
        } else {
          if (JSON.stringify(serializeValue(modeValue)) !== firstValue) {
            hasDiff = true;
          }
        }
      }
    }

    // Only include variables that differ across modes or have missing values
    if (hasDiff || missing.length > 0) {
      variableDiffs.push({
        variableName: variable.name,
        type: variable.resolvedType,
        values,
      });
    }

    if (missing.length > 0) {
      missingValues.push({
        variableName: variable.name,
        missingModes: missing,
      });
    }
  }

  return {
    collection: collection.name,
    modes,
    variableDiffs,
    missingValues,
  };
}

/**
 * Serialize a variable value for JSON transport.
 */
function serializeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'boolean' || typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  if (typeof value === 'object' && (value as { type?: string }).type === 'VARIABLE_ALIAS') {
    return { type: 'VARIABLE_ALIAS', id: (value as { id: string }).id };
  }
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

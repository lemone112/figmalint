// ──────────────────────────────────────────────
// W3C Design Token Community Group (DTCG) Parser
// Parses .tokens.json files in the DTCG format.
// Spec: https://tr.designtokens.org/format/
// ──────────────────────────────────────────────

export interface DTCGToken {
  path: string[]; // e.g., ['color', 'primary']
  name: string; // full dot-path: 'color.primary'
  $type: string;
  $value: unknown;
  $description?: string;
}

/**
 * Parse a DTCG-format JSON string into a flat list of tokens.
 * Tokens are identified by having a `$value` property.
 * `$type` is inherited from parent groups when not specified on the token itself.
 */
export function parseDTCG(json: string): DTCGToken[] {
  const root = JSON.parse(json);
  const tokens: DTCGToken[] = [];
  walkDTCG(root, [], undefined, tokens);
  return tokens;
}

/**
 * Recursively walk the DTCG JSON object tree.
 * Any object with a `$value` property is a token.
 * `$type` on a group is inherited by children without their own `$type`.
 */
function walkDTCG(
  node: Record<string, unknown>,
  path: string[],
  inheritedType: string | undefined,
  tokens: DTCGToken[]
): void {
  // Determine the type at this level (may be inherited by children)
  const levelType = typeof node.$type === 'string' ? node.$type : inheritedType;

  // If this node has $value, it's a token
  if ('$value' in node) {
    const tokenType = typeof node.$type === 'string' ? node.$type : (inheritedType || 'unknown');
    const description = typeof node.$description === 'string' ? node.$description : undefined;

    tokens.push({
      path: [...path],
      name: path.join('.'),
      $type: tokenType,
      $value: node.$value,
      $description: description,
    });
    return;
  }

  // Otherwise, recurse into child groups/tokens
  for (const [key, value] of Object.entries(node)) {
    // Skip DTCG metadata properties
    if (key.startsWith('$')) continue;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      walkDTCG(value as Record<string, unknown>, [...path, key], levelType, tokens);
    }
  }
}

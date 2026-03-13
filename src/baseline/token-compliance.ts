// ──────────────────────────────────────────────
// Token Compliance Checker
// Compares Figma variable system against DTCG token definitions.
// ──────────────────────────────────────────────

import type { VariableSystemReport, VariableData } from '../extract/variable-collector';
import type { DTCGToken } from './dtcg-parser';

export interface ComplianceResult {
  adoptionScore: number; // 0-100
  matched: Array<{ token: string; nodeCount: number; usage: 'correct' | 'overridden' }>;
  unmatched: Array<{ value: string; nodeCount: number; nearestToken: string; distance: number }>;
  orphanTokens: string[]; // tokens defined in DTCG but never used in design
  missingFromSystem: string[]; // values used in design but not in DTCG token system
  summary: {
    totalTokenDefs: number;
    usedInDesign: number;
    hardCodedValues: number;
    compliance: number;
  };
}

/**
 * Check how well the Figma variable system aligns with a DTCG token spec.
 */
export function checkTokenCompliance(
  variables: VariableSystemReport,
  dtcgTokens: DTCGToken[],
  _lintResult: unknown
): ComplianceResult {
  // Build maps for comparison
  const dtcgByName = new Map<string, DTCGToken>();
  for (const token of dtcgTokens) {
    dtcgByName.set(normalizeName(token.name), token);
  }

  // Flatten all Figma variables across collections
  const allVars: VariableData[] = [];
  for (const collection of variables.collections) {
    for (const v of collection.variables) {
      allVars.push(v);
    }
  }

  const matched: ComplianceResult['matched'] = [];
  const unmatched: ComplianceResult['unmatched'] = [];
  const matchedDTCGNames = new Set<string>();
  const figmaVarNames = new Set<string>();

  for (const variable of allVars) {
    const normalizedName = normalizeName(variable.name);
    figmaVarNames.add(normalizedName);

    // Try exact match
    if (dtcgByName.has(normalizedName)) {
      matchedDTCGNames.add(normalizedName);
      matched.push({
        token: variable.name,
        nodeCount: variable.consumers,
        usage: variable.consumers > 0 ? 'correct' : 'overridden',
      });
      continue;
    }

    // Try fuzzy match
    const nearest = findNearestToken(normalizedName, dtcgTokens);
    if (nearest && nearest.distance <= 3) {
      matchedDTCGNames.add(normalizeName(nearest.token.name));
      matched.push({
        token: variable.name,
        nodeCount: variable.consumers,
        usage: 'correct',
      });
    } else {
      // This Figma variable has no corresponding DTCG token
      unmatched.push({
        value: variable.name,
        nodeCount: variable.consumers,
        nearestToken: nearest ? nearest.token.name : '(none)',
        distance: nearest ? nearest.distance : Infinity,
      });
    }
  }

  // Find orphan tokens: defined in DTCG but not used in Figma
  const orphanTokens: string[] = [];
  for (const token of dtcgTokens) {
    if (!matchedDTCGNames.has(normalizeName(token.name))) {
      orphanTokens.push(token.name);
    }
  }

  // Find missing from system: Figma vars that don't map to any DTCG token
  const missingFromSystem = unmatched
    .filter(u => u.nodeCount > 0)
    .map(u => u.value);

  // Calculate scores
  const totalTokenDefs = dtcgTokens.length;
  const usedInDesign = matched.filter(m => m.nodeCount > 0).length;
  const hardCodedValues = unmatched.filter(u => u.nodeCount > 0).length;

  const totalRelevant = usedInDesign + hardCodedValues;
  const compliance = totalRelevant > 0
    ? Math.round((usedInDesign / totalRelevant) * 100)
    : (totalTokenDefs > 0 ? 0 : 100);

  // Adoption score combines variable adoption from Figma + DTCG alignment
  const adoptionScore = Math.round(
    (variables.adoptionRate * 0.5) + (compliance * 0.5)
  );

  return {
    adoptionScore,
    matched,
    unmatched,
    orphanTokens,
    missingFromSystem,
    summary: {
      totalTokenDefs,
      usedInDesign,
      hardCodedValues,
      compliance,
    },
  };
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/**
 * Normalize a token/variable name for comparison.
 * Converts slashes to dots, lowercases, strips whitespace.
 * e.g., "Color/Primary/500" -> "color.primary.500"
 */
function normalizeName(name: string): string {
  return name
    .replace(/\//g, '.')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .trim();
}

/**
 * Find the nearest DTCG token to a given name using Levenshtein distance.
 */
function findNearestToken(
  normalizedName: string,
  tokens: DTCGToken[]
): { token: DTCGToken; distance: number } | null {
  if (tokens.length === 0) return null;

  let best: { token: DTCGToken; distance: number } | null = null;

  for (const token of tokens) {
    const d = levenshtein(normalizedName, normalizeName(token.name));
    if (!best || d < best.distance) {
      best = { token, distance: d };
    }
    // Early exit on exact match
    if (d === 0) return best;
  }

  return best;
}

/**
 * Levenshtein edit distance between two strings.
 * Capped at maxDist for performance (returns maxDist+1 if exceeded).
 */
function levenshtein(a: string, b: string, maxDist: number = 10): number {
  if (a === b) return 0;
  if (a.length === 0) return Math.min(b.length, maxDist + 1);
  if (b.length === 0) return Math.min(a.length, maxDist + 1);

  // Use two-row optimization
  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);

  for (let j = 0; j <= b.length; j++) {
    prev[j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowMin = curr[0];

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,     // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost // substitution
      );
      if (curr[j] < rowMin) rowMin = curr[j];
    }

    // Early termination if all values in current row exceed maxDist
    if (rowMin > maxDist) return maxDist + 1;

    // Swap rows
    [prev, curr] = [curr, prev];
  }

  return prev[b.length];
}

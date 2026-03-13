/// <reference types="@figma/plugin-typings" />

// ──────────────────────────────────────────────
// Dark Mode Validation Checks
// Deterministic checks for common dark mode issues.
// ──────────────────────────────────────────────

import type { LintIssue } from './types';
import type { ModeComparisonData } from '../extract/mode-comparator';

export interface DarkModeResult {
  issues: LintIssue[];
  metrics: {
    pureBlackBackgrounds: number;
    pureWhiteText: number;
    lowContrastOnDark: number;
    missingModeValues: number;
  };
  summary: { totalChecked: number; passed: number; failed: number };
}

let issueCounter = 0;
function nextId(): string {
  return `dark-${++issueCounter}`;
}

/**
 * Run dark mode validation checks against mode comparison data.
 * Checks for common dark mode anti-patterns:
 * - Pure black (#000000) backgrounds
 * - Pure white (#FFFFFF) text on dark backgrounds
 * - Insufficient contrast between dark text and background colors
 * - Variables missing values in some modes
 * - Elevation: dark mode should use lighter surfaces, not shadows
 */
export function checkDarkMode(modeData: ModeComparisonData): DarkModeResult {
  issueCounter = 0;
  const issues: LintIssue[] = [];

  let pureBlackBackgrounds = 0;
  let pureWhiteText = 0;
  let lowContrastOnDark = 0;
  let missingModeValues = 0;

  // Identify which mode is likely the "dark" mode
  const darkModeNames = modeData.modes.filter(m =>
    /dark|night|dim/i.test(m.modeName)
  );
  const lightModeNames = modeData.modes.filter(m =>
    /light|day|default/i.test(m.modeName)
  );

  const darkModeName = darkModeNames.length > 0 ? darkModeNames[0].modeName : null;
  const lightModeName = lightModeNames.length > 0 ? lightModeNames[0].modeName : null;

  // Check variable diffs for dark mode issues
  for (const diff of modeData.variableDiffs) {
    if (diff.type !== 'COLOR') continue;

    // Get the dark mode value
    const darkValue = darkModeName ? diff.values[darkModeName] : null;
    const lightValue = lightModeName ? diff.values[lightModeName] : null;

    if (typeof darkValue !== 'string') continue;

    const darkHex = normalizeHex(darkValue);

    // Check: Pure black backgrounds
    if (darkHex === '#000000' && isLikelyBackground(diff.variableName)) {
      pureBlackBackgrounds++;
      issues.push({
        id: nextId(),
        type: 'accessibility',
        severity: 'warning',
        nodeId: '',
        nodeName: diff.variableName,
        message: `Dark mode background "${diff.variableName}" uses pure black (#000000). Use a dark grey (#121212 or #1a1a1a) for better readability and reduced eye strain.`,
        currentValue: darkValue,
        suggestions: ['#121212', '#1a1a1a', '#1e1e1e'],
        autoFixable: false,
      });
    }

    // Check: Pure white text on dark mode
    if (darkHex === '#ffffff' && isLikelyText(diff.variableName)) {
      pureWhiteText++;
      issues.push({
        id: nextId(),
        type: 'accessibility',
        severity: 'info',
        nodeId: '',
        nodeName: diff.variableName,
        message: `Dark mode text "${diff.variableName}" uses pure white (#FFFFFF). Consider off-white (#E0E0E0 or #EBEBEB) to reduce glare.`,
        currentValue: darkValue,
        suggestions: ['#e0e0e0', '#ebebeb', '#f5f5f5'],
        autoFixable: false,
      });
    }

    // Check: Insufficient contrast between light-dark value pairs
    if (typeof lightValue === 'string' && darkHex) {
      const lightHex = normalizeHex(lightValue);
      if (lightHex === darkHex) {
        // Same value in both modes — likely an oversight
        issues.push({
          id: nextId(),
          type: 'accessibility',
          severity: 'warning',
          nodeId: '',
          nodeName: diff.variableName,
          message: `Variable "${diff.variableName}" has identical value in Light and Dark modes (${lightValue}). This likely needs a dark mode adaptation.`,
          currentValue: `Light: ${lightValue}, Dark: ${darkValue}`,
          suggestions: ['Define a distinct dark mode value'],
          autoFixable: false,
        });
        lowContrastOnDark++;
      }
    }

    // Check: Elevation — dark mode surfaces that use very dark colors for all elevation levels
    if (isLikelySurface(diff.variableName) && darkHex) {
      const brightness = hexBrightness(darkHex);
      // In dark mode, elevated surfaces should be lighter (Material Design guidance)
      // If the variable name suggests elevation but the color is very dark, flag it
      if (/elevated|raised|overlay|modal|popover|sheet|card/i.test(diff.variableName) && brightness < 15) {
        issues.push({
          id: nextId(),
          type: 'accessibility',
          severity: 'info',
          nodeId: '',
          nodeName: diff.variableName,
          message: `Elevated surface "${diff.variableName}" in dark mode is very dark (${darkValue}). Material Design recommends lighter surfaces for elevated elements to convey depth.`,
          currentValue: darkValue,
          suggestions: ['Use a slightly lighter shade for elevated surfaces (e.g., #1e1e1e for default, #2c2c2c for elevated)'],
          autoFixable: false,
        });
      }
    }
  }

  // Check: Missing mode values
  for (const missing of modeData.missingValues) {
    missingModeValues++;
    issues.push({
      id: nextId(),
      type: 'accessibility',
      severity: 'critical',
      nodeId: '',
      nodeName: missing.variableName,
      message: `Variable "${missing.variableName}" is missing values for modes: ${missing.missingModes.join(', ')}. This will cause fallback behavior or errors.`,
      currentValue: `Missing in: ${missing.missingModes.join(', ')}`,
      suggestions: ['Add values for all modes'],
      autoFixable: false,
    });
  }

  const totalChecked = modeData.variableDiffs.length + modeData.missingValues.length;
  const failed = issues.length;

  return {
    issues,
    metrics: {
      pureBlackBackgrounds,
      pureWhiteText,
      lowContrastOnDark,
      missingModeValues,
    },
    summary: {
      totalChecked,
      passed: totalChecked - failed,
      failed,
    },
  };
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/**
 * Normalize a hex color string to lowercase 6-digit hex.
 * Handles #RGB, #RRGGBB, and rgba() formats.
 */
function normalizeHex(value: string): string | null {
  const trimmed = value.trim().toLowerCase();

  // Already a hex color
  if (trimmed.startsWith('#')) {
    if (trimmed.length === 4) {
      // #RGB -> #RRGGBB
      return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
    }
    if (trimmed.length === 7) {
      return trimmed;
    }
  }

  // Try to parse rgba(r, g, b, a)
  const rgbaMatch = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1], 10);
    const g = parseInt(rgbaMatch[2], 10);
    const b = parseInt(rgbaMatch[3], 10);
    const toHex = (n: number): string => {
      const hex = n.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  return null;
}

/**
 * Approximate brightness of a hex color (0-100 scale).
 * Uses perceived luminance formula.
 */
function hexBrightness(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Perceived brightness formula
  return (r * 299 + g * 587 + b * 114) / 2550;
}

/** Heuristic: does the variable name suggest a background color? */
function isLikelyBackground(name: string): boolean {
  return /background|bg|surface|canvas|base/i.test(name);
}

/** Heuristic: does the variable name suggest a text color? */
function isLikelyText(name: string): boolean {
  return /text|foreground|fg|content|body|heading|label|title|caption/i.test(name);
}

/** Heuristic: does the variable name suggest a surface/elevation element? */
function isLikelySurface(name: string): boolean {
  return /surface|background|bg|card|modal|sheet|popover|overlay|elevated|raised/i.test(name);
}

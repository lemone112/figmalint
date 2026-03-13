/// <reference types="@figma/plugin-typings" />

import { LintIssue } from './types';
import { rgbToHex } from '../utils/figma-helpers';

// ──────────────────────────────────────────────
// Conversion & CTA Analysis Lint Module
//
// Deterministic checks for conversion readiness:
// - CTA above fold (position in viewport)
// - CTA contrast against background
// - Form field count (friction)
// - Form labels present
// - Progress indicator for multi-step
// - Trust signals near CTA
// ──────────────────────────────────────────────

let issueCounter = 0;
function nextId(): string {
  return `conv-${++issueCounter}`;
}

export interface ConversionLintResult {
  issues: LintIssue[];
  metrics: {
    ctaCount: number;
    formFieldCount: number;
    ctaAboveFold: boolean;
    hasProgressIndicator: boolean;
  };
  summary: {
    totalChecked: number;
    passed: number;
    failed: number;
  };
}

const CTA_NAME_RE = /button|btn|cta|action|submit|primary/i;
const FORM_FIELD_RE = /input|field|text.?area|select|dropdown|picker|combo|search|email|password|phone|number.?field/i;
const PROGRESS_RE = /progress|step|stepper|breadcrumb|wizard|indicator|pagination/i;
const TRUST_RE = /badge|trust|security|lock|shield|guarantee|verified|secure|ssl|certification|review|rating|star/i;

// ── Helpers ──────────────────────────────────

function isCTA(node: SceneNode): boolean {
  if (CTA_NAME_RE.test(node.name)) return true;
  let parent = node.parent;
  let depth = 0;
  while (parent && depth < 3) {
    if ('name' in parent && CTA_NAME_RE.test(parent.name)) return true;
    parent = parent.parent;
    depth++;
  }
  return false;
}

function isFormField(node: SceneNode): boolean {
  return FORM_FIELD_RE.test(node.name);
}

function getBackgroundColor(frame: SceneNode): { r: number; g: number; b: number } | null {
  if (!('fills' in frame)) return null;
  const fills = frame.fills;
  if (fills === figma.mixed || !Array.isArray(fills)) return null;
  const solid = fills.find((f: Paint) => f.type === 'SOLID' && f.visible !== false) as SolidPaint | undefined;
  return solid ? solid.color : null;
}

function luminance(r: number, g: number, b: number): number {
  const sRGB = [r, g, b].map(c => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ── Collectors ──────────────────────────────────

interface CTANode {
  node: SceneNode;
  x: number;
  y: number;
  width: number;
  height: number;
  absoluteY: number;
}

interface FormFieldNode {
  node: SceneNode;
  hasLabel: boolean;
}

function collectCTAs(
  node: SceneNode,
  results: CTANode[],
  offsetY: number,
  skipLocked: boolean,
  skipHidden: boolean,
): void {
  if (skipLocked && 'locked' in node && (node as any).locked) return;
  if (skipHidden && 'visible' in node && !node.visible) return;

  if (isCTA(node) && 'width' in node && 'height' in node) {
    results.push({
      node,
      x: 'x' in node ? (node as any).x : 0,
      y: 'y' in node ? (node as any).y : 0,
      width: node.width,
      height: node.height,
      absoluteY: offsetY + ('y' in node ? (node as any).y : 0),
    });
  }

  if ('children' in node) {
    const childOffset = offsetY + ('y' in node ? (node as any).y : 0);
    for (const child of (node as any).children) {
      collectCTAs(child, results, childOffset, skipLocked, skipHidden);
    }
  }
}

function collectFormFields(
  node: SceneNode,
  results: FormFieldNode[],
  skipLocked: boolean,
  skipHidden: boolean,
): void {
  if (skipLocked && 'locked' in node && (node as any).locked) return;
  if (skipHidden && 'visible' in node && !node.visible) return;

  if (isFormField(node)) {
    // Check if there's a sibling or nearby text node that serves as label
    let hasLabel = false;
    const parent = node.parent;
    if (parent && 'children' in parent) {
      for (const sibling of (parent as any).children) {
        if (sibling.type === 'TEXT' && sibling.id !== node.id) {
          hasLabel = true;
          break;
        }
      }
    }
    results.push({ node, hasLabel });
  }

  if ('children' in node) {
    for (const child of (node as any).children) {
      collectFormFields(child, results, skipLocked, skipHidden);
    }
  }
}

function hasNodeMatching(
  node: SceneNode,
  pattern: RegExp,
  skipLocked: boolean,
  skipHidden: boolean,
): boolean {
  if (skipLocked && 'locked' in node && (node as any).locked) return false;
  if (skipHidden && 'visible' in node && !node.visible) return false;

  if (pattern.test(node.name)) return true;
  if ('children' in node) {
    for (const child of (node as any).children) {
      if (hasNodeMatching(child, pattern, skipLocked, skipHidden)) return true;
    }
  }
  return false;
}

// ── Checks ──────────────────────────────────

function checkCTAPosition(
  frame: SceneNode,
  ctas: CTANode[],
  issues: LintIssue[],
): boolean {
  if (ctas.length === 0) return false;
  if (!('height' in frame)) return false;

  const foldLine = (frame as any).height * 0.7;
  const aboveFold = ctas.some(cta => cta.y + cta.height < foldLine);

  if (!aboveFold) {
    issues.push({
      id: nextId(),
      type: 'accessibility',
      severity: 'warning',
      nodeId: ('id' in frame) ? frame.id : '',
      nodeName: ('name' in frame) ? frame.name : '',
      message: `No primary CTA visible above the fold (top 70% of frame). Move the main action higher for better conversion.`,
      currentValue: `CTA at ${Math.round(ctas[0].y)}px, fold at ${Math.round(foldLine)}px`,
      suggestions: ['Place primary CTA within top 70% of the viewport', 'Add a secondary CTA near the top if main CTA must stay below'],
      autoFixable: false,
    });
  }

  return aboveFold;
}

function checkCTAContrast(
  frame: SceneNode,
  ctas: CTANode[],
  issues: LintIssue[],
): void {
  const bgColor = getBackgroundColor(frame);
  if (!bgColor) return;

  const bgLum = luminance(bgColor.r, bgColor.g, bgColor.b);

  for (const cta of ctas) {
    const ctaColor = getBackgroundColor(cta.node);
    if (!ctaColor) continue;

    const ctaLum = luminance(ctaColor.r, ctaColor.g, ctaColor.b);
    const ratio = contrastRatio(bgLum, ctaLum);

    if (ratio < 3.0) {
      const ctaHex = rgbToHex(ctaColor.r, ctaColor.g, ctaColor.b);
      const bgHex = rgbToHex(bgColor.r, bgColor.g, bgColor.b);
      issues.push({
        id: nextId(),
        type: 'accessibility',
        severity: 'warning',
        nodeId: cta.node.id,
        nodeName: cta.node.name,
        message: `CTA contrast ratio ${ratio.toFixed(1)}:1 (${ctaHex} on ${bgHex}) — too low. CTAs should stand out with ≥3:1 contrast against background.`,
        currentValue: `${ratio.toFixed(1)}:1`,
        suggestions: ['Increase CTA background contrast to at least 3:1', 'Use a bolder accent color for the primary action'],
        autoFixable: false,
      });
    }
  }
}

function checkFormFriction(
  frame: SceneNode,
  fields: FormFieldNode[],
  issues: LintIssue[],
): void {
  if (fields.length > 5) {
    issues.push({
      id: nextId(),
      type: 'accessibility',
      severity: 'warning',
      nodeId: ('id' in frame) ? frame.id : '',
      nodeName: ('name' in frame) ? frame.name : '',
      message: `${fields.length} form fields on one screen. More than 5 fields increases abandonment — consider splitting into steps or removing optional fields.`,
      currentValue: `${fields.length} fields`,
      suggestions: [
        'Split into multi-step form with progress indicator',
        'Remove optional fields or move to "Advanced" section',
        'Expedia gained $12M/year by removing one field',
      ],
      autoFixable: false,
    });
  }

  // Check for labels
  const unlabeled = fields.filter(f => !f.hasLabel);
  if (unlabeled.length > 0) {
    issues.push({
      id: nextId(),
      type: 'accessibility',
      severity: 'warning',
      nodeId: unlabeled[0].node.id,
      nodeName: unlabeled[0].node.name,
      message: `${unlabeled.length} form field${unlabeled.length === 1 ? '' : 's'} without visible labels. Labels improve completion rate and accessibility.`,
      currentValue: `${unlabeled.length} unlabeled`,
      suggestions: ['Add visible label text above or beside each input', 'Don\'t rely on placeholder text alone as labels'],
      autoFixable: false,
    });
  }
}

function checkProgressIndicator(
  frame: SceneNode,
  fields: FormFieldNode[],
  issues: LintIssue[],
  skipLocked: boolean,
  skipHidden: boolean,
): boolean {
  // Only relevant if there are many fields (suggesting multi-step potential)
  if (fields.length <= 3) return false;

  const hasProgress = hasNodeMatching(frame, PROGRESS_RE, skipLocked, skipHidden);

  if (!hasProgress && fields.length > 5) {
    issues.push({
      id: nextId(),
      type: 'accessibility',
      severity: 'info',
      nodeId: ('id' in frame) ? frame.id : '',
      nodeName: ('name' in frame) ? frame.name : '',
      message: 'Long form without progress indicator. A step counter or progress bar reduces perceived effort.',
      suggestions: ['Add "Step 1 of 3" or a progress bar', 'Show users how far they\'ve come and what\'s left'],
      autoFixable: false,
    });
  }

  return hasProgress;
}

function checkTrustSignals(
  frame: SceneNode,
  ctas: CTANode[],
  issues: LintIssue[],
  skipLocked: boolean,
  skipHidden: boolean,
): void {
  if (ctas.length === 0) return;

  // Check if there's a form (purchase/signup context)
  const hasForm = hasNodeMatching(frame, FORM_FIELD_RE, skipLocked, skipHidden);
  if (!hasForm) return; // Trust signals mainly matter for forms

  const hasTrust = hasNodeMatching(frame, TRUST_RE, skipLocked, skipHidden);

  if (!hasTrust) {
    issues.push({
      id: nextId(),
      type: 'accessibility',
      severity: 'info',
      nodeId: ('id' in frame) ? frame.id : '',
      nodeName: ('name' in frame) ? frame.name : '',
      message: 'Form with CTA but no trust signals (security badges, reviews, guarantees). Trust elements near CTAs increase conversion.',
      suggestions: ['Add security badge or lock icon near submit button', 'Show testimonials, ratings, or guarantees near the CTA'],
      autoFixable: false,
    });
  }
}

// ── Public API ──────────────────────────────────

export function checkConversion(
  nodes: readonly SceneNode[],
  options: { skipLocked?: boolean; skipHidden?: boolean } = {},
): ConversionLintResult {
  issueCounter = 0;
  const issues: LintIssue[] = [];
  const skipLocked = options.skipLocked ?? true;
  const skipHidden = options.skipHidden ?? true;

  let totalCTAs = 0;
  let totalFields = 0;
  let anyAboveFold = false;
  let anyProgress = false;
  let totalChecked = 0;

  for (const node of nodes) {
    // Collect CTAs
    const ctas: CTANode[] = [];
    collectCTAs(node, ctas, 0, skipLocked, skipHidden);
    totalCTAs += ctas.length;

    // Collect form fields
    const fields: FormFieldNode[] = [];
    collectFormFields(node, fields, skipLocked, skipHidden);
    totalFields += fields.length;

    // Run checks
    if (ctas.length > 0) {
      const above = checkCTAPosition(node, ctas, issues);
      if (above) anyAboveFold = true;
      checkCTAContrast(node, ctas, issues);
      totalChecked += 2;
    }

    if (fields.length > 0) {
      checkFormFriction(node, fields, issues);
      const progress = checkProgressIndicator(node, fields, issues, skipLocked, skipHidden);
      if (progress) anyProgress = true;
      totalChecked += 2;
    }

    checkTrustSignals(node, ctas, issues, skipLocked, skipHidden);
    totalChecked++;
  }

  return {
    issues,
    metrics: {
      ctaCount: totalCTAs,
      formFieldCount: totalFields,
      ctaAboveFold: anyAboveFold,
      hasProgressIndicator: anyProgress,
    },
    summary: {
      totalChecked,
      passed: totalChecked - issues.length,
      failed: issues.length,
    },
  };
}

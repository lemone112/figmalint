/// <reference types="@figma/plugin-typings" />

import { LintIssue } from './types';

// ──────────────────────────────────────────────
// Microcopy & UX Writing Lint Module
//
// Deterministic checks for text quality:
// - "Click here" antipattern
// - Generic CTA labels
// - CTA word count (too short / too long)
// - Placeholder/lorem ipsum detection
// - Paragraph length (wall of text)
// - ALL CAPS overuse
// - Unformatted numbers
// - Empty text nodes
// ──────────────────────────────────────────────

let issueCounter = 0;
function nextId(): string {
  return `mc-${++issueCounter}`;
}

export interface MicrocopyLintResult {
  issues: LintIssue[];
  metrics: {
    totalTextNodes: number;
    ctaNodes: number;
    avgWordCount: number;
    longestParagraph: number;
  };
  summary: {
    totalChecked: number;
    passed: number;
    failed: number;
  };
}

// ── Patterns ──────────────────────────────────

const CLICK_HERE_RE = /\bclick\s+here\b/i;
const LEARN_MORE_BARE_RE = /^learn\s+more\.?$/i;
const TAP_HERE_RE = /\btap\s+here\b/i;

const GENERIC_CTAS = new Set([
  'submit', 'ok', 'okay', 'next', 'continue', 'go',
  'yes', 'no', 'done', 'send', 'save', 'apply',
]);

const PLACEHOLDER_RE = /\blorem\s+ipsum\b/i;
const PLACEHOLDER_GENERIC_RE = /^(enter\s+text|type\s+here|placeholder|sample\s+text|your\s+text|add\s+text)\.?$/i;

const UNFORMATTED_NUMBER_RE = /\b\d{4,}\b/; // 4+ digit number without formatting

const BUTTON_NAME_RE = /button|btn|cta|action|submit|link/i;

// ── Checks ──────────────────────────────────────

function isButtonContext(node: SceneNode): boolean {
  // Check if the text node or its ancestors look like a button
  if (BUTTON_NAME_RE.test(node.name)) return true;

  let parent = node.parent;
  let depth = 0;
  while (parent && depth < 4) {
    if ('name' in parent && BUTTON_NAME_RE.test(parent.name)) return true;
    if ('type' in parent && (parent.type === 'COMPONENT' || parent.type === 'INSTANCE')) {
      if ('name' in parent && BUTTON_NAME_RE.test(parent.name)) return true;
    }
    parent = parent.parent;
    depth++;
  }
  return false;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function checkTextNode(
  node: TextNode,
  issues: LintIssue[],
): void {
  const text = node.characters;
  if (!text || text.trim().length === 0) {
    // Empty text node
    issues.push({
      id: nextId(),
      type: 'naming',
      severity: 'info',
      nodeId: node.id,
      nodeName: node.name,
      message: 'Empty text node — remove or add content.',
      currentValue: '(empty)',
      autoFixable: false,
    });
    return;
  }

  const trimmed = text.trim();
  const words = wordCount(trimmed);
  const inButton = isButtonContext(node);

  // 1. "Click here" / "Tap here" antipattern
  if (CLICK_HERE_RE.test(trimmed) || TAP_HERE_RE.test(trimmed)) {
    issues.push({
      id: nextId(),
      type: 'naming',
      severity: 'warning',
      nodeId: node.id,
      nodeName: node.name,
      message: `"${trimmed.substring(0, 40)}" — avoid "click/tap here". Use descriptive action: "Download report", "View details".`,
      currentValue: trimmed.substring(0, 60),
      suggestions: ['Use verb + object: "Download PDF", "View pricing", "Start trial"'],
      autoFixable: false,
    });
  }

  // 2. Bare "Learn more" (no context)
  if (LEARN_MORE_BARE_RE.test(trimmed)) {
    issues.push({
      id: nextId(),
      type: 'naming',
      severity: 'info',
      nodeId: node.id,
      nodeName: node.name,
      message: '"Learn more" is vague — specify what the user will learn: "Learn more about pricing".',
      currentValue: trimmed,
      suggestions: ['Add specificity: "Learn more about [topic]"'],
      autoFixable: false,
    });
  }

  // 3. Generic CTA in button context
  if (inButton && words <= 2) {
    const lower = trimmed.toLowerCase().replace(/[.!]/g, '');
    if (GENERIC_CTAS.has(lower)) {
      issues.push({
        id: nextId(),
        type: 'naming',
        severity: 'info',
        nodeId: node.id,
        nodeName: node.name,
        message: `Generic CTA "${trimmed}" — use a specific action: "Save changes", "Send message", "Create account".`,
        currentValue: trimmed,
        suggestions: ['Replace with verb + object describing the outcome'],
        autoFixable: false,
      });
    }
  }

  // 4. CTA word count in button context
  if (inButton) {
    if (words > 5) {
      issues.push({
        id: nextId(),
        type: 'naming',
        severity: 'info',
        nodeId: node.id,
        nodeName: node.name,
        message: `CTA too long (${words} words): "${trimmed.substring(0, 50)}…". Keep CTAs to 2–5 words.`,
        currentValue: `${words} words`,
        suggestions: ['Shorten to verb + object (2-5 words)'],
        autoFixable: false,
      });
    }
  }

  // 5. Lorem ipsum / placeholder detection
  if (PLACEHOLDER_RE.test(trimmed) || PLACEHOLDER_GENERIC_RE.test(trimmed)) {
    issues.push({
      id: nextId(),
      type: 'naming',
      severity: 'warning',
      nodeId: node.id,
      nodeName: node.name,
      message: `Placeholder text detected: "${trimmed.substring(0, 40)}…". Replace with real content.`,
      currentValue: trimmed.substring(0, 60),
      suggestions: ['Replace with actual copy or realistic sample data'],
      autoFixable: false,
    });
  }

  // 6. Wall of text (long paragraph)
  if (words > 80 && !inButton) {
    issues.push({
      id: nextId(),
      type: 'naming',
      severity: 'info',
      nodeId: node.id,
      nodeName: node.name,
      message: `Long text block (${words} words). Break into shorter paragraphs or use bullet points for readability.`,
      currentValue: `${words} words`,
      suggestions: ['Break into paragraphs of ≤50 words', 'Use bullet points for lists', 'Add subheadings'],
      autoFixable: false,
    });
  }

  // 7. ALL CAPS detection (excluding short labels like "NEW", "SALE")
  if (trimmed === trimmed.toUpperCase() && trimmed !== trimmed.toLowerCase() && words > 3) {
    issues.push({
      id: nextId(),
      type: 'naming',
      severity: 'info',
      nodeId: node.id,
      nodeName: node.name,
      message: `All-caps text with ${words} words: "${trimmed.substring(0, 40)}…". ALL CAPS reduces readability — use sentence case or title case.`,
      currentValue: trimmed.substring(0, 60),
      suggestions: ['Use sentence case for readability', 'Reserve ALL CAPS for short labels (1-2 words)'],
      autoFixable: false,
    });
  }

  // 8. Unformatted large numbers
  if (UNFORMATTED_NUMBER_RE.test(trimmed)) {
    const matches = trimmed.match(/\b\d{4,}\b/g) || [];
    // Filter out years (1900-2099) and common non-formatted numbers
    const nonYears = matches.filter(m => {
      const n = parseInt(m, 10);
      return n < 1900 || n > 2099;
    });
    if (nonYears.length > 0) {
      issues.push({
        id: nextId(),
        type: 'naming',
        severity: 'info',
        nodeId: node.id,
        nodeName: node.name,
        message: `Unformatted number${nonYears.length > 1 ? 's' : ''}: ${nonYears.join(', ')}. Use thousand separators for readability.`,
        currentValue: nonYears.join(', '),
        suggestions: ['Format as 1,000,000 or 1 000 000'],
        autoFixable: false,
      });
    }
  }
}

// ── Traversal ──────────────────────────────────

function traverseForMicrocopy(
  node: SceneNode,
  issues: LintIssue[],
  metrics: { totalTextNodes: number; ctaNodes: number; wordCounts: number[]; longestParagraph: number },
  skipLocked: boolean,
  skipHidden: boolean,
): void {
  if (skipLocked && 'locked' in node && (node as any).locked) return;
  if (skipHidden && 'visible' in node && !node.visible) return;

  if (node.type === 'TEXT') {
    metrics.totalTextNodes++;
    const text = (node as TextNode).characters?.trim() || '';
    const words = wordCount(text);
    if (words > 0) {
      metrics.wordCounts.push(words);
      if (words > metrics.longestParagraph) {
        metrics.longestParagraph = words;
      }
    }
    if (isButtonContext(node)) {
      metrics.ctaNodes++;
    }
    checkTextNode(node as TextNode, issues);
  }

  if ('children' in node) {
    for (const child of (node as any).children) {
      traverseForMicrocopy(child, issues, metrics, skipLocked, skipHidden);
    }
  }
}

// ── Public API ──────────────────────────────────

export function checkMicrocopy(
  nodes: readonly SceneNode[],
  options: { skipLocked?: boolean; skipHidden?: boolean } = {},
): MicrocopyLintResult {
  issueCounter = 0;
  const issues: LintIssue[] = [];
  const skipLocked = options.skipLocked ?? true;
  const skipHidden = options.skipHidden ?? true;

  const metrics = {
    totalTextNodes: 0,
    ctaNodes: 0,
    wordCounts: [] as number[],
    longestParagraph: 0,
  };

  for (const node of nodes) {
    traverseForMicrocopy(node, issues, metrics, skipLocked, skipHidden);
  }

  const avgWordCount = metrics.wordCounts.length > 0
    ? metrics.wordCounts.reduce((a, b) => a + b, 0) / metrics.wordCounts.length
    : 0;

  return {
    issues,
    metrics: {
      totalTextNodes: metrics.totalTextNodes,
      ctaNodes: metrics.ctaNodes,
      avgWordCount: Math.round(avgWordCount * 10) / 10,
      longestParagraph: metrics.longestParagraph,
    },
    summary: {
      totalChecked: metrics.totalTextNodes,
      passed: metrics.totalTextNodes - issues.length,
      failed: issues.length,
    },
  };
}

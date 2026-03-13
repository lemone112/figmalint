import Anthropic from '@anthropic-ai/sdk';
import { buildA11ySpecPrompt } from '../prompts/a11y-spec.js';
import { getAnthropicClient, MODEL } from './claude.js';

// ── Types ──────────────────────────────────────

export interface A11ySpec {
  landmarks: Array<{ role: string; label: string; element: string }>;
  headingStructure: Array<{ level: number; text: string; element: string }>;
  focusOrder: Array<{ order: number; element: string; type: string; notes: string }>;
  ariaAnnotations: Array<{
    element: string;
    role: string;
    ariaLabel?: string;
    ariaDescribedBy?: string;
    ariaLive?: string;
    notes: string;
  }>;
  keyboardShortcuts: Array<{ key: string; action: string; element: string }>;
  liveRegions: Array<{ element: string; type: 'polite' | 'assertive'; trigger: string }>;
  colorContrastReport: Array<{
    element: string;
    foreground: string;
    background: string;
    ratio: number;
    passes: 'AA' | 'AAA' | 'fail';
  }>;
  recommendations: Array<{
    title: string;
    description: string;
    wcagCriterion: string;
    level: 'A' | 'AA' | 'AAA';
  }>;
}

export interface A11ySpecRequest {
  screenshot: string;
  extractedData: {
    componentName: string;
    componentDescription?: string;
    properties?: Array<{ name: string; type: string }>;
    states?: string[];
    metadata?: {
      nodeId: string;
      nodeType: string;
      width: number;
      height: number;
      hasAutoLayout: boolean;
      childCount: number;
    };
  };
  lintResult: {
    summary: {
      totalErrors: number;
      byType: Record<string, number>;
      totalNodes: number;
      nodesWithErrors: number;
    };
    errors: Array<{
      nodeId: string;
      nodeName: string;
      errorType: string;
      message: string;
      value: string;
    }>;
  };
  sessionId?: string;
}

// ── Validation helpers ──────────────────────────

const VALID_CONTRAST = new Set(['AA', 'AAA', 'fail']);
const VALID_LEVEL = new Set(['A', 'AA', 'AAA']);
const VALID_LIVE = new Set(['polite', 'assertive']);

function normalizeA11ySpec(parsed: Record<string, unknown>): A11ySpec {
  return {
    landmarks: Array.isArray(parsed.landmarks)
      ? (parsed.landmarks as A11ySpec['landmarks']).map((l) => ({
          role: typeof l.role === 'string' ? l.role : '',
          label: typeof l.label === 'string' ? l.label : '',
          element: typeof l.element === 'string' ? l.element : '',
        }))
      : [],

    headingStructure: Array.isArray(parsed.headingStructure)
      ? (parsed.headingStructure as A11ySpec['headingStructure']).map((h) => ({
          level: typeof h.level === 'number' ? h.level : 1,
          text: typeof h.text === 'string' ? h.text : '',
          element: typeof h.element === 'string' ? h.element : '',
        }))
      : [],

    focusOrder: Array.isArray(parsed.focusOrder)
      ? (parsed.focusOrder as A11ySpec['focusOrder']).map((f) => ({
          order: typeof f.order === 'number' ? f.order : 0,
          element: typeof f.element === 'string' ? f.element : '',
          type: typeof f.type === 'string' ? f.type : 'interactive',
          notes: typeof f.notes === 'string' ? f.notes : '',
        }))
      : [],

    ariaAnnotations: Array.isArray(parsed.ariaAnnotations)
      ? (parsed.ariaAnnotations as A11ySpec['ariaAnnotations']).map((a) => ({
          element: typeof a.element === 'string' ? a.element : '',
          role: typeof a.role === 'string' ? a.role : '',
          ariaLabel: typeof a.ariaLabel === 'string' ? a.ariaLabel : undefined,
          ariaDescribedBy:
            typeof a.ariaDescribedBy === 'string' ? a.ariaDescribedBy : undefined,
          ariaLive: typeof a.ariaLive === 'string' ? a.ariaLive : undefined,
          notes: typeof a.notes === 'string' ? a.notes : '',
        }))
      : [],

    keyboardShortcuts: Array.isArray(parsed.keyboardShortcuts)
      ? (parsed.keyboardShortcuts as A11ySpec['keyboardShortcuts']).map(
          (k) => ({
            key: typeof k.key === 'string' ? k.key : '',
            action: typeof k.action === 'string' ? k.action : '',
            element: typeof k.element === 'string' ? k.element : '',
          }),
        )
      : [],

    liveRegions: Array.isArray(parsed.liveRegions)
      ? (parsed.liveRegions as A11ySpec['liveRegions']).map((lr) => ({
          element: typeof lr.element === 'string' ? lr.element : '',
          type: VALID_LIVE.has(lr.type) ? lr.type : 'polite',
          trigger: typeof lr.trigger === 'string' ? lr.trigger : '',
        }))
      : [],

    colorContrastReport: Array.isArray(parsed.colorContrastReport)
      ? (parsed.colorContrastReport as A11ySpec['colorContrastReport']).map(
          (cc) => ({
            element: typeof cc.element === 'string' ? cc.element : '',
            foreground: typeof cc.foreground === 'string' ? cc.foreground : '',
            background: typeof cc.background === 'string' ? cc.background : '',
            ratio: typeof cc.ratio === 'number' ? cc.ratio : 0,
            passes: VALID_CONTRAST.has(cc.passes)
              ? cc.passes
              : 'fail',
          }),
        )
      : [],

    recommendations: Array.isArray(parsed.recommendations)
      ? (parsed.recommendations as A11ySpec['recommendations']).map((r) => ({
          title: typeof r.title === 'string' ? r.title : '',
          description: typeof r.description === 'string' ? r.description : '',
          wcagCriterion:
            typeof r.wcagCriterion === 'string' ? r.wcagCriterion : '',
          level: VALID_LEVEL.has(r.level) ? r.level : 'AA',
        }))
      : [],
  };
}

// ── Main Generator ──────────────────────────────

export async function generateA11ySpec(
  screenshot: string,
  extractedData: A11ySpecRequest['extractedData'],
  lintResult: A11ySpecRequest['lintResult'],
  _sessionId: string,
): Promise<A11ySpec> {
  const client = getAnthropicClient();

  // Build component info text
  const meta = extractedData.metadata;
  const componentInfo = [
    `Name: ${extractedData.componentName}`,
    extractedData.componentDescription
      ? `Description: ${extractedData.componentDescription}`
      : '',
    meta
      ? `Type: ${meta.nodeType}, Size: ${meta.width}x${meta.height}, Auto-layout: ${meta.hasAutoLayout ? 'yes' : 'no'}, Children: ${meta.childCount}`
      : '',
    extractedData.states?.length
      ? `States: ${extractedData.states.join(', ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  // Build lint summary
  const bt = lintResult.summary.byType || {};
  const lintSummary = `${lintResult.summary.totalErrors} issues: ${bt.accessibility ?? 0} accessibility, ${bt.fill ?? 0} fills, ${bt.text ?? 0} text, ${bt.cognitive ?? 0} cognitive`;

  const prompt = buildA11ySpecPrompt(componentInfo, lintSummary);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 5000,
    system:
      'You are a WCAG 2.2 accessibility expert. You generate thorough, actionable accessibility specifications from UI design screenshots. Respond in JSON format.',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: screenshot,
            },
          },
          { type: 'text', text: prompt },
        ],
      },
    ],
  });

  if (!response.content.length || response.content[0].type !== 'text') {
    throw new Error('Empty response from a11y spec generation');
  }

  const text = response.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON in a11y spec response');
  }

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  return normalizeA11ySpec(parsed);
}

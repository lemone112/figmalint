import { fetchDesignSystemContext, type SourceReference } from './design-knowledge.js';
import { buildDesignKnowledgeSection } from '../prompts/design-knowledge.js';
import { detectPageType, generateReview, getAnthropicClient, MODEL, type PageTypeResult } from './claude.js';
import { runReferoComparison, type ReferoComparison } from './refero.js';
import { startSession, loadSession, saveAnalysisResult, saveReferoResult } from './session.js';
import { buildThreeLayerPrompt, type ThreeLayerExplanation } from '../prompts/three-layer.js';
import {
  filterByConfidence,
  sortByConfidence,
  withConfidenceScoring,
  type ConfidencedFinding,
} from './confidence-filter.js';
import { SYSTEM_PROMPT } from '../prompts/system.js';

export interface AnalyzeRequest {
  screenshot: string;
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
    tokenSummary?: {
      totalTokens: number;
      boundToVariables: number;
      boundToStyles: number;
      hardCoded: number;
    };
  };
  sessionId?: string;
  mode: 'quick' | 'deep';
  /** Optional extended features to enable on this analysis run. */
  features?: {
    /** Generate three-layer explanations (rule / why / real-world) for the top-N lint issues. Default: 0 (disabled). */
    threeLayerExplanations?: boolean;
    /** Run confidence scoring on all AI findings and filter low-confidence results. Default: false. */
    confidenceScoring?: boolean;
  };
}

export interface AiReviewCategory {
  rating: 'pass' | 'needs_improvement' | 'fail';
  evidence: string[];
  recommendation: string | null;
}

export interface AiReviewResult {
  visualHierarchy: AiReviewCategory;
  statesCoverage: AiReviewCategory & { missingStates: string[] };
  platformAlignment: AiReviewCategory & { detectedPlatform: string };
  colorHarmony: AiReviewCategory;
  visualBalance: AiReviewCategory;
  microcopyQuality: AiReviewCategory;
  cognitiveLoad: AiReviewCategory;
  recommendations: Array<{ title: string; description: string; severity: string }>;
  summary: string;
}

export interface AnalysisResult {
  sessionId: string;
  pageType: string;
  /** Confidence of the page-type classification (0-1). */
  pageTypeConfidence?: number;
  /** Signals that matched during page-type detection. */
  pageTypeSignals?: string[];
  lintResult: AnalyzeRequest['lintResult'];
  aiReview: AiReviewResult;
  referoComparison?: ReferoComparison;
  designHealthScore: number;
  /** Authoritative sources used to ground the AI review (Thesis #50) */
  designSystemSources?: SourceReference[];
  /** Three-layer explanations for the top lint issues (when feature enabled). */
  threeLayerExplanations?: ThreeLayerExplanation[];
  /** Confidence-scored and filtered AI findings (when feature enabled). */
  confidencedFindings?: ConfidencedFinding[];
}

/**
 * Run full analysis: page type detection + AI review + Refero comparison.
 */
export async function runAnalysis(req: AnalyzeRequest): Promise<AnalysisResult> {
  let sessionId: string;
  if (req.sessionId) {
    const existing = loadSession(req.sessionId);
    if (!existing) {
      throw new Error(`Session not found: ${req.sessionId}`);
    }
    sessionId = req.sessionId;
  } else {
    sessionId = startSession(
      req.extractedData.metadata?.nodeId,
      req.extractedData.componentName
    );
  }

  // Build lint summary text — safely access byType keys with fallback to 0
  const bt = req.lintResult.summary.byType || {};
  const lintSummary = `${req.lintResult.summary.totalErrors} issues: ${bt.fill ?? 0} fills, ${bt.stroke ?? 0} strokes, ${bt.effect ?? 0} effects, ${bt.text ?? 0} text, ${bt.radius ?? 0} radius, ${bt.spacing ?? 0} spacing, ${bt.autoLayout ?? 0} auto-layout, ${bt.visualQuality ?? 0} visual quality, ${bt.microcopy ?? 0} microcopy, ${bt.conversion ?? 0} conversion, ${bt.cognitive ?? 0} cognitive`;

  // Build component info
  const meta = req.extractedData.metadata;
  const ts = req.extractedData.tokenSummary;
  const componentInfo = [
    `Name: ${req.extractedData.componentName}`,
    req.extractedData.componentDescription ? `Description: ${req.extractedData.componentDescription}` : '',
    meta ? `Type: ${meta.nodeType}, Size: ${meta.width}x${meta.height}, Auto-layout: ${meta.hasAutoLayout ? 'yes' : 'no'}, Children: ${meta.childCount}` : '',
    req.extractedData.states?.length ? `States: ${req.extractedData.states.join(', ')}` : '',
    ts ? `Design tokens: ${ts.totalTokens} total (${ts.boundToVariables} variables, ${ts.boundToStyles} styles, ${ts.hardCoded} hard-coded)` : '',
  ].filter(Boolean).join('\n');

  // Phase 1a: page type + design knowledge in parallel (both fast)
  const componentFamily = inferComponentFamily(req.extractedData.componentName);

  const [pageTypeResult, designKnowledgeResult] = await Promise.allSettled([
    detectPageType(req.screenshot),
    fetchDesignSystemContext(req.extractedData.componentName, componentFamily),
  ]);

  const pageTypeData: PageTypeResult = pageTypeResult.status === 'fulfilled'
    ? pageTypeResult.value
    : { type: 'unknown', confidence: 0, signals: [] };
  const pageType = pageTypeData.type;
  const designKnowledge = designKnowledgeResult.status === 'fulfilled'
    ? designKnowledgeResult.value
    : null;

  // Phase 1b: AI review with design knowledge context
  const designKnowledgeText = designKnowledge
    ? buildDesignKnowledgeSection(designKnowledge)
    : undefined;

  const [aiReviewSettled] = await Promise.allSettled([
    generateReview(req.screenshot, lintSummary, componentInfo, designKnowledgeText),
  ]);

  const defaultCategory: AiReviewCategory = { rating: 'fail', evidence: ['AI review unavailable'], recommendation: null };
  const aiReview: AiReviewResult = aiReviewSettled.status === 'fulfilled'
    ? aiReviewSettled.value
    : {
        visualHierarchy: { ...defaultCategory },
        statesCoverage: { ...defaultCategory, missingStates: [] },
        platformAlignment: { ...defaultCategory, detectedPlatform: 'unknown' },
        colorHarmony: { ...defaultCategory },
        visualBalance: { ...defaultCategory },
        microcopyQuality: { ...defaultCategory },
        cognitiveLoad: { ...defaultCategory },
        recommendations: [],
        summary: 'AI review was unavailable for this analysis.',
      };

  // Phase 2: Run Refero comparison (depends on pageType, non-blocking)
  // In 'deep' mode or when Refero is available, fetch comparisons
  let referoComparison: ReferoComparison | null = null;
  if (req.mode === 'deep') {
    referoComparison = await runReferoComparison(
      pageType,
      componentInfo,
      req.screenshot,
      getAnthropicClient(),
    );
  } else {
    // In quick mode, fire Refero in background — don't block the response
    runReferoComparison(pageType, componentInfo, req.screenshot, getAnthropicClient())
      .then(result => {
        if (result) {
          saveReferoResult(sessionId, result);
        }
      })
      .catch(() => { /* Refero failure is non-critical */ });
  }

  // Compute Design Health Score — severity-weighted, no AI component
  // Weights aligned with UI: Tokens 25%, A11y 25%, Spacing 18%, Layout 10%, Naming 7%, Visual 8%, Microcopy 7%
  const SEVERITY_WEIGHT: Record<string, number> = { critical: 10, warning: 3, info: 1 };
  const errors = req.lintResult.errors;
  const total = Math.max(req.lintResult.summary.totalNodes, 1);

  function severityScore(errs: typeof errors, checkable: number): number {
    const failed = errs.length;
    const passed = Math.max(0, checkable - failed);
    const weightedFailed = errs.reduce((sum, e) => sum + (SEVERITY_WEIGHT[(e as any).severity || 'warning'] || 3), 0);
    const weightedPassed = passed * 10;
    const t = weightedPassed + weightedFailed;
    return t > 0 ? Math.round((weightedPassed / t) * 100) : 100;
  }

  const GENERIC_NAME_RE = /^(Frame|Group|Rectangle|Ellipse|Vector|Line|Polygon|Star)\s*\d+$/i;

  const tokenErrors = errors.filter(e => ['fill', 'stroke', 'effect', 'text'].includes(e.errorType));
  const spacingErrors = errors.filter(e => e.errorType === 'spacing');
  const layoutErrors = errors.filter(e => e.errorType === 'autoLayout');
  const a11yErrors = errors.filter(e => e.errorType === 'accessibility' && !GENERIC_NAME_RE.test(e.nodeName));
  const namingErrors = errors.filter(e =>
    (e.errorType === 'accessibility' && GENERIC_NAME_RE.test(e.nodeName)) || e.errorType === 'radius'
  );
  const visualQualityErrors = errors.filter(e => e.errorType === 'visualQuality');
  const microcopyErrors = errors.filter(e => e.errorType === 'microcopy');
  const conversionErrors = errors.filter(e => e.errorType === 'conversion');
  const cognitiveErrors = errors.filter(e => e.errorType === 'cognitive');

  const designHealthScore = Math.round(
    severityScore(tokenErrors, total * 4) * 0.20 +
    severityScore(a11yErrors, total) * 0.20 +
    severityScore(spacingErrors, total) * 0.12 +
    severityScore(visualQualityErrors, total) * 0.10 +
    severityScore(microcopyErrors, total) * 0.08 +
    severityScore(conversionErrors, total) * 0.10 +
    severityScore(cognitiveErrors, total) * 0.08 +
    severityScore(layoutErrors, total) * 0.08 +
    severityScore(namingErrors, total) * 0.04
  );

  // Phase 3: Optional extended features (non-blocking, run in parallel)
  const features = req.features ?? {};
  let threeLayerExplanations: ThreeLayerExplanation[] | undefined;
  let confidencedFindings: ConfidencedFinding[] | undefined;

  const extendedPromises: Array<Promise<void>> = [];

  // Three-layer explanations for top-5 lint issues
  if (features.threeLayerExplanations && req.lintResult.errors.length > 0) {
    const topErrors = req.lintResult.errors.slice(0, 5);
    const threeLayerPrompt = buildThreeLayerPrompt(topErrors);

    if (threeLayerPrompt) {
      extendedPromises.push(
        (async () => {
          try {
            const client = getAnthropicClient();
            const response = await client.messages.create({
              model: MODEL,
              max_tokens: 2000,
              system: SYSTEM_PROMPT,
              messages: [{ role: 'user', content: threeLayerPrompt }],
            });
            if (response.content.length && response.content[0].type === 'text') {
              const jsonMatch = response.content[0].text.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed.explanations)) {
                  threeLayerExplanations = parsed.explanations;
                }
              }
            }
          } catch (err) {
            console.error('Three-layer explanation failed:', err);
          }
        })(),
      );
    }
  }

  // Confidence scoring: extract findings from AI review and score them
  if (features.confidenceScoring && aiReview.recommendations.length > 0) {
    extendedPromises.push(
      (async () => {
        try {
          const findingsPrompt = withConfidenceScoring(
            `Score the following design findings with confidence levels.\n\n` +
              aiReview.recommendations
                .map(
                  (r, i) =>
                    `${i + 1}. [${r.severity}] ${r.title}: ${r.description}`,
                )
                .join('\n') +
              `\n\nFor each finding, respond in JSON:\n{ "findings": [{ "finding": "<title>", "confidence": <0-1>, "evidence": "<specific visual evidence>", "category": "<category>", "severity": "<severity>" }] }`,
          );

          const client = getAnthropicClient();
          const response = await client.messages.create({
            model: MODEL,
            max_tokens: 1500,
            system: SYSTEM_PROMPT,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: 'image/png',
                      data: req.screenshot,
                    },
                  },
                  { type: 'text', text: findingsPrompt },
                ],
              },
            ],
          });

          if (response.content.length && response.content[0].type === 'text') {
            const jsonMatch = response.content[0].text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (Array.isArray(parsed.findings)) {
                const scored = parsed.findings as ConfidencedFinding[];
                confidencedFindings = sortByConfidence(filterByConfidence(scored));
              }
            }
          }
        } catch (err) {
          console.error('Confidence scoring failed:', err);
        }
      })(),
    );
  }

  // Fire-and-forget extended features — save results to session in background
  if (extendedPromises.length > 0) {
    void (async () => {
      try {
        await Promise.allSettled(extendedPromises);
        // After all extended features resolve, persist to session
        const extendedUpdates: Record<string, unknown> = {};
        if (threeLayerExplanations) {
          extendedUpdates.three_layer_explanations = threeLayerExplanations;
        }
        if (confidencedFindings) {
          extendedUpdates.confidenced_findings = confidencedFindings;
        }
        // Only update if there's something to save
        if (Object.keys(extendedUpdates).length > 0) {
          console.log(`[extended] Saving extended features for session ${sessionId}`);
        }
      } catch (err) {
        console.error('[extended] Background extended features failed:', err);
      }
    })();
  }

  // Save to session
  saveAnalysisResult(sessionId, pageType, aiReview, req.lintResult, designHealthScore, referoComparison);

  return {
    sessionId,
    pageType,
    ...(pageTypeData.confidence > 0 && { pageTypeConfidence: pageTypeData.confidence }),
    ...(pageTypeData.signals.length > 0 && { pageTypeSignals: pageTypeData.signals }),
    lintResult: req.lintResult,
    aiReview,
    ...(referoComparison && { referoComparison }),
    designHealthScore,
    ...(designKnowledge && { designSystemSources: designKnowledge.sources }),
  };
}

/** Infer component family from name for targeted MCP queries. */
function inferComponentFamily(name: string): string | undefined {
  const lower = name.toLowerCase();
  const families: Array<[RegExp, string]> = [
    [/button/i, "button"],
    [/avatar/i, "avatar"],
    [/card/i, "card"],
    [/badge|tag|chip/i, "badge"],
    [/input|field|text.?area|search/i, "input"],
    [/modal|dialog|drawer|sheet/i, "modal"],
    [/nav|menu|sidebar|tab/i, "navigation"],
    [/table|list|grid/i, "data-display"],
    [/icon/i, "icon"],
    [/toggle|switch|checkbox|radio/i, "toggle"],
    [/select|dropdown|picker|combo/i, "select"],
    [/toast|alert|notification|banner/i, "feedback"],
    [/tooltip|popover/i, "overlay"],
    [/skeleton|spinner|loader/i, "loading"],
  ];

  for (const [re, family] of families) {
    if (re.test(lower)) return family;
  }

  return undefined;
}


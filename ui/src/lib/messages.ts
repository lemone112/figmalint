// ──────────────────────────────────────────────
// Message type definitions for Plugin ↔ UI communication
// ──────────────────────────────────────────────

export type LintErrorType = 'fill' | 'stroke' | 'effect' | 'text' | 'radius' | 'spacing' | 'autoLayout' | 'accessibility' | 'visualQuality' | 'microcopy' | 'conversion' | 'cognitive' | 'fittsLaw' | 'gestalt' | 'detachedInstance' | 'responsive';

export interface LintError {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  errorType: LintErrorType;
  message: string;
  value: string;
  path: string;
  /** Spacing property name (for spacing errors) */
  property?: string;
  /** Severity level for weighted scoring */
  severity?: 'critical' | 'warning' | 'info';
}

export interface LintSummary {
  totalErrors: number;
  byType: Record<LintErrorType, number>;
  totalNodes: number;
  nodesWithErrors: number;
}

export interface LintResult {
  errors: LintError[];
  ignoredNodeIds: string[];
  ignoredErrorKeys: string[];
  summary: LintSummary;
}

export interface AuditCheck {
  check: string;
  status: 'pass' | 'fail' | 'warning';
  suggestion: string;
}

export interface DetailedAuditResults {
  states: Array<{ name: string; found: boolean }>;
  componentReadiness: AuditCheck[];
  accessibility: AuditCheck[];
  designLint?: AuditCheck[];
}

export interface DesignReviewFinding {
  severity: 'critical' | 'warning' | 'info' | 'suggestion';
  category: string;
  title: string;
  description: string;
  nodeId?: string;
  nodeName?: string;
  autoFixable: boolean;
}

export interface DesignReviewSummary {
  verdict: 'pass' | 'warn' | 'fail';
  headline: string;
  findings: DesignReviewFinding[];
  nextSteps: string[];
}

export interface NamingIssue {
  nodeId: string;
  nodeName: string;
  currentName: string;
  suggestedName: string;
  severity: 'error' | 'warning' | 'info';
  reason: string;
  layerType: string;
  depth: number;
  path: string;
}

export interface TokenAnalysis {
  summary: {
    totalTokens: number;
    actualTokens: number;
    hardCodedValues: number;
  };
}

export interface EnhancedAnalysisResult {
  metadata: {
    component: string;
    description: string;
    props: Array<{ name: string; type: string; description: string; defaultValue: string; required: boolean }>;
    states: string[];
    audit: { accessibilityIssues: string[] };
  };
  tokens: TokenAnalysis;
  audit: DetailedAuditResults;
  properties: Array<{ name: string; values: string[]; default: string }>;
  recommendations?: Array<{ name: string; type: string; description: string; examples: string[] }>;
  namingIssues?: NamingIssue[];
  lintResult?: LintResult;
  designReview?: DesignReviewSummary;
}

// Chat message types for the UI
export type AnalysisPhase = 'lint' | 'screenshot' | 'ai-review' | 'refero';

export type ChatMessageType =
  | { kind: 'ai-text'; content: string; streaming?: boolean }
  | { kind: 'user-text'; content: string }
  | { kind: 'score-card'; data: ScoreBreakdown }
  | { kind: 'issues-list'; data: LintError[]; fixableCount: number }
  | { kind: 'issue-detail'; data: LintError }
  | { kind: 'fix-result'; data: { nodeId: string; nodeName: string; applied: boolean; oldValue?: string; newValue?: string; property?: string } }
  | { kind: 'action-buttons'; buttons: ActionButton[] }
  | { kind: 'batch-summary'; data: { total: number; applied: number; failed: number } }
  | { kind: 'score-update'; data: { oldScore: number; newScore: number; issuesRemaining: number } }
  | { kind: 'ai-review'; data: AiReviewData }
  | { kind: 'refero-gallery'; data: ReferoComparisonData }
  | { kind: 'analysis-phase'; phase: AnalysisPhase; done?: boolean }
  | { kind: 'flow-result'; data: FlowAnalysisData }
  | { kind: 'diff-result'; data: DiffResultData }
  | { kind: 'baseline-saved'; data: { nodeId: string; nodeName: string; timestamp: number; overall: number } }
  | { kind: 'page-sweep-result'; data: PageSweepData }
  | { kind: 'design-debt'; data: unknown }
  | { kind: 'dark-mode'; data: unknown }
  | { kind: 'a11y-spec'; data: unknown }
  | { kind: 'token-compliance'; data: unknown }
  | { kind: 'brand-consistency'; data: unknown }
  | { kind: 'copy-tone'; data: unknown }
  | { kind: 'persona-research'; data: unknown }
  | { kind: 'attention-heatmap'; data: unknown };

export type AiRating = 'pass' | 'needs_improvement' | 'fail';

export interface AiReviewCategory {
  rating: AiRating;
  evidence: string[];
  recommendation: string | null;
}

export interface AiReviewData {
  visualHierarchy: AiReviewCategory;
  statesCoverage: AiReviewCategory & { missingStates: string[] };
  platformAlignment: AiReviewCategory & { detectedPlatform: string };
  colorHarmony: AiReviewCategory;
  visualBalance?: AiReviewCategory;
  microcopyQuality?: AiReviewCategory;
  cognitiveLoad?: AiReviewCategory;
  recommendations: Array<{ title: string; description: string; severity: string }>;
  summary: string;
}

export interface ReferoScreen {
  id: string;
  title: string;
  company: string;
  pageType: string;
  thumbnailUrl: string;
  fullUrl: string;
  platform: 'web' | 'ios' | 'android';
  tags?: string[];
}

export interface ReferoComparisonData {
  matchingPatterns: Array<{ pattern: string; frequency: string }>;
  missingPatterns: Array<{ pattern: string; frequency: string; exampleCompanies: string[] }>;
  stylePositioning: { closest: string[]; different: string[] };
  suggestions: Array<{ title: string; description: string; evidence: string }>;
  summary: string;
  screenshots: ReferoScreen[];
}

export interface CategoryScore {
  score: number;
  passed: number;
  failed: number;
}

export type ScoreGrade = 'excellent' | 'needs-work' | 'poor';

export interface ScoreBreakdown {
  overall: number;
  grade: ScoreGrade;
  tokens: CategoryScore;
  spacing: CategoryScore;
  layout: CategoryScore;
  accessibility: CategoryScore;
  naming: CategoryScore;
  visualQuality: CategoryScore;
  microcopy: CategoryScore;
  conversion: CategoryScore;
  cognitive: CategoryScore;
}

export interface ActionButton {
  id: string;
  label: string;
  variant: 'primary' | 'secondary' | 'ghost';
  action: string;
  params?: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  timestamp: number;
  message: ChatMessageType;
}

// Ambient quality badge data — sent on every selection change
export interface MiniScoreData {
  nodeId: string;
  nodeName: string;
  score: number;
  issueCount: number;
  topSeverity: 'critical' | 'warning' | 'info' | 'none';
}

// Plugin → UI message events
export type PluginEvent =
  | { type: 'design-lint-result'; data: LintResult }
  | { type: 'enhanced-analysis-result'; data: EnhancedAnalysisResult }
  | { type: 'analysis-error'; data: { error: string } }
  | { type: 'fix-applied'; data: { type: string; nodeId: string; nodeName: string; oldValue: unknown; newValue: unknown; property?: string; success?: boolean; error?: string } }
  | { type: 'fix-error'; data: { error: string } }
  | { type: 'batch-fix-v2-result'; data: { total: number; applied: number; failed: number; results: Array<{ nodeId: string; nodeName: string; success: boolean; message: string; oldValue?: string; newValue?: string }> } }
  | { type: 'rescan-complete'; data: { totalErrors: number; nodesWithErrors: number } }
  | { type: 'api-key-status'; data: { hasKey: boolean; provider: string; model?: string } }
  | { type: 'api-key-saved'; data: { success: boolean } }
  | { type: 'screenshot-result'; data: { nodeId: string; nodeName: string; screenshot: string; width: number; height: number; hasAutoLayout?: boolean; childCount?: number } }
  | { type: 'selection-changed'; data: { hasSelection: boolean; nodeId: string | null; nodeName: string | null } }
  | { type: 'screenshot-error'; data: { error: string } }
  | { type: 'flow-analysis-started'; data: { status: string; progress?: number; total?: number } }
  | { type: 'flow-analysis-result'; data: FlowAnalysisData }
  | { type: 'flow-analysis-error'; data: { error: string } }
  | { type: 'baseline-saved'; data: { nodeId: string; nodeName: string; timestamp: number; overall: number } }
  | { type: 'baseline-loaded'; data: { nodeId: string; nodeName: string; timestamp: number; overall: number } | null }
  | { type: 'diff-result'; data: DiffResultData }
  | { type: 'page-sweep-progress'; data: { current: number; total: number; frameName: string } }
  | { type: 'page-sweep-result'; data: PageSweepRawData }
  | { type: 'selection-mini-score'; data: MiniScoreData };

// Flow Analysis Types
export interface FlowGraphIssue {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  frameIds: string[];
  message: string;
}

export interface FlowFrameData {
  id: string;
  name: string;
  width: number;
  height: number;
  isFlowStartingPoint: boolean;
}

export interface FlowGraphData {
  frames: FlowFrameData[];
  edges: Array<{
    sourceFrameId: string;
    sourceNodeName: string;
    destinationFrameId: string;
    trigger: string;
    navigation: string;
  }>;
  entryPoints: string[];
  deadEnds: string[];
  orphans: string[];
  unreachable: string[];
  loops: string[][];
  stats: {
    totalFrames: number;
    totalEdges: number;
    totalEntryPoints: number;
    maxDepth: number;
    avgBranching: number;
  };
}

export interface FlowAnalysisData {
  graph: FlowGraphData;
  graphIssues: FlowGraphIssue[];
  screenshots: Record<string, string>;
  lintResults: Record<string, LintResult>;
  /** AI analysis results (populated after backend call) */
  aiAnalysis?: {
    scenarioAnalysis: {
      missingScreens: Array<{ type: string; description: string; afterFrameName: string }>;
      happyPathComplete: boolean;
      errorRecoveryPaths: boolean;
      backNavigationPresent: boolean;
    };
    consistencyAnalysis: {
      colorDrift: boolean;
      typographyDrift: boolean;
      layoutConsistency: string;
      terminologyConsistency: string;
      evidence: string[];
    };
    recommendations: Array<{ title: string; description: string; severity: string; affectedFrames: string[] }>;
    summary: string;
  };
}

// ── Baseline & Diff Types ──────────────────────────────────

export interface CategoryDeltaData {
  category: string;
  oldScore: number;
  newScore: number;
  delta: number;
}

export interface IssueDiffData {
  errorType: string;
  severity: string;
  nodeId: string;
  message: string;
}

export interface DiffResultData {
  baselineTimestamp: number;
  currentTimestamp: number;
  scoreDelta: {
    overall: number;
    oldOverall: number;
    newOverall: number;
    categories: CategoryDeltaData[];
  };
  newIssues: IssueDiffData[];
  fixedIssues: IssueDiffData[];
  remainingIssues: IssueDiffData[];
  summary: {
    totalNew: number;
    totalFixed: number;
    totalRemaining: number;
    oldTotal: number;
    newTotal: number;
  };
}

export interface BaselineMetaData {
  timestamp: number;
  nodeName: string;
  overall: number;
}

// ── Variable System & DTCG Compliance Types ──────────────────

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
  valuesByMode: Record<string, unknown>;
  scopes: string[];
  consumers: number;
}

export interface VariableSystemReport {
  collections: VariableCollectionData[];
  totalVariables: number;
  unusedVariables: string[];
  adoptionRate: number;
  modesCoverage: Record<string, number>;
}

export interface DTCGComplianceResult {
  adoptionScore: number;
  matched: Array<{ token: string; nodeCount: number; usage: 'correct' | 'overridden' }>;
  unmatched: Array<{ value: string; nodeCount: number; nearestToken: string; distance: number }>;
  orphanTokens: string[];
  missingFromSystem: string[];
  summary: { totalTokenDefs: number; usedInDesign: number; hardCodedValues: number; compliance: number };
}

// ── Dark Mode Validation Types ──────────────────────────────

export interface ModeComparisonData {
  collection: string;
  modes: Array<{
    modeId: string;
    modeName: string;
    screenshot?: string;
  }>;
  variableDiffs: Array<{
    variableName: string;
    type: string;
    values: Record<string, unknown>;
  }>;
  missingValues: Array<{
    variableName: string;
    missingModes: string[];
  }>;
}

export interface DarkModeMetrics {
  pureBlackBackgrounds: number;
  pureWhiteText: number;
  lowContrastOnDark: number;
  missingModeValues: number;
}

export interface DarkModeResult {
  issues: Array<{
    id: string;
    type: string;
    severity: string;
    nodeId: string;
    nodeName: string;
    message: string;
    currentValue?: string;
    suggestions?: string[];
    autoFixable: boolean;
  }>;
  metrics: DarkModeMetrics;
  summary: { totalChecked: number; passed: number; failed: number };
}

export interface DarkModeValidationResponse {
  comparison: {
    overallRating: 'pass' | 'needs_improvement' | 'fail';
    visibilityIssues: Array<{ element: string; description: string }>;
    semanticColorIssues: Array<{ element: string; lightValue: string; darkValue: string; issue: string }>;
    elevationIssues: string[];
    imageAdaptation: 'good' | 'needs_attention' | 'missing';
    recommendations: Array<{ title: string; description: string; severity: string }>;
    summary: string;
  };
  deterministicIssues: DarkModeResult | null;
}

// ── Page Sweep Progress ──────────────────────────────────────

export interface PageSweepProgress {
  phase: 'collecting' | 'comparing' | 'validating' | 'complete';
  current: number;
  total: number;
  message: string;
}

// ── Page Sweep Types ──────────────────────────────────

/** Raw data sent from plugin sandbox (before backend processing). */
export interface PageSweepRawData {
  frames: Array<{
    id: string;
    name: string;
    screenshot: string;
    lintResult: {
      summary: {
        totalErrors: number;
        byType: Record<string, number>;
        totalNodes: number;
        nodesWithErrors: number;
      };
      errors: Array<{ errorType: string; severity?: string; nodeId: string; nodeName: string; message: string; value: string }>;
    };
    width: number;
    height: number;
  }>;
  aggregated: {
    totalFrames: number;
    totalIssues: number;
    topIssues: Array<{ type: string; count: number; severity: string }>;
  };
}

/** Processed page sweep result (after backend AI analysis or deterministic fallback). */
export interface PageSweepData {
  fileHealth: {
    overallScore: number;
    grade: string;
    totalFrames: number;
    totalIssues: number;
    topIssues: Array<{ type: string; count: number; severity: string }>;
    consistencyScore: number;
  };
  frames: Array<{
    id: string;
    name: string;
    score: number;
    issueCount: number;
    topIssues: string[];
  }>;
  aiInsights: {
    strengths: string[];
    weaknesses: string[];
    recommendations: Array<{ title: string; description: string; affectedFrames: string[] }>;
    summary: string;
  };
}

// UI → Plugin message commands
export function postToPlugin(type: string, data?: unknown): void {
  parent.postMessage({ pluginMessage: { type, data } }, '*');
}

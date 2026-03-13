/// <reference types="@figma/plugin-typings" />

// ──────────────────────────────────────────────
// Flow Analysis Types
//
// Data structures for multi-frame user flow analysis.
// Used by graph-builder (sandbox) and flow-analyzer (backend).
// ──────────────────────────────────────────────

/** A connection between two frames via a prototype reaction. */
export interface FlowEdge {
  sourceFrameId: string;
  sourceNodeId: string;
  sourceNodeName: string;
  destinationFrameId: string;
  trigger: string;        // ON_CLICK, ON_HOVER, AFTER_TIMEOUT, etc.
  navigation: string;     // NAVIGATE, OVERLAY, SWAP, SCROLL_TO, BACK, CLOSE
  hasTransition: boolean;
}

/** Metadata for a single frame in the flow. */
export interface FlowFrame {
  id: string;
  name: string;
  pageId: string;
  pageName: string;
  width: number;
  height: number;
  isFlowStartingPoint: boolean;
  childCount: number;
  hasInteractiveElements: boolean;
  /** Base64 PNG screenshot (populated during export phase) */
  screenshot?: string;
}

/** The complete navigation graph for a page or document. */
export interface FlowGraph {
  frames: FlowFrame[];
  edges: FlowEdge[];
  entryPoints: string[];       // Frame IDs that are flow starting points
  deadEnds: string[];          // Frame IDs with no outgoing edges
  orphans: string[];           // Frame IDs with no incoming edges (and not entry points)
  unreachable: string[];       // Frame IDs not reachable from any entry point
  loops: string[][];           // Arrays of frame IDs forming cycles
  stats: {
    totalFrames: number;
    totalEdges: number;
    totalEntryPoints: number;
    maxDepth: number;
    avgBranching: number;
  };
}

/** Data sent from plugin to UI for a flow analysis request. */
export interface FlowExportData {
  graph: FlowGraph;
  /** Per-frame lint results (keyed by frame ID) */
  lintResults: Record<string, import('../types').LintResult>;
  /** Per-frame screenshots (keyed by frame ID, base64 PNG) */
  screenshots: Record<string, string>;
}

/** Result of the backend flow analysis (AI + deterministic). */
export interface FlowAnalysisResult {
  /** Deterministic graph issues */
  graphIssues: FlowGraphIssue[];
  /** AI-powered scenario analysis */
  scenarioAnalysis?: {
    missingScreens: Array<{ type: string; description: string; afterFrameId: string }>;
    happyPathComplete: boolean;
    errorRecoveryPaths: boolean;
    backNavigationPresent: boolean;
  };
  /** Cross-screen consistency (AI) */
  consistencyAnalysis?: {
    colorDrift: boolean;
    typographyDrift: boolean;
    layoutConsistency: 'pass' | 'needs_improvement' | 'fail';
    terminologyConsistency: 'pass' | 'needs_improvement' | 'fail';
    evidence: string[];
  };
  /** Per-frame scores + aggregate */
  scores: {
    aggregate: number;
    perFrame: Record<string, number>;
  };
  summary: string;
}

export interface FlowGraphIssue {
  type: 'dead-end' | 'orphan' | 'unreachable' | 'loop' | 'missing-back' | 'deep-navigation';
  severity: 'critical' | 'warning' | 'info';
  frameIds: string[];
  message: string;
}

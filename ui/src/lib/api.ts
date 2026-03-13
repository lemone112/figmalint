/**
 * Backend API client for the Design Review Chat backend.
 * All calls go through the plugin UI iframe (has fetch access).
 */

const DEFAULT_BACKEND_URL = 'https://api.figmalint.labpics.com';

let backendUrl = DEFAULT_BACKEND_URL;

export function setBackendUrl(url: string): void {
  backendUrl = url.replace(/\/$/, '');
}

export function getBackendUrl(): string {
  return backendUrl;
}

/**
 * POST /api/analyze — full AI analysis with screenshot + lint.
 */
export async function analyzeComponent(data: {
  screenshot: string;
  lintResult: unknown;
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
}): Promise<{
  sessionId: string;
  pageType: string;
  aiReview: {
    visualHierarchy: { rating: string; evidence: string[]; recommendation: string | null };
    statesCoverage: { rating: string; evidence: string[]; recommendation: string | null; missingStates: string[] };
    platformAlignment: { rating: string; evidence: string[]; recommendation: string | null; detectedPlatform: string };
    colorHarmony: { rating: string; evidence: string[]; recommendation: string | null };
    recommendations: Array<{ title: string; description: string; severity: string }>;
    summary: string;
  };
  designHealthScore: number;
  referoComparison?: {
    matchingPatterns: Array<{ pattern: string; frequency: string }>;
    missingPatterns: Array<{ pattern: string; frequency: string; exampleCompanies: string[] }>;
    stylePositioning: { closest: string[]; different: string[] };
    suggestions: Array<{ title: string; description: string; evidence: string }>;
    summary: string;
    screenshots: Array<{ id: string; title: string; company: string; pageType: string; thumbnailUrl: string; fullUrl: string; platform: 'web' | 'ios' | 'android'; tags?: string[] }>;
  };
}> {
  const resp = await fetch(`${backendUrl}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(err.error || 'Analysis failed');
  }

  return resp.json();
}

/**
 * POST /api/chat — non-streaming chat.
 */
export async function chatMessage(sessionId: string, message: string): Promise<{ message: string }> {
  const resp = await fetch(`${backendUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(err.error || 'Chat failed');
  }

  return resp.json();
}

/**
 * POST /api/stream/:sessionId — SSE streaming chat.
 * Returns an EventSource-like reader.
 */
export async function streamChat(
  sessionId: string,
  message: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
  signal?: AbortSignal
): Promise<void> {
  try {
    const resp = await fetch(`${backendUrl}/api/stream/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
      signal,
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: resp.statusText }));
      onError(err.error || 'Stream failed');
      return;
    }

    const reader = resp.body?.getReader();
    if (!reader) {
      onError('No response body');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent = '';

    while (true) {
      if (signal?.aborted) break;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          const data = line.slice(5).trim();
          try {
            const parsed = JSON.parse(data);
            if (currentEvent === 'error') {
              onError(parsed.error || 'Stream error');
              return;
            }
            if (currentEvent === 'done') {
              onDone();
              return;
            }
            if (parsed.text) onChunk(parsed.text);
          } catch {
            // Not JSON, skip
          }
          currentEvent = '';
        }
      }
    }

    onDone();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      // Caller aborted — not a real error
      return;
    }
    onError(error instanceof Error ? error.message : 'Stream failed');
  }
}

/**
 * GET /api/health — check backend availability.
 */
/**
 * GET /api/session/:id/refero — poll for async Refero data.
 */
export async function fetchReferoData(sessionId: string): Promise<{ ready: boolean; data?: any }> {
  try {
    const resp = await fetch(`${backendUrl}/api/session/${sessionId}/refero`, { method: 'GET' });
    if (!resp.ok) return { ready: false };
    return resp.json();
  } catch {
    return { ready: false };
  }
}

/**
 * GET /api/health — check backend availability.
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const resp = await fetch(`${backendUrl}/api/health`, { method: 'GET' });
    return resp.ok;
  } catch {
    return false;
  }
}

/**
 * POST /api/analyze-page — whole-page sweep analysis.
 */
export async function analyzePageSweep(data: {
  frames: Array<{
    id: string;
    name: string;
    screenshot: string;
    lintResult: { summary: unknown; errors: unknown[] };
    width: number;
    height: number;
  }>;
  sessionId?: string;
}): Promise<{
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
}> {
  const resp = await fetch(`${backendUrl}/api/analyze-page`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(err.error || 'Page sweep analysis failed');
  }

  return resp.json();
}

/**
 * POST /api/analyze-flow — multi-frame AI flow analysis.
 */
export async function analyzeFlow(data: {
  frames: Array<{ id: string; name: string; width: number; height: number; isFlowStartingPoint: boolean }>;
  edges: Array<{ sourceFrameId: string; sourceNodeName: string; destinationFrameId: string; trigger: string; navigation: string }>;
  graphIssues: Array<{ type: string; severity: string; frameIds: string[]; message: string }>;
  screenshots: Record<string, string>;
  lintResults: Record<string, unknown>;
}): Promise<{
  flowAnalysis: {
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
  } | null;
}> {
  const resp = await fetch(`${backendUrl}/api/analyze-flow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(err.error || 'Flow analysis failed');
  }

  return resp.json();
}

// ── New Analysis Routes ──────────────────────────────────────

/**
 * POST /api/brand-consistency — brand guide compliance analysis.
 */
export async function analyzeBrandConsistency(data: {
  screenshot: string;
  brandGuide: {
    colors: Record<string, { hex: string; tolerance: number; usage: string }>;
    typography: {
      heading: { family: string; weights: number[] };
      body: { family: string; weights: number[] };
    };
    spacing: { base: number; scale: number[] };
    personality: string[];
    rules?: Array<{ id: string; description: string; severity: 'error' | 'warning' }>;
  };
  lintResult?: unknown;
  sessionId?: string;
}): Promise<{
  success: boolean;
  brandConsistency: {
    overallScore: number;
    colorCompliance: {
      score: number;
      violations: Array<{ element: string; found: string; expected: string; tolerance: number }>;
    };
    typographyCompliance: {
      score: number;
      violations: Array<{ element: string; found: string; expected: string }>;
    };
    spacingCompliance: { score: number };
    personalityMatch: { rating: 'strong' | 'moderate' | 'weak'; evidence: string[] };
    recommendations: Array<{ title: string; description: string; severity: string }>;
    summary: string;
  };
}> {
  const resp = await fetch(`${backendUrl}/api/brand-consistency`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(err.error || 'Brand consistency analysis failed');
  }

  return resp.json();
}

/**
 * POST /api/copy-tone — copy and tone analysis across screens.
 */
export async function analyzeCopyTone(data: {
  screens: Array<{ name: string; textContent: string[] }>;
  personality?: string[];
  sessionId?: string;
}): Promise<{
  success: boolean;
  copyTone: unknown;
}> {
  const resp = await fetch(`${backendUrl}/api/copy-tone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(err.error || 'Copy tone analysis failed');
  }

  return resp.json();
}

/**
 * POST /api/persona-research — persona-based UX research analysis.
 */
export async function analyzePersonaResearch(data: {
  screenshot: string;
  taskDescription: string;
  lintContext?: string;
  sessionId?: string;
}): Promise<{
  success: boolean;
  personaResearch: unknown;
}> {
  const resp = await fetch(`${backendUrl}/api/persona-research`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(err.error || 'Persona research failed');
  }

  return resp.json();
}

/**
 * POST /api/generate-a11y-spec — accessibility specification generation.
 */
export async function generateA11ySpec(data: {
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
}): Promise<{
  success: boolean;
  spec: {
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
  };
}> {
  const resp = await fetch(`${backendUrl}/api/generate-a11y-spec`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(err.error || 'Accessibility spec generation failed');
  }

  return resp.json();
}

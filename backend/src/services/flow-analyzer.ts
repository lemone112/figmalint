import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from '../prompts/system.js';
import { buildFlowAnalysisPrompt } from '../prompts/flow-analysis.js';
import { getAnthropicClient, MODEL } from './claude.js';

// ── Types ──────────────────────────────────────

interface FlowFrame {
  id: string;
  name: string;
  width: number;
  height: number;
  isFlowStartingPoint: boolean;
}

interface FlowEdge {
  sourceFrameId: string;
  sourceNodeName: string;
  destinationFrameId: string;
  trigger: string;
  navigation: string;
}

interface FlowGraphIssue {
  type: string;
  severity: string;
  frameIds: string[];
  message: string;
}

export interface FlowAnalyzeRequest {
  frames: FlowFrame[];
  edges: FlowEdge[];
  graphIssues: FlowGraphIssue[];
  screenshots: Record<string, string>;  // frameId → base64 PNG
  lintResults: Record<string, any>;     // frameId → LintResult
}

export interface FlowAnalysisResult {
  scenarioAnalysis: {
    missingScreens: Array<{ type: string; description: string; afterFrameName: string }>;
    happyPathComplete: boolean;
    errorRecoveryPaths: boolean;
    backNavigationPresent: boolean;
  };
  consistencyAnalysis: {
    colorDrift: boolean;
    typographyDrift: boolean;
    layoutConsistency: 'pass' | 'needs_improvement' | 'fail';
    terminologyConsistency: 'pass' | 'needs_improvement' | 'fail';
    evidence: string[];
  };
  recommendations: Array<{
    title: string;
    description: string;
    severity: string;
    affectedFrames: string[];
  }>;
  summary: string;
}

// ── Graph Description Builder ──────────────────

function buildGraphDescription(frames: FlowFrame[], edges: FlowEdge[]): string {
  const frameNameById = new Map(frames.map(f => [f.id, f.name]));
  const lines: string[] = [];

  // Entry points
  const entryPoints = frames.filter(f => f.isFlowStartingPoint);
  if (entryPoints.length > 0) {
    lines.push(`Entry points: ${entryPoints.map(f => `"${f.name}"`).join(', ')}`);
  }

  // Connections
  lines.push('');
  lines.push('Connections:');
  for (const edge of edges) {
    const src = frameNameById.get(edge.sourceFrameId) || edge.sourceFrameId;
    const dst = frameNameById.get(edge.destinationFrameId) || edge.destinationFrameId;
    lines.push(`  "${src}" → "${dst}" (${edge.trigger}, via "${edge.sourceNodeName}")`);
  }

  // Frame list
  lines.push('');
  lines.push('All frames:');
  for (const frame of frames) {
    const markers: string[] = [];
    if (frame.isFlowStartingPoint) markers.push('ENTRY');
    lines.push(`  - "${frame.name}" (${frame.width}x${frame.height})${markers.length ? ' [' + markers.join(', ') + ']' : ''}`);
  }

  return lines.join('\n');
}

// ── Main Analysis ──────────────────────────────

/**
 * Run AI-powered flow analysis on multiple frames.
 * Sends all screenshots + graph context to Claude for holistic analysis.
 */
export async function analyzeFlow(req: FlowAnalyzeRequest): Promise<FlowAnalysisResult | null> {
  const client = getAnthropicClient();

  if (!process.env.ANTHROPIC_API_KEY) return null;

  const frameNames = req.frames.map(f => f.name);
  const graphDescription = buildGraphDescription(req.frames, req.edges);
  const issuesText = req.graphIssues.map(i => `- [${i.severity}] ${i.message}`).join('\n');
  const prompt = buildFlowAnalysisPrompt(graphDescription, frameNames, issuesText);

  // Build content array with screenshots + prompt
  const content: Anthropic.ContentBlockParam[] = [];

  // Add screenshots in flow order (entry points first)
  const orderedFrames = [
    ...req.frames.filter(f => f.isFlowStartingPoint),
    ...req.frames.filter(f => !f.isFlowStartingPoint),
  ];

  for (const frame of orderedFrames) {
    const screenshot = req.screenshots[frame.id];
    if (screenshot) {
      content.push({
        type: 'text',
        text: `--- Screen: "${frame.name}" ---`,
      });
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data: screenshot },
      });
    }
  }

  content.push({ type: 'text', text: prompt });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    });

    if (!response.content.length || response.content[0].type !== 'text') {
      return null;
    }

    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      scenarioAnalysis: {
        missingScreens: Array.isArray(parsed.scenarioAnalysis?.missingScreens)
          ? parsed.scenarioAnalysis.missingScreens : [],
        happyPathComplete: parsed.scenarioAnalysis?.happyPathComplete ?? false,
        errorRecoveryPaths: parsed.scenarioAnalysis?.errorRecoveryPaths ?? false,
        backNavigationPresent: parsed.scenarioAnalysis?.backNavigationPresent ?? false,
      },
      consistencyAnalysis: {
        colorDrift: parsed.consistencyAnalysis?.colorDrift ?? false,
        typographyDrift: parsed.consistencyAnalysis?.typographyDrift ?? false,
        layoutConsistency: parsed.consistencyAnalysis?.layoutConsistency ?? 'fail',
        terminologyConsistency: parsed.consistencyAnalysis?.terminologyConsistency ?? 'fail',
        evidence: Array.isArray(parsed.consistencyAnalysis?.evidence)
          ? parsed.consistencyAnalysis.evidence : [],
      },
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    };
  } catch (error) {
    console.error('Flow analysis AI error:', error);
    return null;
  }
}

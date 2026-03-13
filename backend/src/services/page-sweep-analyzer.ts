import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from '../prompts/system.js';
import { buildPageSweepPrompt } from '../prompts/page-sweep.js';
import { getAnthropicClient, MODEL } from './claude.js';

// ── Types ──────────────────────────────────────

interface FrameInput {
  id: string;
  name: string;
  screenshot: string; // base64 PNG
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
      severity?: string;
    }>;
  };
  width: number;
  height: number;
}

export interface PageSweepRequest {
  frames: FrameInput[];
  sessionId?: string;
}

export interface PageSweepFileHealth {
  overallScore: number;
  grade: 'excellent' | 'needs-work' | 'poor';
  totalFrames: number;
  totalIssues: number;
  topIssues: Array<{ type: string; count: number; severity: string }>;
  consistencyScore: number;
}

export interface PageSweepFrameResult {
  id: string;
  name: string;
  score: number;
  issueCount: number;
  topIssues: string[];
}

export interface PageSweepAiInsights {
  strengths: string[];
  weaknesses: string[];
  recommendations: Array<{ title: string; description: string; affectedFrames: string[] }>;
  summary: string;
}

export interface PageSweepResult {
  fileHealth: PageSweepFileHealth;
  frames: PageSweepFrameResult[];
  aiInsights: PageSweepAiInsights;
}

// ── Score Computation ──────────────────────────

const SEVERITY_WEIGHT: Record<string, number> = { critical: 10, warning: 3, info: 1 };

function computeFrameScore(frame: FrameInput): number {
  const errors = frame.lintResult.errors;
  const total = Math.max(frame.lintResult.summary.totalNodes, 1);
  const weightedFailed = errors.reduce(
    (sum, e) => sum + (SEVERITY_WEIGHT[e.severity || 'warning'] || 3),
    0,
  );
  const weightedPassed = Math.max(0, total - errors.length) * 10;
  const t = weightedPassed + weightedFailed;
  return t > 0 ? Math.round((weightedPassed / t) * 100) : 100;
}

function getGrade(score: number): 'excellent' | 'needs-work' | 'poor' {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'needs-work';
  return 'poor';
}

// ── Main Analysis ──────────────────────────────

export async function analyzePageSweep(req: PageSweepRequest): Promise<PageSweepResult> {
  // 1. Compute per-frame scores
  const frameResults: PageSweepFrameResult[] = req.frames.map((frame) => {
    const score = computeFrameScore(frame);
    const issueCount = frame.lintResult.summary.totalErrors;

    // Top issues by type count for this frame
    const typeCounts: Record<string, number> = {};
    for (const err of frame.lintResult.errors) {
      typeCounts[err.errorType] = (typeCounts[err.errorType] || 0) + 1;
    }
    const topIssues = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type, count]) => `${type} (${count})`);

    return { id: frame.id, name: frame.name, score, issueCount, topIssues };
  });

  // 2. Aggregate file health
  const scores = frameResults.map((f) => f.score);
  const overallScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 100;

  // Consistency score: 100 - standard deviation (how uniform are the scores?)
  const mean = overallScore;
  const variance = scores.length > 0
    ? scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length
    : 0;
  const stdDev = Math.sqrt(variance);
  const consistencyScore = Math.max(0, Math.round(100 - stdDev));

  const totalIssues = frameResults.reduce((sum, f) => sum + f.issueCount, 0);

  // Aggregate top issues across all frames
  const issueTypeCounts: Record<string, { count: number; severity: string }> = {};
  for (const frame of req.frames) {
    for (const err of frame.lintResult.errors) {
      const key = err.errorType;
      if (!issueTypeCounts[key]) {
        issueTypeCounts[key] = { count: 0, severity: err.severity || 'warning' };
      }
      issueTypeCounts[key].count++;
    }
  }
  const topIssues = Object.entries(issueTypeCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([type, { count, severity }]) => ({ type, count, severity }));

  const fileHealth: PageSweepFileHealth = {
    overallScore,
    grade: getGrade(overallScore),
    totalFrames: req.frames.length,
    totalIssues,
    topIssues,
    consistencyScore,
  };

  // 3. AI insights (skip if no API key)
  let aiInsights: PageSweepAiInsights = {
    strengths: [],
    weaknesses: [],
    recommendations: [],
    summary: 'AI analysis unavailable (no API key configured).',
  };

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      aiInsights = await generatePageSweepInsights(req.frames, frameResults, fileHealth);
    } catch (error) {
      console.error('Page sweep AI error:', error);
      aiInsights.summary = 'AI analysis failed. See deterministic results above.';
    }
  }

  return { fileHealth, frames: frameResults, aiInsights };
}

// ── AI Insights Generation ──────────────────────

async function generatePageSweepInsights(
  frames: FrameInput[],
  frameResults: PageSweepFrameResult[],
  fileHealth: PageSweepFileHealth,
): Promise<PageSweepAiInsights> {
  const client = getAnthropicClient();

  // Build frame summaries text
  const frameSummaries = frameResults.map((fr) => {
    const frame = frames.find((f) => f.id === fr.id);
    const bt = frame?.lintResult.summary.byType || {};
    const issues = Object.entries(bt)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    return `- "${fr.name}" (${frame?.width}x${frame?.height}): score ${fr.score}/100, ${fr.issueCount} issues [${issues || 'none'}]`;
  }).join('\n');

  const aggregatedStats = [
    `Total frames: ${fileHealth.totalFrames}`,
    `Total issues: ${fileHealth.totalIssues}`,
    `Average score: ${fileHealth.overallScore}/100 (${fileHealth.grade})`,
    `Consistency score: ${fileHealth.consistencyScore}/100`,
    `Top issue types: ${fileHealth.topIssues.map((i) => `${i.type} (${i.count})`).join(', ') || 'none'}`,
  ].join('\n');

  const prompt = buildPageSweepPrompt(frameSummaries, aggregatedStats);

  // Build content with screenshots (batch up to 15 for token budget)
  const content: Anthropic.ContentBlockParam[] = [];
  const screenshotFrames = frames.filter((f) => f.screenshot).slice(0, 15);

  for (const frame of screenshotFrames) {
    content.push({ type: 'text', text: `--- Frame: "${frame.name}" ---` });
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data: frame.screenshot },
    });
  }

  content.push({ type: 'text', text: prompt });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content }],
  });

  if (!response.content.length || response.content[0].type !== 'text') {
    throw new Error('Empty response from AI');
  }

  const text = response.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in page sweep response');

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
  };
}

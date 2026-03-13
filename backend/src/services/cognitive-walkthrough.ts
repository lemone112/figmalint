import Anthropic from '@anthropic-ai/sdk';
import { buildCognitiveWalkthroughPrompt } from '../prompts/cognitive-walkthrough.js';
import { getAnthropicClient, MODEL } from './claude.js';

// ── Types ──────────────────────────────────────

export interface CognitiveWalkthroughRequest {
  taskDescription: string;
  frames: Array<{ id: string; name: string; screenshot: string }>;
  edges: Array<{
    sourceFrameId: string;
    destinationFrameId: string;
    trigger: string;
  }>;
  interactiveElements: Record<
    string,
    Array<{
      name: string;
      type: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }>
  >;
  sessionId?: string;
}

interface CWQuestionResult {
  answer: 'yes' | 'partially' | 'no';
  explanation: string;
}

interface CWStep {
  stepNumber: number;
  fromFrame: string;
  toFrame: string;
  action: string;
  questions: {
    q1_willTry: CWQuestionResult;
    q2_willNotice: CWQuestionResult;
    q3_willAssociate: CWQuestionResult;
    q4_willSeeProgress: CWQuestionResult;
  };
  overallSuccess: 'likely' | 'uncertain' | 'unlikely';
  barriers: string[];
  suggestions: string[];
}

export interface CognitiveWalkthroughResult {
  taskDescription: string;
  steps: CWStep[];
  overallAssessment: {
    taskCompletionLikelihood: 'high' | 'medium' | 'low';
    criticalBarriers: string[];
    summary: string;
  };
}

// ── Validation helpers ──────────────────────────

const VALID_CW_ANSWERS = new Set(['yes', 'partially', 'no']);
const VALID_SUCCESS = new Set(['likely', 'uncertain', 'unlikely']);
const VALID_LIKELIHOOD = new Set(['high', 'medium', 'low']);

function normalizeQuestionResult(raw: unknown): CWQuestionResult {
  const obj = raw as Record<string, unknown> | undefined;
  return {
    answer: VALID_CW_ANSWERS.has(obj?.answer as string)
      ? (obj!.answer as CWQuestionResult['answer'])
      : 'no',
    explanation: typeof obj?.explanation === 'string' ? obj.explanation : '',
  };
}

function normalizeStep(raw: unknown, index: number): CWStep {
  const obj = raw as Record<string, unknown> | undefined;
  const questions = obj?.questions as Record<string, unknown> | undefined;

  return {
    stepNumber: typeof obj?.stepNumber === 'number' ? obj.stepNumber : index + 1,
    fromFrame: typeof obj?.fromFrame === 'string' ? obj.fromFrame : '',
    toFrame: typeof obj?.toFrame === 'string' ? obj.toFrame : '',
    action: typeof obj?.action === 'string' ? obj.action : '',
    questions: {
      q1_willTry: normalizeQuestionResult(questions?.q1_willTry),
      q2_willNotice: normalizeQuestionResult(questions?.q2_willNotice),
      q3_willAssociate: normalizeQuestionResult(questions?.q3_willAssociate),
      q4_willSeeProgress: normalizeQuestionResult(questions?.q4_willSeeProgress),
    },
    overallSuccess: VALID_SUCCESS.has(obj?.overallSuccess as string)
      ? (obj!.overallSuccess as CWStep['overallSuccess'])
      : 'unlikely',
    barriers: Array.isArray(obj?.barriers) ? (obj.barriers as string[]) : [],
    suggestions: Array.isArray(obj?.suggestions) ? (obj.suggestions as string[]) : [],
  };
}

// ── Main Analysis ──────────────────────────────

export async function runCognitiveWalkthrough(
  req: CognitiveWalkthroughRequest,
): Promise<CognitiveWalkthroughResult> {
  const client = getAnthropicClient();

  // Build frame label list
  const frameLabels = req.frames.map((f, i) => `[Frame ${i + 1}: ${f.name}]`);

  // Build edge descriptions using frame names
  const frameNameById = new Map(req.frames.map((f) => [f.id, f.name]));
  const edgeDescriptions = req.edges.map((e) => {
    const src = frameNameById.get(e.sourceFrameId) || e.sourceFrameId;
    const dst = frameNameById.get(e.destinationFrameId) || e.destinationFrameId;
    return `  "${src}" -> "${dst}" (trigger: ${e.trigger})`;
  });

  // Build interactive element descriptions per frame
  const interactiveElementDescriptions: string[] = [];
  for (const frame of req.frames) {
    const elements = req.interactiveElements[frame.id];
    if (elements && elements.length > 0) {
      const lines = elements.map(
        (el) =>
          `    - ${el.name} (${el.type}) at (${el.x}, ${el.y}), ${el.width}x${el.height}`,
      );
      interactiveElementDescriptions.push(
        `[${frame.name}]\n${lines.join('\n')}`,
      );
    }
  }

  const prompt = buildCognitiveWalkthroughPrompt(
    req.taskDescription,
    frameLabels,
    edgeDescriptions,
    interactiveElementDescriptions,
  );

  // Build content array: label + screenshot for each frame, then the prompt
  const content: Anthropic.ContentBlockParam[] = [];

  for (let i = 0; i < req.frames.length; i++) {
    const frame = req.frames[i];
    content.push({
      type: 'text',
      text: `--- [Frame ${i + 1}: ${frame.name}] ---`,
    });
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/png',
        data: frame.screenshot,
      },
    });
  }

  content.push({ type: 'text', text: prompt });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 6000,
    system:
      'You are a UX researcher specializing in usability evaluation methods. You conduct rigorous cognitive walkthroughs grounded in evidence from the interface screenshots. You respond in JSON format when asked for structured output.',
    messages: [{ role: 'user', content }],
  });

  if (!response.content.length || response.content[0].type !== 'text') {
    throw new Error('Empty response from cognitive walkthrough analysis');
  }

  const text = response.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON in cognitive walkthrough response');
  }

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

  // Normalize and validate the response
  const rawSteps = Array.isArray(parsed.steps) ? parsed.steps : [];
  const steps = rawSteps.map((s: unknown, i: number) => normalizeStep(s, i));

  const rawAssessment = parsed.overallAssessment as Record<string, unknown> | undefined;

  return {
    taskDescription: req.taskDescription,
    steps,
    overallAssessment: {
      taskCompletionLikelihood: VALID_LIKELIHOOD.has(
        rawAssessment?.taskCompletionLikelihood as string,
      )
        ? (rawAssessment!.taskCompletionLikelihood as 'high' | 'medium' | 'low')
        : 'low',
      criticalBarriers: Array.isArray(rawAssessment?.criticalBarriers)
        ? (rawAssessment.criticalBarriers as string[])
        : [],
      summary:
        typeof rawAssessment?.summary === 'string'
          ? rawAssessment.summary
          : '',
    },
  };
}

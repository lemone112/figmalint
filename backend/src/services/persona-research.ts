import {
  PERSONAS,
  buildPersonaUserPrompt,
  type PersonaPrompt,
} from '../prompts/persona-research.js';
import { getAnthropicClient, MODEL } from './claude.js';

// ── Types ──────────────────────────────────────

export interface PersonaEvaluation {
  name: string;
  role: string;
  rating: 1 | 2 | 3 | 4 | 5;
  canCompleteTask: 'yes' | 'with_difficulty' | 'no';
  barriers: string[];
  positives: string[];
  frustrations: string[];
  suggestions: string[];
  quote: string;
}

export interface PersonaResult {
  personas: PersonaEvaluation[];
  aggregated: {
    averageRating: number;
    universalBarriers: string[]; // barriers shared by 3+ personas
    accessibilityGaps: string[];
    quickWins: string[]; // fixes that help 3+ personas
    summary: string;
  };
}

// ── Validation helpers ──────────────────────────

const VALID_RATINGS = new Set([1, 2, 3, 4, 5]);
const VALID_TASK_COMPLETION = new Set(['yes', 'with_difficulty', 'no']);

function normalizePersonaResult(
  raw: Record<string, unknown>,
  persona: PersonaPrompt,
): PersonaEvaluation {
  const rawRating = typeof raw.rating === 'number' ? raw.rating : 3;
  const rating = VALID_RATINGS.has(rawRating)
    ? (rawRating as 1 | 2 | 3 | 4 | 5)
    : 3;

  return {
    name: persona.name,
    role: persona.role,
    rating,
    canCompleteTask: VALID_TASK_COMPLETION.has(raw.canCompleteTask as string)
      ? (raw.canCompleteTask as PersonaEvaluation['canCompleteTask'])
      : 'no',
    barriers: Array.isArray(raw.barriers)
      ? raw.barriers.filter((b): b is string => typeof b === 'string')
      : [],
    positives: Array.isArray(raw.positives)
      ? raw.positives.filter((p): p is string => typeof p === 'string')
      : [],
    frustrations: Array.isArray(raw.frustrations)
      ? raw.frustrations.filter((f): f is string => typeof f === 'string')
      : [],
    suggestions: Array.isArray(raw.suggestions)
      ? raw.suggestions.filter((s): s is string => typeof s === 'string')
      : [],
    quote: typeof raw.quote === 'string' ? raw.quote : '',
  };
}

// ── Single Persona Call ──────────────────────────

async function runSinglePersona(
  persona: PersonaPrompt,
  screenshotBase64: string,
  taskDescription: string,
  lintContext?: string,
): Promise<PersonaEvaluation> {
  const client = getAnthropicClient();

  const userPrompt = buildPersonaUserPrompt(taskDescription, lintContext);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: persona.systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: screenshotBase64,
            },
          },
          { type: 'text', text: userPrompt },
        ],
      },
    ],
  });

  if (!response.content.length || response.content[0].type !== 'text') {
    throw new Error(`Empty response from ${persona.role} persona`);
  }

  const text = response.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`No JSON in ${persona.role} persona response`);
  }

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  return normalizePersonaResult(parsed, persona);
}

// ── Aggregation ─────────────────────────────────

function findUniversalBarriers(personas: PersonaEvaluation[]): string[] {
  // Count how many personas mention each barrier (fuzzy match via word overlap)
  const barrierGroups: Array<{ text: string; count: number; personas: string[] }> = [];

  for (const persona of personas) {
    for (const barrier of persona.barriers) {
      const barrierLower = barrier.toLowerCase();
      const barrierWords = new Set(
        barrierLower.split(/\s+/).filter((w) => w.length > 3),
      );

      const existing = barrierGroups.find((g) => {
        const gWords = new Set(
          g.text.toLowerCase().split(/\s+/).filter((w) => w.length > 3),
        );
        if (gWords.size === 0 || barrierWords.size === 0) return false;
        let overlap = 0;
        for (const word of barrierWords) {
          if (gWords.has(word)) overlap++;
        }
        const overlapRatio = overlap / Math.min(gWords.size, barrierWords.size);
        return overlapRatio >= 0.4;
      });

      if (existing) {
        if (!existing.personas.includes(persona.name)) {
          existing.count++;
          existing.personas.push(persona.name);
        }
      } else {
        barrierGroups.push({
          text: barrier,
          count: 1,
          personas: [persona.name],
        });
      }
    }
  }

  // Return barriers mentioned by 3+ personas
  return barrierGroups
    .filter((g) => g.count >= 3)
    .sort((a, b) => b.count - a.count)
    .map((g) => g.text);
}

function findQuickWins(personas: PersonaEvaluation[]): string[] {
  // Same logic as barriers but for suggestions
  const suggestionGroups: Array<{
    text: string;
    count: number;
    personas: string[];
  }> = [];

  for (const persona of personas) {
    for (const suggestion of persona.suggestions) {
      const sugLower = suggestion.toLowerCase();
      const sugWords = new Set(
        sugLower.split(/\s+/).filter((w) => w.length > 3),
      );

      const existing = suggestionGroups.find((g) => {
        const gWords = new Set(
          g.text.toLowerCase().split(/\s+/).filter((w) => w.length > 3),
        );
        if (gWords.size === 0 || sugWords.size === 0) return false;
        let overlap = 0;
        for (const word of sugWords) {
          if (gWords.has(word)) overlap++;
        }
        const overlapRatio = overlap / Math.min(gWords.size, sugWords.size);
        return overlapRatio >= 0.4;
      });

      if (existing) {
        if (!existing.personas.includes(persona.name)) {
          existing.count++;
          existing.personas.push(persona.name);
        }
      } else {
        suggestionGroups.push({
          text: suggestion,
          count: 1,
          personas: [persona.name],
        });
      }
    }
  }

  return suggestionGroups
    .filter((g) => g.count >= 3)
    .sort((a, b) => b.count - a.count)
    .map((g) => g.text);
}

function findAccessibilityGaps(personas: PersonaEvaluation[]): string[] {
  // Collect barriers from accessibility-sensitive personas
  const a11yPersonas = ['Screen Reader User', 'Elderly User (65+)'];
  const gaps: string[] = [];

  for (const persona of personas) {
    if (a11yPersonas.includes(persona.role)) {
      gaps.push(...persona.barriers);
    }
  }

  return gaps;
}

function buildAggregatedSummary(
  personas: PersonaEvaluation[],
  avgRating: number,
  universalBarriers: string[],
  quickWins: string[],
): string {
  const parts: string[] = [];

  if (avgRating >= 4) {
    parts.push(
      'The design performs well across diverse user profiles.',
    );
  } else if (avgRating >= 3) {
    parts.push(
      'The design is generally usable but presents challenges for some user groups.',
    );
  } else if (avgRating >= 2) {
    parts.push(
      'The design has significant usability barriers affecting multiple user profiles.',
    );
  } else {
    parts.push(
      'The design is difficult to use for most user profiles and needs substantial improvement.',
    );
  }

  const cantComplete = personas.filter((p) => p.canCompleteTask === 'no');
  if (cantComplete.length > 0) {
    parts.push(
      `${cantComplete.length} of ${personas.length} personas cannot complete the task (${cantComplete.map((p) => p.role).join(', ')}).`,
    );
  }

  if (universalBarriers.length > 0) {
    parts.push(
      `${universalBarriers.length} universal barrier${universalBarriers.length > 1 ? 's' : ''} identified across 3+ personas.`,
    );
  }

  if (quickWins.length > 0) {
    parts.push(
      `${quickWins.length} quick win${quickWins.length > 1 ? 's' : ''} would improve the experience for the majority of users.`,
    );
  }

  return parts.join(' ');
}

// ── Main Orchestrator ──────────────────────────

export async function runPersonaResearch(
  screenshot: string,
  taskDescription: string,
  lintContext?: string,
  sessionId?: string,
): Promise<PersonaResult> {
  // Run all 5 personas in PARALLEL
  const results = await Promise.all(
    PERSONAS.map((persona) =>
      runSinglePersona(persona, screenshot, taskDescription, lintContext),
    ),
  );

  // Aggregate results
  const ratings = results.map((r) => r.rating);
  const averageRating =
    Math.round(
      (ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100,
    ) / 100;

  const universalBarriers = findUniversalBarriers(results);
  const accessibilityGaps = findAccessibilityGaps(results);
  const quickWins = findQuickWins(results);
  const summary = buildAggregatedSummary(
    results,
    averageRating,
    universalBarriers,
    quickWins,
  );

  return {
    personas: results,
    aggregated: {
      averageRating,
      universalBarriers,
      accessibilityGaps,
      quickWins,
      summary,
    },
  };
}

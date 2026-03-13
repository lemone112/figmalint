/**
 * Build the AI prompt for aggregating a whole-page sweep into a File Health Report.
 */
export function buildPageSweepPrompt(
  frameSummaries: string,
  aggregatedStats: string,
): string {
  return `You are reviewing an entire Figma page consisting of multiple top-level frames. Each frame has been linted for design quality issues. Your task is to produce a holistic File Health Report.

## Aggregated Statistics
${aggregatedStats}

## Per-Frame Summaries
${frameSummaries}

## Your Task
Based on the screenshots and lint data for ALL frames, provide a holistic assessment:

1. **Strengths**: What does this file do well across frames? (consistent patterns, good practices, etc.)
2. **Weaknesses**: What recurring problems exist? (inconsistencies, common mistakes, etc.)
3. **Recommendations**: Actionable improvements that would have the biggest impact. For each, list which frames are affected.
4. **Summary**: A 2-3 sentence overall assessment.

Respond in this exact JSON format:
{
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "recommendations": [
    { "title": "<short title>", "description": "<specific actionable description>", "affectedFrames": ["<frame name>", "<frame name>"] }
  ],
  "summary": "<2-3 sentence overall assessment>"
}`;
}

/**
 * Build the AI prompt for a cognitive walkthrough analysis.
 * Sent alongside screenshots of all frames in the flow.
 */
import { sanitizeText } from '../utils/sanitize.js';
export function buildCognitiveWalkthroughPrompt(
  taskDescription: string,
  frameLabels: string[],
  edgeDescriptions: string[],
  interactiveElementDescriptions: string[],
): string {
  return `You are conducting a formal Cognitive Walkthrough (CW) of a user interface flow.

## Task
The user is trying to: "${sanitizeText(taskDescription)}"

## Flow Structure
The flow consists of ${frameLabels.length} screens, presented in order:
${frameLabels.map((label, i) => `  ${i + 1}. ${sanitizeText(label)}`).join('\n')}

## Transitions (edges)
${edgeDescriptions.length > 0 ? edgeDescriptions.map(d => sanitizeText(d)).join('\n') : 'No explicit transitions provided.'}

## Interactive Elements Per Screen
${interactiveElementDescriptions.length > 0 ? interactiveElementDescriptions.map(d => sanitizeText(d)).join('\n\n') : 'No interactive element data provided.'}

## Your Task
For EACH step (transition from one frame to the next), answer the 4 standard Cognitive Walkthrough questions. Base your answers on what is visually evident in the screenshots and the interactive element data provided.

### The 4 CW Questions
1. **Will the user try to achieve the right effect?** - Is the user's goal clear from this screen? Does the screen communicate what the user should do next to advance toward their task?
2. **Will the user notice that the correct action is available?** - Is the interactive element (button, link, input) that the user needs visible, prominent, and affordant? Could the user miss it?
3. **Will the user associate the correct action with the expected outcome?** - Does the label, icon, or visual treatment of the interactive element clearly indicate what will happen when activated? Is there ambiguity?
4. **Will the user see that progress is being made?** - After performing the action, does the next screen provide clear feedback that the action succeeded and the user is closer to their goal?

### Rating Scale
For each question, answer:
- "yes" - The design clearly supports this
- "partially" - The design somewhat supports this but there are concerns
- "no" - The design fails to support this; users will likely struggle

### Overall Step Success
Rate each step:
- "likely" - All 4 questions answered "yes" or at most one "partially"
- "uncertain" - Multiple "partially" answers or one "no"
- "unlikely" - Multiple "no" answers; users will likely fail at this step

Respond in this exact JSON format:
{
  "steps": [
    {
      "stepNumber": 1,
      "fromFrame": "<source frame name>",
      "toFrame": "<destination frame name>",
      "action": "<what the user needs to do at this step>",
      "questions": {
        "q1_willTry": { "answer": "yes|partially|no", "explanation": "<2-3 sentences>" },
        "q2_willNotice": { "answer": "yes|partially|no", "explanation": "<2-3 sentences>" },
        "q3_willAssociate": { "answer": "yes|partially|no", "explanation": "<2-3 sentences>" },
        "q4_willSeeProgress": { "answer": "yes|partially|no", "explanation": "<2-3 sentences>" }
      },
      "overallSuccess": "likely|uncertain|unlikely",
      "barriers": ["<barrier 1>", "<barrier 2>"],
      "suggestions": ["<suggestion 1>", "<suggestion 2>"]
    }
  ],
  "overallAssessment": {
    "taskCompletionLikelihood": "high|medium|low",
    "criticalBarriers": ["<barrier that would block most users>"],
    "summary": "<3-5 sentence summary of the walkthrough findings>"
  }
}`;
}

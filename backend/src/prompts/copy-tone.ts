/**
 * Copy & Tone Consistency prompt.
 * Analyzes text content across multiple screens for voice/terminology consistency.
 */

export function buildCopyTonePrompt(
  screens: Array<{ name: string; textContent: string[] }>,
  personality?: string[],
): string {
  const screensBlock = screens
    .map((s, i) => {
      const texts = s.textContent.map((t) => `    "${t}"`).join('\n');
      return `  Screen ${i + 1}: "${s.name}"\n${texts}`;
    })
    .join('\n\n');

  const personalityBlock =
    personality && personality.length > 0
      ? `\n## Brand Voice / Personality Keywords\n${personality.join(', ')}\n\nEvaluate whether the copy aligns with these personality traits.\n`
      : '';

  return `You are a senior UX copywriter and content strategist. Analyze the text content below, extracted from multiple screens of the same product. Your goal is to find inconsistencies in terminology, tone, voice, and readability across the flow.

## Screens and Text Content
${screensBlock}
${personalityBlock}
## Evaluation Criteria

### 1. Terminology Consistency
Find cases where the same concept is referred to with different terms across screens (e.g., "Sign up" vs "Register", "Delete" vs "Remove", "Settings" vs "Preferences"). Each inconsistency should name both terms, list the screens they appear on, and recommend which term to standardize on.

### 2. Tone / Voice Consistency
Detect shifts in formality (formal vs casual), person (first-person "I/My" vs second-person "You/Your" vs third-person), sentence structure (imperative vs declarative), and emotional register (friendly vs clinical). Flag specific text that breaks the dominant tone.

### 3. CTA Language Patterns
Examine all calls-to-action (buttons, links, prompts). Check for consistent use of action verbs (e.g., always "Create" or always "Add"), consistent casing (title case vs sentence case), and consistent structure (verb-first vs noun-first).

### 4. Readability Issues
Flag text that is overly long for its context, uses jargon or technical terms without explanation, contains passive voice where active would be clearer, or has grammatical issues. Consider the user's likely reading context (quick scan vs focused reading).

### 5. Accessibility of Language
Flag idioms, cultural references, abbreviations without expansion, or overly complex sentence structures that may be difficult for non-native speakers or users with cognitive disabilities.

Respond in this exact JSON format:
{
  "overallConsistency": "consistent|mostly_consistent|inconsistent",
  "terminologyIssues": [
    {
      "term1": "<first variant>",
      "term2": "<second variant>",
      "screens": ["<screen name 1>", "<screen name 2>"],
      "recommendation": "<which term to use and why>"
    }
  ],
  "toneIssues": [
    {
      "screen": "<screen name>",
      "text": "<the problematic text>",
      "tone": "<detected tone>",
      "expectedTone": "<what the dominant tone is>"
    }
  ],
  "ctaPatterns": {
    "consistent": true|false,
    "patterns": ["<dominant pattern 1>", "<dominant pattern 2>"],
    "violations": [
      {
        "screen": "<screen name>",
        "cta": "<the CTA text>",
        "issue": "<what is inconsistent>"
      }
    ]
  },
  "readabilityIssues": [
    {
      "screen": "<screen name>",
      "text": "<the problematic text>",
      "issue": "<what makes it hard to read>"
    }
  ],
  "recommendations": [
    {
      "title": "<short title>",
      "description": "<actionable recommendation>",
      "priority": "high|medium|low"
    }
  ],
  "summary": "<3-5 sentence overall copy consistency assessment>"
}`;
}

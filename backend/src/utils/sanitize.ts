/**
 * Sanitize user-supplied text before interpolating into AI prompts.
 * Wraps content in XML delimiters and strips any existing delimiter-like tags.
 */

const MAX_TEXT_LENGTH = 5000;
const MAX_ARRAY_ITEMS = 100;

/** Strip XML-like tags that could confuse prompt parsing */
function stripTags(text: string): string {
  return text.replace(/<\/?[a-zA-Z][^>]*>/g, '');
}

/** Sanitize a single user string for prompt interpolation */
export function sanitizeText(text: string, maxLen = MAX_TEXT_LENGTH): string {
  if (typeof text !== 'string') return '';
  return stripTags(text).trim().slice(0, maxLen);
}

/** Sanitize an array of user strings */
export function sanitizeTextArray(arr: unknown[], maxItems = MAX_ARRAY_ITEMS, maxLen = MAX_TEXT_LENGTH): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .slice(0, maxItems)
    .filter((item): item is string => typeof item === 'string')
    .map(item => sanitizeText(item, maxLen));
}

/** Wrap user-supplied content in XML delimiters for clear prompt boundary */
export function wrapUserContent(label: string, content: string): string {
  const safeLabel = /^[A-Za-z0-9_-]+$/.test(label) ? label : 'content';
  return `<user_${safeLabel}>\n${sanitizeText(content)}\n</user_${safeLabel}>`;
}

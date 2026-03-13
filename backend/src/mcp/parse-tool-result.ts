/**
 * Wrap a promise with a timeout. Rejects if the promise doesn't settle
 * within `ms` milliseconds.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms = 15_000,
  label = 'MCP call',
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

/**
 * Shared MCP tool result parser.
 * Extracts structured data from MCP JSON-RPC responses.
 */
export function parseToolResult(result: unknown): unknown {
  if (!result || typeof result !== 'object') return null;
  const r = result as { content?: Array<{ type: string; text?: string }> };
  if (!r.content?.length) return null;

  const textBlock = r.content.find(c => c.type === 'text');
  if (!textBlock?.text) return null;

  try {
    return JSON.parse(textBlock.text);
  } catch {
    return textBlock.text;
  }
}

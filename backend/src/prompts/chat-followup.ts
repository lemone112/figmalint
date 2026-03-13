export function buildFollowupPrompt(
  sessionContext: string,
): string {
  return `You are a design review assistant helping a designer improve their component.

Session context:
${sessionContext}

Respond naturally and helpfully. Be specific about what to fix and why. Keep responses concise.`;
}

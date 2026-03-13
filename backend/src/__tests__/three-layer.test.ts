import { describe, it, expect } from 'vitest';
import { buildThreeLayerPrompt, type LintError } from '../prompts/three-layer.js';

function makeError(overrides: Partial<LintError> = {}): LintError {
  return {
    errorType: 'spacing',
    message: 'Spacing value 12px is not on the 8px grid',
    value: '12px',
    ...overrides,
  };
}

describe('buildThreeLayerPrompt', () => {
  it('returns empty string for empty errors array', () => {
    const result = buildThreeLayerPrompt([]);
    expect(result).toBe('');
  });

  it('generates a prompt from a single error', () => {
    const errors: LintError[] = [
      makeError({
        errorType: 'fill',
        message: 'Hard-coded fill color #FF0000',
        value: '#FF0000',
      }),
    ];

    const result = buildThreeLayerPrompt(errors);

    expect(result).toContain('[fill]');
    expect(result).toContain('Hard-coded fill color #FF0000');
    expect(result).toContain('#FF0000');
    expect(result).toContain('1. [fill]');
    // The error list should only have one numbered lint finding
    expect(result).not.toContain('2. [');
  });

  it('numbers multiple errors sequentially', () => {
    const errors: LintError[] = [
      makeError({ errorType: 'spacing', message: 'Bad spacing', value: '12px' }),
      makeError({ errorType: 'fill', message: 'Bad fill', value: '#000' }),
      makeError({ errorType: 'text', message: 'Bad text size', value: '13px' }),
    ];

    const result = buildThreeLayerPrompt(errors);

    expect(result).toContain('1. [spacing]');
    expect(result).toContain('2. [fill]');
    expect(result).toContain('3. [text]');
  });

  it('includes the three-layer instruction structure', () => {
    const errors: LintError[] = [makeError()];
    const result = buildThreeLayerPrompt(errors);

    expect(result).toContain('**Rule**');
    expect(result).toContain('**Why**');
    expect(result).toContain('**Real-world**');
  });

  it('requests JSON response format', () => {
    const errors: LintError[] = [makeError()];
    const result = buildThreeLayerPrompt(errors);

    expect(result).toContain('"explanations"');
    expect(result).toContain('"rule"');
    expect(result).toContain('"why"');
    expect(result).toContain('"realWorld"');
  });

  it('includes current value in each error line', () => {
    const errors: LintError[] = [
      makeError({ value: '13px' }),
      makeError({ value: '#BADA55' }),
    ];

    const result = buildThreeLayerPrompt(errors);

    expect(result).toContain('(current value: 13px)');
    expect(result).toContain('(current value: #BADA55)');
  });

  it('mentions design principles and guidelines', () => {
    const errors: LintError[] = [makeError()];
    const result = buildThreeLayerPrompt(errors);

    expect(result).toContain('Gestalt');
    expect(result).toContain('WCAG');
    expect(result).toContain('Cognitive load');
    expect(result).toContain('Material Design');
    expect(result).toContain('Apple HIG');
  });

  it('asks for real-world product examples', () => {
    const errors: LintError[] = [makeError()];
    const result = buildThreeLayerPrompt(errors);

    expect(result).toContain('Stripe');
    expect(result).toContain('Linear');
    expect(result).toContain('Vercel');
  });
});

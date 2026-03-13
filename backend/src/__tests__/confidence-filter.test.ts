import { describe, it, expect } from 'vitest';
import {
  filterByConfidence,
  sortByConfidence,
  withConfidenceScoring,
  type ConfidencedFinding,
} from '../services/confidence-filter.js';

function makeFinding(overrides: Partial<ConfidencedFinding> = {}): ConfidencedFinding {
  return {
    finding: 'Test finding',
    confidence: 0.8,
    evidence: 'Visible in screenshot',
    category: 'colorHarmony',
    severity: 'warning',
    ...overrides,
  };
}

describe('filterByConfidence', () => {
  it('keeps findings at or above default threshold (0.7)', () => {
    const findings: ConfidencedFinding[] = [
      makeFinding({ confidence: 0.9 }),
      makeFinding({ confidence: 0.7 }),
      makeFinding({ confidence: 0.5 }),
      makeFinding({ confidence: 0.3 }),
    ];

    const result = filterByConfidence(findings);

    expect(result).toHaveLength(2);
    expect(result[0].confidence).toBe(0.9);
    expect(result[1].confidence).toBe(0.7);
  });

  it('accepts a custom threshold', () => {
    const findings: ConfidencedFinding[] = [
      makeFinding({ confidence: 0.9 }),
      makeFinding({ confidence: 0.5 }),
      makeFinding({ confidence: 0.4 }),
    ];

    const result = filterByConfidence(findings, 0.5);

    expect(result).toHaveLength(2);
    expect(result.every((f) => f.confidence >= 0.5)).toBe(true);
  });

  it('returns empty array when all findings are below threshold', () => {
    const findings: ConfidencedFinding[] = [
      makeFinding({ confidence: 0.1 }),
      makeFinding({ confidence: 0.2 }),
    ];

    const result = filterByConfidence(findings);

    expect(result).toHaveLength(0);
  });

  it('returns all findings when all are above threshold', () => {
    const findings: ConfidencedFinding[] = [
      makeFinding({ confidence: 0.95 }),
      makeFinding({ confidence: 0.85 }),
      makeFinding({ confidence: 0.75 }),
    ];

    const result = filterByConfidence(findings);

    expect(result).toHaveLength(3);
  });

  it('handles empty input', () => {
    const result = filterByConfidence([]);
    expect(result).toHaveLength(0);
  });

  it('includes findings exactly at the threshold boundary', () => {
    const findings: ConfidencedFinding[] = [
      makeFinding({ confidence: 0.7 }),
    ];

    const result = filterByConfidence(findings, 0.7);

    expect(result).toHaveLength(1);
  });
});

describe('sortByConfidence', () => {
  it('sorts by confidence descending', () => {
    const findings: ConfidencedFinding[] = [
      makeFinding({ finding: 'Low', confidence: 0.5 }),
      makeFinding({ finding: 'High', confidence: 0.95 }),
      makeFinding({ finding: 'Mid', confidence: 0.75 }),
    ];

    const result = sortByConfidence(findings);

    expect(result[0].finding).toBe('High');
    expect(result[1].finding).toBe('Mid');
    expect(result[2].finding).toBe('Low');
  });

  it('breaks ties by severity weight (critical > warning > info)', () => {
    const findings: ConfidencedFinding[] = [
      makeFinding({ finding: 'Info', confidence: 0.8, severity: 'info' }),
      makeFinding({ finding: 'Critical', confidence: 0.8, severity: 'critical' }),
      makeFinding({ finding: 'Warning', confidence: 0.8, severity: 'warning' }),
    ];

    const result = sortByConfidence(findings);

    expect(result[0].finding).toBe('Critical');
    expect(result[1].finding).toBe('Warning');
    expect(result[2].finding).toBe('Info');
  });

  it('does not mutate the original array', () => {
    const findings: ConfidencedFinding[] = [
      makeFinding({ finding: 'B', confidence: 0.5 }),
      makeFinding({ finding: 'A', confidence: 0.9 }),
    ];

    const original = [...findings];
    sortByConfidence(findings);

    expect(findings[0].finding).toBe(original[0].finding);
    expect(findings[1].finding).toBe(original[1].finding);
  });

  it('handles empty input', () => {
    const result = sortByConfidence([]);
    expect(result).toHaveLength(0);
  });

  it('handles single item', () => {
    const findings = [makeFinding({ confidence: 0.5 })];
    const result = sortByConfidence(findings);
    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe(0.5);
  });

  it('treats unknown severities as lowest weight', () => {
    const findings: ConfidencedFinding[] = [
      makeFinding({ finding: 'Unknown', confidence: 0.8, severity: 'custom' }),
      makeFinding({ finding: 'Warning', confidence: 0.8, severity: 'warning' }),
    ];

    const result = sortByConfidence(findings);

    expect(result[0].finding).toBe('Warning');
    expect(result[1].finding).toBe('Unknown');
  });
});

describe('withConfidenceScoring', () => {
  it('appends confidence instructions to the prompt', () => {
    const prompt = 'Analyze these findings.';
    const result = withConfidenceScoring(prompt);

    expect(result).toContain('Analyze these findings.');
    expect(result).toContain('"confidence" field');
    expect(result).toContain('0.9-1.0');
    expect(result).toContain('0.7-0.89');
    expect(result).toContain('0.5-0.69');
    expect(result).toContain('Below 0.5');
  });

  it('preserves the original prompt text at the start', () => {
    const prompt = 'My custom prompt text.';
    const result = withConfidenceScoring(prompt);

    expect(result.startsWith('My custom prompt text.')).toBe(true);
  });

  it('works with empty prompt', () => {
    const result = withConfidenceScoring('');
    expect(result).toContain('"confidence" field');
  });
});

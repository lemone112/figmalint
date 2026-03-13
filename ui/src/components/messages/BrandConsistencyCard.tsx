import { useState } from 'react';

interface ColorDeviation {
  element: string;
  found: string;
  expected: string;
}

interface TypographyIssue {
  element: string;
  issue: string;
}

interface SpacingIssue {
  element: string;
  issue: string;
}

interface BrandRecommendation {
  title: string;
  description: string;
  severity: string;
}

interface BrandConsistencyData {
  overallRating: 'pass' | 'needs_improvement' | 'fail';
  colorDeviations: ColorDeviation[];
  typographyIssues: TypographyIssue[];
  spacingIssues: SpacingIssue[];
  personalityMatch: string;
  recommendations: BrandRecommendation[];
  summary: string;
}

interface BrandConsistencyCardProps {
  data: BrandConsistencyData;
}

const RATING_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  pass: { label: 'PASS', color: 'text-fg-success', bg: 'bg-bg-success' },
  needs_improvement: { label: 'NEEDS WORK', color: 'text-fg-warning', bg: 'bg-bg-warning' },
  fail: { label: 'FAIL', color: 'text-fg-danger', bg: 'bg-bg-danger' },
};

const SEVERITY_STYLES: Record<string, { color: string; bg: string }> = {
  critical: { color: 'text-fg-danger', bg: 'bg-bg-danger' },
  warning: { color: 'text-fg-warning', bg: 'bg-bg-warning' },
  info: { color: 'text-fg-secondary', bg: 'bg-bg-tertiary' },
};

type SectionKey = 'colors' | 'typography' | 'spacing' | 'recommendations';

export default function BrandConsistencyCard({ data }: BrandConsistencyCardProps) {
  const [openSection, setOpenSection] = useState<SectionKey | null>(null);

  const rating = RATING_STYLES[data.overallRating] || RATING_STYLES.fail;

  const toggle = (key: SectionKey) => {
    setOpenSection(prev => (prev === key ? null : key));
  };

  const sections: Array<{ key: SectionKey; label: string; count: number; color: string }> = [
    { key: 'colors', label: 'Color deviations', count: data.colorDeviations.length, color: data.colorDeviations.length > 0 ? 'text-fg-danger' : 'text-fg-success' },
    { key: 'typography', label: 'Typography issues', count: data.typographyIssues.length, color: data.typographyIssues.length > 0 ? 'text-fg-warning' : 'text-fg-success' },
    { key: 'spacing', label: 'Spacing issues', count: data.spacingIssues.length, color: data.spacingIssues.length > 0 ? 'text-fg-warning' : 'text-fg-success' },
    { key: 'recommendations', label: 'Recommendations', count: data.recommendations.length, color: 'text-fg-secondary' },
  ];

  return (
    <div className="bg-bg-secondary rounded-xl p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-12 font-medium">Brand Consistency</span>
        <span className={`text-10 font-semibold px-1.5 py-0.5 rounded ${rating.bg} ${rating.color}`}>
          {rating.label}
        </span>
      </div>

      {/* Personality match */}
      {data.personalityMatch && (
        <p className="text-11 text-fg-secondary">
          <span className="text-fg-tertiary">Personality:</span> {data.personalityMatch}
        </p>
      )}

      {/* Category counts with collapsible details */}
      <div className="space-y-1">
        {sections.map(({ key, label, count, color }) => {
          const isOpen = openSection === key;
          const hasContent =
            (key === 'colors' && data.colorDeviations.length > 0) ||
            (key === 'typography' && data.typographyIssues.length > 0) ||
            (key === 'spacing' && data.spacingIssues.length > 0) ||
            (key === 'recommendations' && data.recommendations.length > 0);

          return (
            <div key={key}>
              <button
                className="flex items-center justify-between w-full text-11 py-0.5"
                onClick={() => hasContent && toggle(key)}
                disabled={!hasContent}
              >
                <span className="flex items-center gap-1 text-fg-secondary">
                  {hasContent && (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}
                      aria-hidden="true"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  )}
                  {label}
                </span>
                <span className={`tabular-nums font-medium ${color}`}>{count}</span>
              </button>

              {isOpen && key === 'colors' && (
                <div className="pl-4 space-y-0.5 mt-0.5">
                  {data.colorDeviations.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-10">
                      <span className="text-fg-secondary truncate flex-1">{d.element}</span>
                      <span className="font-mono text-fg-danger">{d.found}</span>
                      <span className="text-fg-tertiary">{'\u2192'}</span>
                      <span className="font-mono text-fg-success">{d.expected}</span>
                    </div>
                  ))}
                </div>
              )}

              {isOpen && key === 'typography' && (
                <div className="pl-4 space-y-0.5 mt-0.5">
                  {data.typographyIssues.map((t, i) => (
                    <div key={i} className="text-10">
                      <span className="text-fg-secondary">{t.element}</span>
                      <span className="text-fg-tertiary"> — {t.issue}</span>
                    </div>
                  ))}
                </div>
              )}

              {isOpen && key === 'spacing' && (
                <div className="pl-4 space-y-0.5 mt-0.5">
                  {data.spacingIssues.map((s, i) => (
                    <div key={i} className="text-10">
                      <span className="text-fg-secondary">{s.element}</span>
                      <span className="text-fg-tertiary"> — {s.issue}</span>
                    </div>
                  ))}
                </div>
              )}

              {isOpen && key === 'recommendations' && (
                <div className="pl-4 space-y-1 mt-0.5">
                  {data.recommendations.map((rec, i) => {
                    const sev = SEVERITY_STYLES[rec.severity] || SEVERITY_STYLES.info;
                    return (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className={`text-10 px-1 py-0.5 rounded shrink-0 ${sev.bg} ${sev.color}`}>
                          {rec.severity}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-10 font-medium text-fg">{rec.title}</p>
                          <p className="text-10 text-fg-secondary">{rec.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {data.summary && (
        <p className="text-10 text-fg-secondary pt-1 border-t border-border italic">{data.summary}</p>
      )}
    </div>
  );
}

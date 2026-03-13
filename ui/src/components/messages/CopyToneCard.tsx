import { useState } from 'react';

interface TerminologyIssue {
  term: string;
  variants: string[];
  suggestion: string;
}

interface ToneShift {
  screen: string;
  expectedTone: string;
  actualTone: string;
}

interface CopyRecommendation {
  title: string;
  description: string;
}

interface CopyToneData {
  overallConsistency: 'consistent' | 'mostly_consistent' | 'inconsistent';
  toneProfile: string;
  terminologyIssues: TerminologyIssue[];
  toneShifts: ToneShift[];
  recommendations: CopyRecommendation[];
  summary: string;
}

interface CopyToneCardProps {
  data: CopyToneData;
}

const CONSISTENCY_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  consistent: { label: 'CONSISTENT', color: 'text-fg-success', bg: 'bg-bg-success' },
  mostly_consistent: { label: 'MOSTLY OK', color: 'text-fg-warning', bg: 'bg-bg-warning' },
  inconsistent: { label: 'INCONSISTENT', color: 'text-fg-danger', bg: 'bg-bg-danger' },
};

export default function CopyToneCard({ data }: CopyToneCardProps) {
  const [showTerms, setShowTerms] = useState(data.terminologyIssues.length <= 3);
  const [showShifts, setShowShifts] = useState(data.toneShifts.length <= 3);
  const [showRecs, setShowRecs] = useState(false);

  const badge = CONSISTENCY_STYLES[data.overallConsistency] || CONSISTENCY_STYLES.inconsistent;

  return (
    <div className="bg-bg-secondary rounded-xl p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-12 font-medium">Copy & Tone</span>
        <span className={`text-10 font-semibold px-1.5 py-0.5 rounded ${badge.bg} ${badge.color}`}>
          {badge.label}
        </span>
      </div>

      {/* Tone profile */}
      {data.toneProfile && (
        <p className="text-11 text-fg-secondary">
          <span className="text-fg-tertiary">Tone:</span> {data.toneProfile}
        </p>
      )}

      {/* Terminology issues */}
      {data.terminologyIssues.length > 0 && (
        <div className="pt-1 border-t border-border">
          <button
            className="flex items-center gap-1 text-11 font-medium text-fg mb-1 w-full"
            onClick={() => setShowTerms(!showTerms)}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={`transition-transform ${showTerms ? 'rotate-90' : ''}`}
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Terminology ({data.terminologyIssues.length})
          </button>
          {showTerms && (
            <div className="space-y-1.5">
              {data.terminologyIssues.map((t, i) => (
                <div key={i} className="pl-3 text-10 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-fg">{t.term}</span>
                    <span className="text-fg-tertiary">{'\u2192'}</span>
                    <span className="text-fg-success">{t.suggestion}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {t.variants.map((v, j) => (
                      <span key={j} className="px-1 py-0.5 rounded bg-bg-danger/50 text-fg-danger font-mono">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tone shifts */}
      {data.toneShifts.length > 0 && (
        <div className="pt-1 border-t border-border">
          <button
            className="flex items-center gap-1 text-11 font-medium text-fg mb-1 w-full"
            onClick={() => setShowShifts(!showShifts)}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={`transition-transform ${showShifts ? 'rotate-90' : ''}`}
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Tone shifts ({data.toneShifts.length})
          </button>
          {showShifts && (
            <div className="space-y-1">
              {data.toneShifts.map((s, i) => (
                <div key={i} className="pl-3 text-10 flex items-center gap-1.5">
                  <span className="text-fg-secondary truncate">{s.screen}</span>
                  <span className="shrink-0 text-fg-tertiary">{s.expectedTone}</span>
                  <span className="shrink-0 text-fg-tertiary">{'\u2192'}</span>
                  <span className="shrink-0 text-fg-warning">{s.actualTone}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="pt-1 border-t border-border">
          <button
            className="flex items-center gap-1 text-11 font-medium text-fg mb-1 w-full"
            onClick={() => setShowRecs(!showRecs)}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={`transition-transform ${showRecs ? 'rotate-90' : ''}`}
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Recommendations ({data.recommendations.length})
          </button>
          {showRecs && (
            <div className="space-y-1">
              {data.recommendations.map((rec, i) => (
                <div key={i} className="pl-3">
                  <p className="text-10 font-medium text-fg">{rec.title}</p>
                  <p className="text-10 text-fg-secondary">{rec.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {data.summary && (
        <p className="text-10 text-fg-secondary pt-1 border-t border-border italic">{data.summary}</p>
      )}
    </div>
  );
}

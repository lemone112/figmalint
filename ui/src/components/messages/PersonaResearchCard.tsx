import { useState } from 'react';

interface PersonaIssue {
  description: string;
  severity: string;
}

interface Persona {
  name: string;
  description: string;
  rating: 1 | 2 | 3;
  confidence: string;
  issues: PersonaIssue[];
}

interface UniversalBarrier {
  description: string;
  flaggedBy: string[];
  severity: string;
}

interface QuickWin {
  title: string;
  description: string;
  impact: string;
}

interface PersonaResearchData {
  personas: Persona[];
  universalBarriers: UniversalBarrier[];
  quickWins: QuickWin[];
  summary: string;
}

interface PersonaResearchCardProps {
  data: PersonaResearchData;
}

const RATING_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Easy', color: 'text-fg-success', bg: 'bg-bg-success' },
  2: { label: 'Moderate', color: 'text-fg-warning', bg: 'bg-bg-warning' },
  3: { label: 'Difficult', color: 'text-fg-danger', bg: 'bg-bg-danger' },
};

const SEVERITY_STYLES: Record<string, { color: string; bg: string }> = {
  critical: { color: 'text-fg-danger', bg: 'bg-bg-danger' },
  warning: { color: 'text-fg-warning', bg: 'bg-bg-warning' },
  info: { color: 'text-fg-secondary', bg: 'bg-bg-tertiary' },
};

const IMPACT_STYLES: Record<string, { color: string; bg: string }> = {
  high: { color: 'text-fg-success', bg: 'bg-bg-success' },
  medium: { color: 'text-fg-warning', bg: 'bg-bg-warning' },
  low: { color: 'text-fg-secondary', bg: 'bg-bg-tertiary' },
};

export default function PersonaResearchCard({ data }: PersonaResearchCardProps) {
  const [expandedPersona, setExpandedPersona] = useState<number | null>(null);
  const [showBarriers, setShowBarriers] = useState(false);
  const [showWins, setShowWins] = useState(false);

  return (
    <div className="bg-bg-secondary rounded-xl p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-12 font-medium">Persona Research</span>
        <span className="text-10 text-fg-tertiary">{data.personas.length} personas</span>
      </div>

      {/* Personas */}
      <div className="space-y-1">
        {data.personas.map((persona, i) => {
          const ratingStyle = RATING_CONFIG[persona.rating] || RATING_CONFIG[2];
          const isExpanded = expandedPersona === i;

          return (
            <div key={i} className="rounded-md bg-bg-tertiary/30">
              <button
                className="flex items-center gap-2 w-full px-2 py-1.5 text-left"
                onClick={() => setExpandedPersona(isExpanded ? null : i)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-11 font-medium text-fg truncate">{persona.name}</span>
                    <span className={`text-10 font-semibold px-1 py-0.5 rounded shrink-0 ${ratingStyle.bg} ${ratingStyle.color}`}>
                      {ratingStyle.label}
                    </span>
                  </div>
                  <p className="text-10 text-fg-tertiary truncate">{persona.description}</p>
                </div>
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className={`shrink-0 text-fg-tertiary transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  aria-hidden="true"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              {isExpanded && (
                <div className="px-2 pb-1.5 space-y-1">
                  <p className="text-10 text-fg-tertiary">
                    Confidence: {persona.confidence}
                  </p>
                  {persona.issues.length > 0 && (
                    <div className="space-y-0.5">
                      {persona.issues.map((issue, j) => {
                        const sev = SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES.info;
                        return (
                          <div key={j} className="flex items-start gap-1.5 text-10">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${sev.bg.replace('bg-bg', 'bg-fg')}`} />
                            <span className="text-fg-secondary">{issue.description}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {persona.issues.length === 0 && (
                    <p className="text-10 text-fg-success">No issues identified</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Universal barriers */}
      {data.universalBarriers.length > 0 && (
        <div className="pt-1 border-t border-border">
          <button
            className="flex items-center gap-1 text-11 font-medium text-fg mb-1 w-full"
            onClick={() => setShowBarriers(!showBarriers)}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={`transition-transform ${showBarriers ? 'rotate-90' : ''}`}
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Universal barriers ({data.universalBarriers.length})
          </button>
          {showBarriers && (
            <div className="space-y-1">
              {data.universalBarriers.map((b, i) => {
                const sev = SEVERITY_STYLES[b.severity] || SEVERITY_STYLES.info;
                return (
                  <div key={i} className="flex items-start gap-1.5 pl-3 text-10">
                    <span className={`px-1 py-0.5 rounded shrink-0 ${sev.bg} ${sev.color}`}>
                      {b.severity}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-fg-secondary">{b.description}</p>
                      <p className="text-fg-tertiary">
                        Flagged by {b.flaggedBy.length} persona{b.flaggedBy.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Quick wins */}
      {data.quickWins.length > 0 && (
        <div className="pt-1 border-t border-border">
          <button
            className="flex items-center gap-1 text-11 font-medium text-fg mb-1 w-full"
            onClick={() => setShowWins(!showWins)}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={`transition-transform ${showWins ? 'rotate-90' : ''}`}
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Quick wins ({data.quickWins.length})
          </button>
          {showWins && (
            <div className="space-y-1">
              {data.quickWins.map((w, i) => {
                const impact = IMPACT_STYLES[w.impact] || IMPACT_STYLES.medium;
                return (
                  <div key={i} className="flex items-start gap-1.5 pl-3 text-10">
                    <span className={`px-1 py-0.5 rounded shrink-0 ${impact.bg} ${impact.color}`}>
                      {w.impact}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-fg">{w.title}</p>
                      <p className="text-fg-secondary">{w.description}</p>
                    </div>
                  </div>
                );
              })}
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

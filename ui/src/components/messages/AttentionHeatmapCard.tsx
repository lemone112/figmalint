import { useState } from 'react';

interface FocalPoint {
  element: string;
  strength: 'high' | 'medium' | 'low';
}

interface ReadingFlow {
  pattern: string;
  followsConvention: boolean;
  issues: string[];
}

interface CompetingElement {
  elements: string[];
  issue: string;
}

interface HeatmapRecommendation {
  title: string;
  description: string;
  severity: string;
}

interface AttentionHeatmapData {
  focalPoints: FocalPoint[];
  readingFlow: ReadingFlow;
  deadZones: string[];
  competingElements: CompetingElement[];
  visualWeightBalance: string;
  recommendations: HeatmapRecommendation[];
  summary: string;
}

interface AttentionHeatmapCardProps {
  data: AttentionHeatmapData;
}

const STRENGTH_STYLES: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  high: { label: 'High', color: 'text-fg-danger', bg: 'bg-bg-danger', dot: 'bg-fg-danger' },
  medium: { label: 'Med', color: 'text-fg-warning', bg: 'bg-bg-warning', dot: 'bg-fg-warning' },
  low: { label: 'Low', color: 'text-fg-secondary', bg: 'bg-bg-tertiary', dot: 'bg-fg-tertiary' },
};

const SEVERITY_STYLES: Record<string, { color: string; bg: string }> = {
  critical: { color: 'text-fg-danger', bg: 'bg-bg-danger' },
  warning: { color: 'text-fg-warning', bg: 'bg-bg-warning' },
  info: { color: 'text-fg-secondary', bg: 'bg-bg-tertiary' },
};

export default function AttentionHeatmapCard({ data }: AttentionHeatmapCardProps) {
  const [showRecs, setShowRecs] = useState(false);

  const { readingFlow } = data;

  return (
    <div className="bg-bg-secondary rounded-xl p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-12 font-medium">Attention Heatmap</span>
        <span className="text-10 text-fg-tertiary">{data.focalPoints.length} focal points</span>
      </div>

      {/* Focal points */}
      {data.focalPoints.length > 0 && (
        <div className="space-y-0.5">
          {data.focalPoints.map((fp, i) => {
            const strength = STRENGTH_STYLES[fp.strength] || STRENGTH_STYLES.low;
            return (
              <div key={i} className="flex items-center gap-2 text-11">
                <span className={`w-2 h-2 rounded-full shrink-0 ${strength.dot}`} />
                <span className="text-fg-secondary truncate flex-1">{fp.element}</span>
                <span className={`text-10 px-1 py-0.5 rounded shrink-0 ${strength.bg} ${strength.color}`}>
                  {strength.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Reading flow */}
      <div className="pt-1 border-t border-border">
        <div className="flex items-center justify-between text-11 mb-0.5">
          <span className="text-fg-secondary">Reading pattern</span>
          <div className="flex items-center gap-1.5">
            <span className="text-10 px-1 py-0.5 rounded bg-bg-tertiary text-fg font-medium">
              {readingFlow.pattern}
            </span>
            <span className={`w-1.5 h-1.5 rounded-full ${readingFlow.followsConvention ? 'bg-fg-success' : 'bg-fg-warning'}`} />
            <span className={`text-10 ${readingFlow.followsConvention ? 'text-fg-success' : 'text-fg-warning'}`}>
              {readingFlow.followsConvention ? 'Conventional' : 'Unusual'}
            </span>
          </div>
        </div>
        {readingFlow.issues.length > 0 && (
          <div className="space-y-0.5 mt-1">
            {readingFlow.issues.map((issue, i) => (
              <div key={i} className="flex items-start gap-1.5 text-10">
                <span className="text-fg-warning shrink-0 mt-0.5">!</span>
                <span className="text-fg-secondary">{issue}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Visual weight balance */}
      {data.visualWeightBalance && (
        <p className="text-11 text-fg-secondary">
          <span className="text-fg-tertiary">Balance:</span> {data.visualWeightBalance}
        </p>
      )}

      {/* Dead zones */}
      {data.deadZones.length > 0 && (
        <div className="pt-1 border-t border-border">
          <p className="text-11 font-medium text-fg mb-0.5">
            Dead zones ({data.deadZones.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {data.deadZones.map((zone, i) => (
              <span key={i} className="text-10 px-1 py-0.5 rounded bg-bg-tertiary text-fg-tertiary">
                {zone}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Competing elements */}
      {data.competingElements.length > 0 && (
        <div className="pt-1 border-t border-border">
          <p className="text-11 font-medium text-fg mb-0.5">
            Competing elements ({data.competingElements.length})
          </p>
          <div className="space-y-1">
            {data.competingElements.map((ce, i) => (
              <div key={i} className="text-10">
                <div className="flex flex-wrap gap-1 mb-0.5">
                  {ce.elements.map((el, j) => (
                    <span key={j} className="px-1 py-0.5 rounded bg-bg-warning/50 text-fg-warning">
                      {el}
                    </span>
                  ))}
                </div>
                <p className="text-fg-secondary pl-1">{ce.issue}</p>
              </div>
            ))}
          </div>
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
              {data.recommendations.map((rec, i) => {
                const sev = SEVERITY_STYLES[rec.severity] || SEVERITY_STYLES.info;
                return (
                  <div key={i} className="flex items-start gap-1.5 pl-3">
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
      )}

      {/* Summary */}
      {data.summary && (
        <p className="text-10 text-fg-secondary pt-1 border-t border-border italic">{data.summary}</p>
      )}
    </div>
  );
}

import { useState } from 'react';
import type { PageSweepData } from '../../lib/messages';

interface PageSweepCardProps {
  data: PageSweepData;
}

const GRADE_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  'excellent': { label: 'Excellent', color: 'text-fg-success', bg: 'bg-bg-success' },
  'needs-work': { label: 'Needs Work', color: 'text-fg-warning', bg: 'bg-bg-warning' },
  'poor': { label: 'Poor', color: 'text-fg-danger', bg: 'bg-bg-danger' },
};

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-fg-success';
  if (score >= 50) return 'text-fg-warning';
  return 'text-fg-danger';
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-fg-success';
  if (score >= 50) return 'bg-fg-warning';
  return 'bg-fg-danger';
}

export default function PageSweepCard({ data }: PageSweepCardProps) {
  const [showInsights, setShowInsights] = useState(false);
  const [showFrames, setShowFrames] = useState(false);

  const { fileHealth, frames, aiInsights } = data;
  const grade = GRADE_STYLES[fileHealth.grade] || GRADE_STYLES['poor'];

  return (
    <div className="bg-bg-secondary rounded-xl p-3 space-y-3">
      {/* Header: File Health Score */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-12 font-medium text-fg">File Health Report</span>
          <div className="text-10 text-fg-tertiary mt-0.5">
            {fileHealth.totalFrames} frames, {fileHealth.totalIssues} issues
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-11 font-semibold px-1.5 py-0.5 rounded ${grade.bg} ${grade.color}`}>
            {grade.label}
          </span>
          <span className={`text-[20px] font-bold tabular-nums ${getScoreColor(fileHealth.overallScore)}`}>
            {fileHealth.overallScore}
          </span>
        </div>
      </div>

      {/* Consistency Score Bar */}
      <div className="flex items-center gap-2 text-11">
        <span className="w-24 text-fg-secondary truncate">Consistency</span>
        <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getScoreBg(fileHealth.consistencyScore)}`}
            style={{ width: `${fileHealth.consistencyScore}%` }}
          />
        </div>
        <span className={`w-10 text-right tabular-nums ${getScoreColor(fileHealth.consistencyScore)}`}>
          {fileHealth.consistencyScore}%
        </span>
      </div>

      {/* Frame Grid */}
      <div>
        <p className="text-11 font-medium text-fg mb-1.5">Frames</p>
        <div className="grid grid-cols-3 gap-1.5">
          {frames.slice(0, showFrames ? frames.length : 9).map((frame) => (
            <div
              key={frame.id}
              className="bg-bg rounded-md px-2 py-1.5 text-center border border-border"
              title={`${frame.name}: ${frame.score}/100, ${frame.issueCount} issues`}
            >
              <div className={`text-13 font-bold tabular-nums ${getScoreColor(frame.score)}`}>
                {frame.score}
              </div>
              <div className="text-[9px] text-fg-secondary truncate mt-0.5" title={frame.name}>
                {frame.name}
              </div>
              {frame.issueCount > 0 && (
                <div className="text-[9px] text-fg-tertiary">
                  {frame.issueCount} issue{frame.issueCount !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          ))}
        </div>
        {frames.length > 9 && (
          <button
            className="text-10 text-fg-tertiary hover:text-fg-secondary mt-1"
            onClick={() => setShowFrames(!showFrames)}
          >
            {showFrames ? 'Show less' : `+${frames.length - 9} more frames`}
          </button>
        )}
      </div>

      {/* Top Issues */}
      {fileHealth.topIssues.length > 0 && (
        <div className="pt-1 border-t border-border">
          <p className="text-11 font-medium text-fg mb-1">Top Issues</p>
          <div className="space-y-0.5">
            {fileHealth.topIssues.slice(0, 5).map((issue, i) => (
              <div key={i} className="flex items-center justify-between text-11">
                <div className="flex items-center gap-1.5">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                    issue.severity === 'critical' ? 'bg-bg-danger' : issue.severity === 'warning' ? 'bg-bg-warning' : 'bg-bg-tertiary'
                  }`} />
                  <span className="text-fg-secondary">{issue.type}</span>
                </div>
                <span className="text-fg-tertiary tabular-nums">{issue.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Insights (collapsible) */}
      {aiInsights.summary && (
        <div className="pt-1 border-t border-border">
          <button
            className="flex items-center gap-1 text-11 font-medium text-fg hover:text-fg-secondary w-full text-left"
            onClick={() => setShowInsights(!showInsights)}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={`shrink-0 transition-transform ${showInsights ? 'rotate-90' : ''}`}
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            AI Insights
          </button>

          {showInsights && (
            <div className="mt-2 space-y-2">
              {/* Summary */}
              <p className="text-11 text-fg-secondary">{aiInsights.summary}</p>

              {/* Strengths */}
              {aiInsights.strengths.length > 0 && (
                <div>
                  <p className="text-10 font-medium text-fg-success mb-0.5">Strengths</p>
                  <ul className="space-y-0.5">
                    {aiInsights.strengths.map((s, i) => (
                      <li key={i} className="text-10 text-fg-secondary flex items-start gap-1">
                        <span className="shrink-0 mt-0.5">+</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weaknesses */}
              {aiInsights.weaknesses.length > 0 && (
                <div>
                  <p className="text-10 font-medium text-fg-danger mb-0.5">Weaknesses</p>
                  <ul className="space-y-0.5">
                    {aiInsights.weaknesses.map((w, i) => (
                      <li key={i} className="text-10 text-fg-secondary flex items-start gap-1">
                        <span className="shrink-0 mt-0.5">-</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {aiInsights.recommendations.length > 0 && (
                <div>
                  <p className="text-10 font-medium text-fg mb-0.5">Recommendations</p>
                  <ul className="space-y-1">
                    {aiInsights.recommendations.map((rec, i) => (
                      <li key={i} className="text-10 text-fg-secondary">
                        <span className="font-medium text-fg">{rec.title}:</span>{' '}
                        {rec.description}
                        {rec.affectedFrames.length > 0 && (
                          <div className="text-[9px] text-fg-tertiary mt-0.5">
                            Affects: {rec.affectedFrames.join(', ')}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

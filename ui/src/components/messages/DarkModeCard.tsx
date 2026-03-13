import { useState } from 'react';

interface DarkModeIssue {
  type: string;
  severity: string;
  nodeName: string;
  message: string;
  currentValue?: string;
  suggestions?: string[];
}

interface DarkModeMetrics {
  pureBlackBackgrounds: number;
  pureWhiteText: number;
  lowContrastOnDark: number;
  missingModeValues: number;
}

interface DarkModeSummary {
  totalChecked: number;
  passed: number;
  failed: number;
}

interface DarkModeData {
  issues: DarkModeIssue[];
  metrics: DarkModeMetrics;
  summary: DarkModeSummary;
}

interface DarkModeCardProps {
  data: DarkModeData;
}

const SEVERITY_STYLES: Record<string, { color: string; bg: string }> = {
  critical: { color: 'text-fg-danger', bg: 'bg-bg-danger' },
  warning: { color: 'text-fg-warning', bg: 'bg-bg-warning' },
  info: { color: 'text-fg-secondary', bg: 'bg-bg-tertiary' },
};

const METRIC_CONFIG: Array<{ key: keyof DarkModeMetrics; label: string; icon: string }> = [
  { key: 'pureBlackBackgrounds', label: 'Pure black BGs', icon: '◼' },
  { key: 'pureWhiteText', label: 'Pure white text', icon: '◻' },
  { key: 'lowContrastOnDark', label: 'Low contrast', icon: '◐' },
  { key: 'missingModeValues', label: 'Missing modes', icon: '⊘' },
];

export default function DarkModeCard({ data }: DarkModeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { summary, metrics, issues } = data;
  const passRate = summary.totalChecked > 0
    ? Math.round((summary.passed / summary.totalChecked) * 100)
    : 0;
  const allPassed = summary.failed === 0;
  const displayIssues = expanded ? issues : issues.slice(0, 4);

  return (
    <div className="bg-bg-secondary rounded-xl p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-12 font-medium">Dark Mode Audit</span>
        <span
          className={`text-10 font-semibold px-1.5 py-0.5 rounded ${
            allPassed ? 'bg-bg-success text-fg-success' : 'bg-bg-danger text-fg-danger'
          }`}
        >
          {allPassed ? 'PASS' : `${summary.failed} FAIL`}
        </span>
      </div>

      {/* Pass/fail summary bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden flex">
          <div
            className="h-full bg-fg-success transition-all"
            style={{ width: `${passRate}%` }}
          />
          <div
            className="h-full bg-fg-danger transition-all"
            style={{ width: `${100 - passRate}%` }}
          />
        </div>
        <span className="text-10 text-fg-secondary tabular-nums">
          {summary.passed}/{summary.totalChecked}
        </span>
      </div>

      {/* Metric counts */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {METRIC_CONFIG.map(({ key, label, icon }) => {
          const count = metrics[key];
          return (
            <div key={key} className="flex items-center gap-1.5 text-11">
              <span className="text-fg-tertiary">{icon}</span>
              <span className="text-fg-secondary">{label}</span>
              <span className={`ml-auto tabular-nums font-medium ${count > 0 ? 'text-fg-warning' : 'text-fg-success'}`}>
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Issues list */}
      {issues.length > 0 && (
        <div className="pt-1 border-t border-border">
          <p className="text-11 font-medium text-fg mb-1">Issues ({issues.length})</p>
          <div className="space-y-1">
            {displayIssues.map((issue, i) => {
              const sev = SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES.info;
              return (
                <div key={i} className="space-y-0.5">
                  <div className="flex items-start gap-1.5">
                    <span className={`text-10 px-1 py-0.5 rounded shrink-0 ${sev.bg} ${sev.color}`}>
                      {issue.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-11 text-fg-secondary leading-snug truncate">{issue.message}</p>
                      <span className="text-10 text-fg-tertiary">{issue.nodeName}</span>
                    </div>
                  </div>
                  {issue.currentValue && (
                    <p className="text-10 text-fg-tertiary pl-2">Current: {issue.currentValue}</p>
                  )}
                  {issue.suggestions && issue.suggestions.length > 0 && (
                    <p className="text-10 text-fg-success pl-2">
                      Fix: {issue.suggestions[0]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {issues.length > 4 && (
            <button
              className="w-full text-11 text-bg-brand hover:underline mt-1 text-center"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Show less' : `Show ${issues.length - 4} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

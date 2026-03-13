import { useState } from 'react';

interface MatchedToken {
  token: string;
  nodeCount: number;
  usage: 'correct' | 'overridden';
}

interface UnmatchedValue {
  value: string;
  nodeCount: number;
  nearestToken: string;
  distance: number;
}

interface TokenSummary {
  totalTokenDefs: number;
  usedInDesign: number;
  hardCodedValues: number;
  compliance: number;
}

interface TokenComplianceData {
  adoptionScore: number;
  matched: MatchedToken[];
  unmatched: UnmatchedValue[];
  orphanTokens: string[];
  summary: TokenSummary;
}

interface TokenComplianceCardProps {
  data: TokenComplianceData;
}

function getComplianceColor(score: number): string {
  if (score >= 90) return 'text-fg-success';
  if (score >= 70) return 'text-fg-warning';
  return 'text-fg-danger';
}

function getComplianceBg(score: number): { label: string; color: string; bg: string } {
  if (score >= 90) return { label: 'Compliant', color: 'text-fg-success', bg: 'bg-bg-success' };
  if (score >= 70) return { label: 'Partial', color: 'text-fg-warning', bg: 'bg-bg-warning' };
  return { label: 'Non-compliant', color: 'text-fg-danger', bg: 'bg-bg-danger' };
}

export default function TokenComplianceCard({ data }: TokenComplianceCardProps) {
  const [showUnmatched, setShowUnmatched] = useState(false);
  const [showOrphans, setShowOrphans] = useState(false);
  const { summary } = data;
  const grade = getComplianceBg(summary.compliance);

  const matchedCorrect = data.matched.filter(m => m.usage === 'correct').length;
  const matchedOverridden = data.matched.filter(m => m.usage === 'overridden').length;
  const displayUnmatched = showUnmatched ? data.unmatched : data.unmatched.slice(0, 4);

  return (
    <div className="bg-bg-secondary rounded-xl p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-12 font-medium">Token Compliance</span>
        <div className="flex items-center gap-2">
          <span className={`text-10 font-semibold px-1.5 py-0.5 rounded ${grade.bg} ${grade.color}`}>
            {grade.label}
          </span>
          <span className={`text-[20px] font-bold tabular-nums ${getComplianceColor(data.adoptionScore)}`}>
            {data.adoptionScore}%
          </span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-1.5 rounded-md bg-bg-tertiary/50">
          <span className="text-13 font-semibold text-fg tabular-nums">{summary.totalTokenDefs}</span>
          <p className="text-10 text-fg-tertiary">Defined</p>
        </div>
        <div className="text-center p-1.5 rounded-md bg-bg-tertiary/50">
          <span className="text-13 font-semibold text-fg-success tabular-nums">{summary.usedInDesign}</span>
          <p className="text-10 text-fg-tertiary">In use</p>
        </div>
        <div className="text-center p-1.5 rounded-md bg-bg-tertiary/50">
          <span className={`text-13 font-semibold tabular-nums ${summary.hardCodedValues > 0 ? 'text-fg-warning' : 'text-fg-success'}`}>
            {summary.hardCodedValues}
          </span>
          <p className="text-10 text-fg-tertiary">Hardcoded</p>
        </div>
      </div>

      {/* Matched tokens breakdown */}
      <div className="flex gap-3 text-11">
        <span className="text-fg-success">{matchedCorrect} correct</span>
        {matchedOverridden > 0 && (
          <span className="text-fg-warning">{matchedOverridden} overridden</span>
        )}
        {data.unmatched.length > 0 && (
          <span className="text-fg-danger">{data.unmatched.length} unmatched</span>
        )}
      </div>

      {/* Unmatched values with nearest token suggestions */}
      {data.unmatched.length > 0 && (
        <div className="pt-1 border-t border-border">
          <button
            className="flex items-center gap-1 text-11 font-medium text-fg mb-1 w-full"
            onClick={() => setShowUnmatched(!showUnmatched)}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={`transition-transform ${showUnmatched ? 'rotate-90' : ''}`}
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Unmatched values ({data.unmatched.length})
          </button>
          {(showUnmatched || data.unmatched.length <= 4) && (
            <div className="space-y-1">
              {displayUnmatched.map((u, i) => (
                <div key={i} className="flex items-start gap-1.5 text-10">
                  <span className="text-fg-secondary font-mono shrink-0 bg-bg-tertiary px-1 py-0.5 rounded">
                    {u.value}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-fg-tertiary">x{u.nodeCount}</span>
                    <p className="text-fg-success truncate">
                      Use: {u.nearestToken}
                    </p>
                  </div>
                </div>
              ))}
              {!showUnmatched && data.unmatched.length > 4 && (
                <button
                  className="text-10 text-bg-brand hover:underline"
                  onClick={() => setShowUnmatched(true)}
                >
                  +{data.unmatched.length - 4} more
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Orphan tokens */}
      {data.orphanTokens.length > 0 && (
        <div className="pt-1 border-t border-border">
          <button
            className="flex items-center gap-1 text-11 font-medium text-fg mb-1 w-full"
            onClick={() => setShowOrphans(!showOrphans)}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={`transition-transform ${showOrphans ? 'rotate-90' : ''}`}
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Orphan tokens ({data.orphanTokens.length})
          </button>
          {showOrphans && (
            <div className="flex flex-wrap gap-1">
              {data.orphanTokens.map((t, i) => (
                <span key={i} className="text-10 px-1 py-0.5 rounded bg-bg-tertiary text-fg-tertiary font-mono">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

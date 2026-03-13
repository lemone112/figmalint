interface CategoryDelta {
  category: string;
  oldScore: number;
  newScore: number;
  delta: number;
}

interface IssueDiff {
  errorType: string;
  severity: string;
  nodeId: string;
  message: string;
}

interface DiffData {
  baselineTimestamp: number;
  scoreDelta: {
    overall: number;
    oldOverall: number;
    newOverall: number;
    categories: CategoryDelta[];
  };
  newIssues: IssueDiff[];
  fixedIssues: IssueDiff[];
  remainingIssues: IssueDiff[];
  summary: {
    totalNew: number;
    totalFixed: number;
    totalRemaining: number;
    oldTotal: number;
    newTotal: number;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  tokens: 'Tokens',
  accessibility: 'A11y',
  spacing: 'Spacing',
  visualQuality: 'Visual',
  conversion: 'Conversion',
  microcopy: 'Microcopy',
  cognitive: 'Cognitive',
  layout: 'Layout',
  naming: 'Naming',
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${mins}`;
}

function DeltaArrow({ delta }: { delta: number }) {
  if (delta > 0) return <span className="text-fg-success font-semibold">+{delta}</span>;
  if (delta < 0) return <span className="text-fg-danger font-semibold">{delta}</span>;
  return <span className="text-fg-tertiary">0</span>;
}

function SeverityDot({ severity }: { severity: string }) {
  const color = severity === 'critical' ? 'bg-bg-danger' : severity === 'warning' ? 'bg-bg-warning' : 'bg-bg-tertiary';
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color} shrink-0 mt-1`} />;
}

export default function DiffCard({ data }: { data: DiffData }) {
  const { scoreDelta, summary } = data;
  const overallDelta = scoreDelta.overall;
  const improved = overallDelta > 0;
  const worsened = overallDelta < 0;

  return (
    <div className="bg-bg-secondary rounded-xl px-3 py-2 space-y-2">
      {/* Header: overall score change */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-12 font-medium text-fg">Baseline Diff</span>
          <span className="text-10 text-fg-tertiary">vs {formatDate(data.baselineTimestamp)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {improved && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-fg-success" aria-hidden="true">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          )}
          {worsened && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-fg-danger" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
          {!improved && !worsened && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-fg-tertiary" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          )}
          <span className={`text-13 font-bold ${improved ? 'text-fg-success' : worsened ? 'text-fg-danger' : 'text-fg-secondary'}`}>
            {scoreDelta.oldOverall} → {scoreDelta.newOverall}
          </span>
        </div>
      </div>

      {/* Issue counts: new / fixed / remaining */}
      <div className="flex gap-3 text-11">
        {summary.totalFixed > 0 && (
          <span className="text-fg-success">
            {summary.totalFixed} fixed
          </span>
        )}
        {summary.totalNew > 0 && (
          <span className="text-fg-danger">
            {summary.totalNew} new
          </span>
        )}
        <span className="text-fg-secondary">
          {summary.totalRemaining} remaining
        </span>
      </div>

      {/* Per-category deltas (only show categories that changed) */}
      {scoreDelta.categories.filter(c => c.delta !== 0).length > 0 && (
        <div className="space-y-1 pt-1 border-t border-border">
          {scoreDelta.categories
            .filter(c => c.delta !== 0)
            .map(c => (
              <div key={c.category} className="flex items-center justify-between text-11">
                <span className="text-fg-secondary">{CATEGORY_LABELS[c.category] || c.category}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-fg-tertiary">{c.oldScore}</span>
                  <span className="text-fg-tertiary">→</span>
                  <span className="text-fg-secondary">{c.newScore}</span>
                  <DeltaArrow delta={c.delta} />
                </div>
              </div>
            ))}
        </div>
      )}

      {/* New issues (collapsible if many) */}
      {data.newIssues.length > 0 && (
        <div className="pt-1 border-t border-border">
          <p className="text-11 font-medium text-fg-danger mb-1">New issues ({data.newIssues.length})</p>
          <div className="space-y-0.5">
            {data.newIssues.slice(0, 5).map((issue, i) => (
              <div key={i} className="flex items-start gap-1.5 text-10 text-fg-secondary">
                <SeverityDot severity={issue.severity} />
                <span className="truncate">[{issue.errorType}] {issue.message}</span>
              </div>
            ))}
            {data.newIssues.length > 5 && (
              <p className="text-10 text-fg-tertiary">+{data.newIssues.length - 5} more</p>
            )}
          </div>
        </div>
      )}

      {/* Fixed issues */}
      {data.fixedIssues.length > 0 && (
        <div className="pt-1 border-t border-border">
          <p className="text-11 font-medium text-fg-success mb-1">Fixed ({data.fixedIssues.length})</p>
          <div className="space-y-0.5">
            {data.fixedIssues.slice(0, 5).map((issue, i) => (
              <div key={i} className="flex items-start gap-1.5 text-10 text-fg-secondary line-through opacity-70">
                <SeverityDot severity={issue.severity} />
                <span className="truncate">[{issue.errorType}] {issue.message}</span>
              </div>
            ))}
            {data.fixedIssues.length > 5 && (
              <p className="text-10 text-fg-tertiary">+{data.fixedIssues.length - 5} more</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

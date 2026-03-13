import type { FlowAnalysisData, FlowGraphIssue } from '../../lib/messages';

interface FlowResultCardProps {
  data: FlowAnalysisData;
  onJumpToNode?: (nodeId: string) => void;
}

const SEVERITY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  info: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
};

function SeverityBadge({ severity }: { severity: string }) {
  const style = SEVERITY_STYLES[severity] || SEVERITY_STYLES.info;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-10 font-medium ${style.bg} ${style.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {severity}
    </span>
  );
}

function StatBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex flex-col items-center p-2 bg-bg-secondary rounded-md">
      <span className={`text-16 font-semibold tabular-nums ${color || 'text-fg'}`}>{value}</span>
      <span className="text-10 text-fg-tertiary">{label}</span>
    </div>
  );
}

function IssueRow({ issue, onJumpToNode }: { issue: FlowGraphIssue; onJumpToNode?: (id: string) => void }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-border last:border-0">
      <SeverityBadge severity={issue.severity} />
      <p className="flex-1 text-11 text-fg-secondary leading-snug">{issue.message}</p>
      {issue.frameIds.length > 0 && onJumpToNode && (
        <button
          className="shrink-0 text-10 text-fg-brand hover:underline"
          onClick={() => onJumpToNode(issue.frameIds[0])}
        >
          Go to
        </button>
      )}
    </div>
  );
}

export default function FlowResultCard({ data, onJumpToNode }: FlowResultCardProps) {
  const { graph, graphIssues, aiAnalysis } = data;
  const critical = graphIssues.filter(i => i.severity === 'critical').length;
  const warnings = graphIssues.filter(i => i.severity === 'warning').length;
  const info = graphIssues.filter(i => i.severity === 'info').length;

  return (
    <div className="bg-bg rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 bg-bg-secondary border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-12 font-semibold text-fg">Flow Analysis</h3>
          <span className="text-10 text-fg-tertiary">
            {graph.stats.totalFrames} screens, {graph.stats.totalEdges} connections
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 p-3">
        <StatBox label="Screens" value={graph.stats.totalFrames} />
        <StatBox label="Entry Points" value={graph.stats.totalEntryPoints} />
        <StatBox label="Max Depth" value={graph.stats.maxDepth} color={graph.stats.maxDepth > 3 ? 'text-fg-warning' : undefined} />
        <StatBox label="Issues" value={graphIssues.length} color={critical > 0 ? 'text-fg-danger' : warnings > 0 ? 'text-fg-warning' : 'text-fg-success'} />
      </div>

      {/* Quick summary badges */}
      <div className="flex gap-2 px-3 pb-2">
        {graph.deadEnds.length > 0 && (
          <span className="text-10 px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">
            {graph.deadEnds.length} dead end{graph.deadEnds.length !== 1 ? 's' : ''}
          </span>
        )}
        {graph.orphans.length > 0 && (
          <span className="text-10 px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">
            {graph.orphans.length} orphan{graph.orphans.length !== 1 ? 's' : ''}
          </span>
        )}
        {graph.unreachable.length > 0 && (
          <span className="text-10 px-1.5 py-0.5 bg-red-50 text-red-700 rounded">
            {graph.unreachable.length} unreachable
          </span>
        )}
        {graph.loops.length > 0 && (
          <span className="text-10 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
            {graph.loops.length} loop{graph.loops.length !== 1 ? 's' : ''}
          </span>
        )}
        {graphIssues.length === 0 && (
          <span className="text-10 px-1.5 py-0.5 bg-green-50 text-green-700 rounded">
            No structural issues
          </span>
        )}
      </div>

      {/* Issues list */}
      {graphIssues.length > 0 && (
        <div className="px-3 pb-2">
          <h4 className="text-11 font-medium text-fg mb-1">Issues</h4>
          <div className="max-h-40 overflow-y-auto">
            {graphIssues.map((issue, i) => (
              <IssueRow key={i} issue={issue} onJumpToNode={onJumpToNode} />
            ))}
          </div>
        </div>
      )}

      {/* AI Analysis results */}
      {aiAnalysis && (
        <div className="border-t border-border px-3 py-2">
          <h4 className="text-11 font-medium text-fg mb-2">AI Flow Review</h4>

          {/* Scenario completeness */}
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-10 text-fg-secondary">Happy path:</span>
              <span className={`text-10 font-medium ${aiAnalysis.scenarioAnalysis.happyPathComplete ? 'text-fg-success' : 'text-fg-danger'}`}>
                {aiAnalysis.scenarioAnalysis.happyPathComplete ? 'Complete' : 'Incomplete'}
              </span>
              <span className="text-10 text-fg-secondary ml-2">Error recovery:</span>
              <span className={`text-10 font-medium ${aiAnalysis.scenarioAnalysis.errorRecoveryPaths ? 'text-fg-success' : 'text-fg-warning'}`}>
                {aiAnalysis.scenarioAnalysis.errorRecoveryPaths ? 'Present' : 'Missing'}
              </span>
            </div>

            {aiAnalysis.scenarioAnalysis.missingScreens.length > 0 && (
              <div className="mt-1">
                <span className="text-10 text-fg-tertiary">Missing screens:</span>
                {aiAnalysis.scenarioAnalysis.missingScreens.map((s, i) => (
                  <div key={i} className="text-10 text-fg-secondary pl-2 py-0.5">
                    <SeverityBadge severity="warning" /> {s.type}: {s.description}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Consistency */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${aiAnalysis.consistencyAnalysis.colorDrift ? 'bg-amber-500' : 'bg-green-500'}`} />
              <span className="text-10 text-fg-secondary">Color {aiAnalysis.consistencyAnalysis.colorDrift ? 'drift' : 'consistent'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${aiAnalysis.consistencyAnalysis.typographyDrift ? 'bg-amber-500' : 'bg-green-500'}`} />
              <span className="text-10 text-fg-secondary">Typography {aiAnalysis.consistencyAnalysis.typographyDrift ? 'drift' : 'consistent'}</span>
            </div>
          </div>

          {/* AI Recommendations */}
          {aiAnalysis.recommendations.length > 0 && (
            <div>
              <span className="text-10 text-fg-tertiary">Recommendations:</span>
              {aiAnalysis.recommendations.slice(0, 5).map((rec, i) => (
                <div key={i} className="flex items-start gap-1.5 py-1">
                  <SeverityBadge severity={rec.severity} />
                  <div className="flex-1">
                    <span className="text-10 font-medium text-fg">{rec.title}</span>
                    <p className="text-10 text-fg-secondary">{rec.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          {aiAnalysis.summary && (
            <p className="text-10 text-fg-secondary mt-2 italic">{aiAnalysis.summary}</p>
          )}
        </div>
      )}
    </div>
  );
}

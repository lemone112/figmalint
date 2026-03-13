interface DebtCategory {
  orphanedStyles: number;
  detachedInstances: number;
  hardcodedValues: number;
  namingViolations: number;
  missingAutoLayout: number;
  inconsistentSpacing: number;
}

interface DesignDebtData {
  overall: number;
  components: DebtCategory;
  trend?: {
    direction: 'improving' | 'declining' | 'stable';
    delta: number;
  };
}

interface DesignDebtCardProps {
  data: DesignDebtData;
}

const CATEGORY_LABELS: Record<keyof DebtCategory, string> = {
  orphanedStyles: 'Orphaned styles',
  detachedInstances: 'Detached instances',
  hardcodedValues: 'Hardcoded values',
  namingViolations: 'Naming violations',
  missingAutoLayout: 'Missing auto-layout',
  inconsistentSpacing: 'Inconsistent spacing',
};

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-fg-success';
  if (score >= 70) return 'text-fg-warning';
  return 'text-fg-danger';
}

function getBarColor(score: number): string {
  if (score >= 90) return 'bg-fg-success';
  if (score >= 70) return 'bg-fg-warning';
  return 'bg-fg-danger';
}

function getGradeInfo(score: number): { label: string; color: string; bg: string } {
  if (score >= 90) return { label: 'Low Debt', color: 'text-fg-success', bg: 'bg-bg-success' };
  if (score >= 70) return { label: 'Moderate', color: 'text-fg-warning', bg: 'bg-bg-warning' };
  return { label: 'High Debt', color: 'text-fg-danger', bg: 'bg-bg-danger' };
}

function TrendIndicator({ trend }: { trend: DesignDebtData['trend'] }) {
  if (!trend) return null;
  const { direction, delta } = trend;

  if (direction === 'improving') {
    return (
      <span className="flex items-center gap-0.5 text-10 text-fg-success">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
          <polyline points="18 15 12 9 6 15" />
        </svg>
        +{delta}
      </span>
    );
  }
  if (direction === 'declining') {
    return (
      <span className="flex items-center gap-0.5 text-10 text-fg-danger">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
        -{delta}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-10 text-fg-tertiary">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      0
    </span>
  );
}

function CategoryBar({ label, count }: { label: string; count: number }) {
  const maxCount = 50;
  const pct = Math.min((count / maxCount) * 100, 100);
  const score = 100 - pct;

  return (
    <div className="flex items-center gap-2 text-11">
      <span className="w-[110px] text-fg-secondary truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${getBarColor(score)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right tabular-nums text-fg-secondary">{count}</span>
    </div>
  );
}

export default function DesignDebtCard({ data }: DesignDebtCardProps) {
  const grade = getGradeInfo(data.overall);

  return (
    <div className="bg-bg-secondary rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-12 font-medium">Design Debt</span>
        <div className="flex items-center gap-2">
          <TrendIndicator trend={data.trend} />
          <span className={`text-10 font-semibold px-1.5 py-0.5 rounded ${grade.bg} ${grade.color}`}>
            {grade.label}
          </span>
          <span className={`text-[20px] font-bold tabular-nums ${getScoreColor(data.overall)}`}>
            {data.overall}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        {(Object.keys(CATEGORY_LABELS) as Array<keyof DebtCategory>).map((key) => (
          <CategoryBar
            key={key}
            label={CATEGORY_LABELS[key]}
            count={data.components[key]}
          />
        ))}
      </div>
    </div>
  );
}

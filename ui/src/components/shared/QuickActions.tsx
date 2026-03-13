import { useState } from 'react';

interface QuickActionsProps {
  onAnalyze: () => void;
  hasFixable: boolean;
  analysisMode?: 'quick' | 'deep';
  hasBaseline?: boolean;
  isLoading?: boolean;
  onAction: (action: string, params?: Record<string, unknown>) => void;
}

export default function QuickActions({ onAnalyze, hasFixable, analysisMode = 'quick', hasBaseline, isLoading, onAction }: QuickActionsProps) {
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="border-t border-border">
      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center gap-2 px-3 py-1 text-11 text-fg-secondary">
          <div className="w-3 h-3 border-[1.5px] border-bg-brand border-t-transparent rounded-full animate-spin shrink-0" />
          <span>Running...</span>
        </div>
      )}
      {/* Primary row */}
      <div className={`flex items-center gap-1.5 px-3 py-1 overflow-x-auto ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
        {hasFixable && (
          <button
            className="shrink-0 px-2 py-1 text-11 bg-bg-brand text-fg-onbrand rounded-md hover:opacity-90 transition-opacity"
            onClick={() => onAction('fix-all')}
          >
            Fix all
          </button>
        )}
        <button
          className="shrink-0 px-2 py-1 text-11 text-fg-secondary hover:bg-bg-hover rounded-md transition-colors"
          onClick={onAnalyze}
        >
          Re-scan
        </button>
        <button
          className="shrink-0 px-2 py-1 text-11 text-fg-secondary hover:bg-bg-hover rounded-md transition-colors"
          onClick={() => onAction('save-baseline')}
          title="Save current results as baseline for future comparison"
        >
          {hasBaseline ? 'Update Baseline' : 'Save Baseline'}
        </button>
        {hasBaseline && (
          <button
            className="shrink-0 px-2 py-1 text-11 text-fg-secondary hover:bg-bg-hover rounded-md transition-colors"
            onClick={() => onAction('compare-baseline')}
            title="Compare current results with saved baseline"
          >
            Diff
          </button>
        )}
        <button
          className="shrink-0 px-2 py-1 text-11 text-fg-secondary hover:bg-bg-hover rounded-md transition-colors"
          onClick={() => onAction('export')}
          title="Copy markdown report"
        >
          Export
        </button>
        <button
          className="shrink-0 px-2 py-1 text-11 text-fg-tertiary hover:bg-bg-hover rounded-md transition-colors"
          onClick={() => onAction('export-json')}
          title="Copy JSON report"
        >
          JSON
        </button>
        <button
          className="shrink-0 px-2 py-1 text-11 text-fg-tertiary hover:bg-bg-hover rounded-md transition-colors"
          onClick={() => onAction('toggle-mode')}
          title={analysisMode === 'quick' ? 'Switch to deep analysis (includes Refero)' : 'Switch to quick analysis'}
        >
          {analysisMode === 'quick' ? 'Quick' : 'Deep'}
        </button>
        <button
          className="shrink-0 px-2 py-1 text-11 text-fg-secondary hover:bg-bg-hover rounded-md transition-colors"
          onClick={() => onAction('analyze-page')}
          title="Sweep all top-level frames on the page"
        >
          Sweep Page
        </button>
        <button
          className="shrink-0 px-2 py-1 text-11 text-fg-tertiary hover:bg-bg-hover rounded-md transition-colors"
          onClick={() => setShowMore((v) => !v)}
          title={showMore ? 'Hide advanced actions' : 'Show advanced actions'}
          aria-expanded={showMore}
        >
          {showMore ? 'Less' : 'More...'}
        </button>
      </div>

      {/* Secondary row — advanced actions */}
      {showMore && (
        <div className={`flex items-center gap-1.5 px-3 py-1 overflow-x-auto border-t border-border/50 ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
          <button
            className="shrink-0 px-2 py-1 text-11 text-fg-secondary hover:bg-bg-hover rounded-md transition-colors"
            onClick={() => onAction('design-debt')}
            title="Calculate design debt score from lint results"
          >
            Design Debt
          </button>
          <button
            className="shrink-0 px-2 py-1 text-11 text-fg-secondary hover:bg-bg-hover rounded-md transition-colors"
            onClick={() => onAction('dark-mode')}
            title="Compare variable modes (light/dark) for consistency"
          >
            Dark Mode
          </button>
          <button
            className="shrink-0 px-2 py-1 text-11 text-fg-secondary hover:bg-bg-hover rounded-md transition-colors"
            onClick={() => onAction('token-audit')}
            title="Check DTCG token compliance and collect variables"
          >
            Token Audit
          </button>
          <button
            className="shrink-0 px-2 py-1 text-11 text-fg-secondary hover:bg-bg-hover rounded-md transition-colors"
            onClick={() => onAction('brand-audit')}
            title="Analyze brand guide compliance (colors, typography, spacing)"
          >
            Brand Audit
          </button>
          <button
            className="shrink-0 px-2 py-1 text-11 text-fg-secondary hover:bg-bg-hover rounded-md transition-colors"
            onClick={() => onAction('copy-tone')}
            title="Analyze copy and tone consistency across screens"
          >
            Copy/Tone
          </button>
          <button
            className="shrink-0 px-2 py-1 text-11 text-fg-secondary hover:bg-bg-hover rounded-md transition-colors"
            onClick={() => onAction('persona-sim')}
            title="Run persona-based UX research simulation"
          >
            Persona Sim
          </button>
          <button
            className="shrink-0 px-2 py-1 text-11 text-fg-secondary hover:bg-bg-hover rounded-md transition-colors"
            onClick={() => onAction('a11y-spec')}
            title="Generate accessibility specification (ARIA, focus order, landmarks)"
          >
            A11y Spec
          </button>
        </div>
      )}
    </div>
  );
}

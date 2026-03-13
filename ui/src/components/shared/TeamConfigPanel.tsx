import { useState, useCallback, useEffect, useRef } from 'react';
import ScaleEditor from './ScaleEditor';
import SeveritySelector from './SeveritySelector';
import type { Severity } from './SeveritySelector';
import { postToPlugin } from '../../lib/messages';
import type { LintErrorType } from '../../lib/messages';

// ── Default values ──────────────────────────────────────────

const DEFAULT_SPACING_SCALE = [0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96];
const DEFAULT_RADIUS_SCALE = [0, 2, 4, 6, 8, 12, 16, 24, 999];

const SPACING_PRESETS = [
  { name: '4px grid', values: [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64] },
  { name: '8px grid', values: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96] },
];

const RADIUS_PRESETS = [
  { name: 'Tight', values: [0, 2, 4, 6, 8] },
  { name: 'Relaxed', values: [0, 4, 8, 12, 16, 24, 999] },
];

// ── Rule metadata ───────────────────────────────────────────

interface RuleMeta {
  type: LintErrorType;
  label: string;
}

const RULES: RuleMeta[] = [
  { type: 'fill', label: 'Fill styles' },
  { type: 'stroke', label: 'Stroke styles' },
  { type: 'effect', label: 'Effect styles' },
  { type: 'text', label: 'Text styles' },
  { type: 'radius', label: 'Border radius' },
  { type: 'spacing', label: 'Spacing' },
  { type: 'autoLayout', label: 'Auto layout' },
  { type: 'accessibility', label: 'Accessibility' },
  { type: 'visualQuality', label: 'Visual quality' },
  { type: 'microcopy', label: 'Microcopy' },
  { type: 'conversion', label: 'Conversion' },
  { type: 'cognitive', label: 'Cognitive load' },
];

// ── Team config shape (mirrors TeamLintConfig in types.ts) ─

interface TeamConfig {
  version: 1;
  scales: {
    radius: number[];
    spacing: number[];
  };
  severityOverrides: Partial<Record<LintErrorType, Severity>>;
  ignorePatterns: string[];
}

function createDefaultConfig(): TeamConfig {
  return {
    version: 1,
    scales: {
      spacing: [...DEFAULT_SPACING_SCALE],
      radius: [...DEFAULT_RADIUS_SCALE],
    },
    severityOverrides: {},
    ignorePatterns: [],
  };
}

// ── Collapsible section ─────────────────────────────────────

function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-bg-hover transition-colors"
        aria-expanded={open}
      >
        <span className="text-11 font-medium text-fg-secondary uppercase tracking-wide">
          {title}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`text-fg-tertiary transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && <div className="px-3 pb-3 space-y-2">{children}</div>}
    </section>
  );
}

// ── Main panel ──────────────────────────────────────────────

interface TeamConfigPanelProps {
  /** Initial config to pre-fill, e.g. loaded from plugin data */
  initialConfig?: TeamConfig;
  onClose: () => void;
}

export default function TeamConfigPanel({
  initialConfig,
  onClose,
}: TeamConfigPanelProps) {
  const [config, setConfig] = useState<TeamConfig>(
    () => initialConfig ?? createDefaultConfig(),
  );
  const [patternInput, setPatternInput] = useState('');
  const [dirty, setDirty] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);

  // Mark dirty on any config change after initial render
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setDirty(true);
  }, [config]);

  // Focus trap + Escape to close
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const focusables = panel.querySelectorAll<HTMLElement>(focusableSelector);
    if (focusables.length > 0) focusables[0].focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = panel.querySelectorAll<HTMLElement>(focusableSelector);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    panel.addEventListener('keydown', handleKeyDown);
    return () => panel.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // ── Handlers ────────────────────────────────────────────

  const setSpacingScale = useCallback((values: number[]) => {
    setConfig((prev) => ({
      ...prev,
      scales: { ...prev.scales, spacing: values },
    }));
  }, []);

  const setRadiusScale = useCallback((values: number[]) => {
    setConfig((prev) => ({
      ...prev,
      scales: { ...prev.scales, radius: values },
    }));
  }, []);

  const setSeverity = useCallback(
    (ruleType: LintErrorType, severity: Severity) => {
      setConfig((prev) => ({
        ...prev,
        severityOverrides: {
          ...prev.severityOverrides,
          [ruleType]: severity,
        },
      }));
    },
    [],
  );

  const addPattern = useCallback(() => {
    const trimmed = patternInput.trim();
    if (!trimmed) return;
    if (config.ignorePatterns.includes(trimmed)) {
      setPatternInput('');
      return;
    }
    setConfig((prev) => ({
      ...prev,
      ignorePatterns: [...prev.ignorePatterns, trimmed],
    }));
    setPatternInput('');
  }, [patternInput, config.ignorePatterns]);

  const removePattern = useCallback((pattern: string) => {
    setConfig((prev) => ({
      ...prev,
      ignorePatterns: prev.ignorePatterns.filter((p) => p !== pattern),
    }));
  }, []);

  const handlePatternKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addPattern();
      }
    },
    [addPattern],
  );

  const handleSave = useCallback(() => {
    postToPlugin('lint-save-team-config', config);
    setDirty(false);
  }, [config]);

  const handleLoad = useCallback(() => {
    postToPlugin('lint-load-team-config');
  }, []);

  const handleReset = useCallback(() => {
    setConfig(createDefaultConfig());
  }, []);

  // ── Render ──────────────────────────────────────────────

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Team lint configuration"
      className="absolute inset-0 z-50 bg-bg flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-12 font-medium text-fg">Team Config</span>
        <button
          type="button"
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center text-fg-tertiary hover:text-fg rounded-md hover:bg-bg-hover transition-colors"
          aria-label="Close team config"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Spacing scale */}
        <Section title="Spacing Scale" defaultOpen>
          <ScaleEditor
            label="Allowed spacing values (px)"
            values={config.scales.spacing}
            onChange={setSpacingScale}
            presets={SPACING_PRESETS}
          />
        </Section>

        {/* Radius scale */}
        <Section title="Radius Scale" defaultOpen>
          <ScaleEditor
            label="Allowed border radii (px)"
            values={config.scales.radius}
            onChange={setRadiusScale}
            presets={RADIUS_PRESETS}
          />
        </Section>

        {/* Severity overrides */}
        <Section title="Rule Severity">
          <div className="space-y-0.5">
            {RULES.map((rule) => (
              <SeveritySelector
                key={rule.type}
                label={rule.label}
                value={config.severityOverrides[rule.type] ?? 'warning'}
                onChange={(v) => setSeverity(rule.type, v)}
              />
            ))}
          </div>
        </Section>

        {/* Ignore patterns */}
        <Section title="Ignore Patterns">
          <p className="text-10 text-fg-tertiary">
            Layer names matching these glob patterns will be skipped during
            linting.
          </p>
          <div className="flex gap-1">
            <input
              type="text"
              value={patternInput}
              onChange={(e) => setPatternInput(e.target.value)}
              onKeyDown={handlePatternKeyDown}
              placeholder="_internal/*, WIP-*"
              className="flex-1 min-w-0 px-2 py-1 text-11 bg-bg-secondary border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-bg-brand"
              aria-label="Add ignore pattern"
            />
            <button
              type="button"
              onClick={addPattern}
              disabled={!patternInput.trim()}
              className="shrink-0 px-2 py-1 text-11 text-fg-secondary bg-bg-secondary border border-border rounded-md hover:bg-bg-hover transition-colors disabled:opacity-40"
            >
              Add
            </button>
          </div>
          {config.ignorePatterns.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {config.ignorePatterns.map((pattern) => (
                <span
                  key={pattern}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-11 bg-bg-secondary text-fg rounded"
                >
                  <code className="text-10">{pattern}</code>
                  <button
                    type="button"
                    onClick={() => removePattern(pattern)}
                    className="text-fg-tertiary hover:text-fg-danger transition-colors"
                    aria-label={`Remove pattern ${pattern}`}
                  >
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      aria-hidden="true"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Footer with save/load */}
      <div className="shrink-0 border-t border-border px-3 py-2 space-y-2">
        <p className="text-10 text-fg-tertiary">
          Team config is shared with all editors of this file.
        </p>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-1.5 text-11 font-medium bg-bg-brand text-fg-onbrand rounded-md hover:opacity-90 transition-opacity"
          >
            {dirty ? 'Save to File *' : 'Save to File'}
          </button>
          <button
            type="button"
            onClick={handleLoad}
            className="flex-1 py-1.5 text-11 font-medium bg-bg-secondary text-fg border border-border rounded-md hover:bg-bg-hover transition-colors"
          >
            Load from File
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="shrink-0 py-1.5 px-2 text-11 text-fg-tertiary hover:bg-bg-hover rounded-md transition-colors"
            title="Reset to defaults"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

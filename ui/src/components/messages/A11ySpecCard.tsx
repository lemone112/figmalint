import { useState } from 'react';

interface Landmark {
  role: string;
  label: string;
}

interface HeadingItem {
  level: number;
  text: string;
}

interface FocusItem {
  index: number;
  element: string;
  role: string;
}

interface AriaAnnotation {
  element: string;
  attributes: Record<string, string>;
}

interface KeyboardShortcut {
  key: string;
  action: string;
}

interface LiveRegion {
  element: string;
  politeness: string;
}

interface ContrastItem {
  element: string;
  ratio: number;
  passes: boolean;
  level: string;
}

interface Recommendation {
  title: string;
  description: string;
  severity: string;
}

interface A11ySpecData {
  landmarks: Landmark[];
  headingStructure: HeadingItem[];
  focusOrder: FocusItem[];
  ariaAnnotations: AriaAnnotation[];
  keyboardShortcuts: KeyboardShortcut[];
  liveRegions: LiveRegion[];
  colorContrastReport: ContrastItem[];
  recommendations: Recommendation[];
}

interface A11ySpecCardProps {
  data: A11ySpecData;
}

type TabKey = 'landmarks' | 'headings' | 'focus' | 'contrast' | 'recommendations';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'landmarks', label: 'Landmarks' },
  { key: 'headings', label: 'Headings' },
  { key: 'focus', label: 'Focus' },
  { key: 'contrast', label: 'Contrast' },
  { key: 'recommendations', label: 'Tips' },
];

const SEVERITY_STYLES: Record<string, { color: string; bg: string }> = {
  critical: { color: 'text-fg-danger', bg: 'bg-bg-danger' },
  warning: { color: 'text-fg-warning', bg: 'bg-bg-warning' },
  info: { color: 'text-fg-secondary', bg: 'bg-bg-tertiary' },
};

function LandmarksTab({ landmarks, ariaAnnotations, keyboardShortcuts, liveRegions }: {
  landmarks: Landmark[];
  ariaAnnotations: AriaAnnotation[];
  keyboardShortcuts: KeyboardShortcut[];
  liveRegions: LiveRegion[];
}) {
  return (
    <div className="space-y-2">
      {landmarks.length > 0 && (
        <div>
          <p className="text-10 text-fg-tertiary mb-0.5">Landmarks</p>
          {landmarks.map((lm, i) => (
            <div key={i} className="flex items-center gap-2 py-0.5 text-11">
              <span className="text-10 px-1 py-0.5 rounded bg-bg-tertiary text-fg-secondary font-mono">{lm.role}</span>
              <span className="text-fg-secondary truncate">{lm.label}</span>
            </div>
          ))}
        </div>
      )}
      {ariaAnnotations.length > 0 && (
        <div>
          <p className="text-10 text-fg-tertiary mb-0.5">ARIA annotations</p>
          {ariaAnnotations.map((ann, i) => (
            <div key={i} className="py-0.5 text-11">
              <span className="text-fg-secondary">{ann.element}</span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {Object.entries(ann.attributes).map(([attr, val]) => (
                  <span key={attr} className="text-10 px-1 py-0.5 rounded bg-bg-tertiary text-fg-tertiary font-mono">
                    {attr}="{val}"
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {keyboardShortcuts.length > 0 && (
        <div>
          <p className="text-10 text-fg-tertiary mb-0.5">Keyboard shortcuts</p>
          {keyboardShortcuts.map((ks, i) => (
            <div key={i} className="flex items-center gap-2 py-0.5 text-11">
              <kbd className="text-10 px-1 py-0.5 rounded bg-bg-tertiary text-fg-secondary font-mono border border-border">
                {ks.key}
              </kbd>
              <span className="text-fg-secondary">{ks.action}</span>
            </div>
          ))}
        </div>
      )}
      {liveRegions.length > 0 && (
        <div>
          <p className="text-10 text-fg-tertiary mb-0.5">Live regions</p>
          {liveRegions.map((lr, i) => (
            <div key={i} className="flex items-center gap-2 py-0.5 text-11">
              <span className="text-fg-secondary">{lr.element}</span>
              <span className="text-10 px-1 py-0.5 rounded bg-bg-tertiary text-fg-tertiary">{lr.politeness}</span>
            </div>
          ))}
        </div>
      )}
      {landmarks.length === 0 && ariaAnnotations.length === 0 && keyboardShortcuts.length === 0 && liveRegions.length === 0 && (
        <p className="text-11 text-fg-tertiary">No landmarks or annotations found.</p>
      )}
    </div>
  );
}

function HeadingsTab({ headings }: { headings: HeadingItem[] }) {
  if (headings.length === 0) {
    return <p className="text-11 text-fg-tertiary">No heading structure defined.</p>;
  }
  return (
    <div className="space-y-0.5">
      {headings.map((h, i) => (
        <div
          key={i}
          className="flex items-center gap-1.5 text-11"
          style={{ paddingLeft: `${(h.level - 1) * 12}px` }}
        >
          <span className="text-10 px-1 py-0.5 rounded bg-bg-tertiary text-fg-tertiary font-mono shrink-0">
            H{h.level}
          </span>
          <span className="text-fg-secondary truncate">{h.text}</span>
        </div>
      ))}
    </div>
  );
}

function FocusTab({ items }: { items: FocusItem[] }) {
  if (items.length === 0) {
    return <p className="text-11 text-fg-tertiary">No focus order defined.</p>;
  }
  return (
    <div className="space-y-0.5">
      {items.map((f) => (
        <div key={f.index} className="flex items-center gap-2 text-11">
          <span className="w-5 text-right text-10 text-fg-tertiary tabular-nums">{f.index}</span>
          <span className="text-fg-secondary truncate flex-1">{f.element}</span>
          <span className="text-10 text-fg-tertiary">{f.role}</span>
        </div>
      ))}
    </div>
  );
}

function ContrastTab({ items }: { items: ContrastItem[] }) {
  if (items.length === 0) {
    return <p className="text-11 text-fg-tertiary">No contrast data available.</p>;
  }
  return (
    <div className="space-y-0.5">
      {items.map((c, i) => (
        <div key={i} className="flex items-center gap-2 text-11">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.passes ? 'bg-fg-success' : 'bg-fg-danger'}`} />
          <span className="text-fg-secondary truncate flex-1">{c.element}</span>
          <span className={`tabular-nums text-10 ${c.passes ? 'text-fg-success' : 'text-fg-danger'}`}>
            {c.ratio.toFixed(1)}:1
          </span>
          <span className="text-10 text-fg-tertiary">{c.level}</span>
        </div>
      ))}
    </div>
  );
}

function RecommendationsTab({ items }: { items: Recommendation[] }) {
  if (items.length === 0) {
    return <p className="text-11 text-fg-tertiary">No recommendations.</p>;
  }
  return (
    <div className="space-y-1.5">
      {items.map((rec, i) => {
        const sev = SEVERITY_STYLES[rec.severity] || SEVERITY_STYLES.info;
        return (
          <div key={i} className="flex items-start gap-1.5">
            <span className={`text-10 px-1 py-0.5 rounded shrink-0 ${sev.bg} ${sev.color}`}>
              {rec.severity}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-11 font-medium text-fg">{rec.title}</p>
              <p className="text-10 text-fg-secondary">{rec.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function A11ySpecCard({ data }: A11ySpecCardProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('landmarks');

  const contrastPassed = data.colorContrastReport.filter(c => c.passes).length;
  const contrastTotal = data.colorContrastReport.length;

  return (
    <div className="bg-bg-secondary rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 flex items-center justify-between">
        <span className="text-12 font-medium">A11y Spec</span>
        {contrastTotal > 0 && (
          <span className={`text-10 tabular-nums ${contrastPassed === contrastTotal ? 'text-fg-success' : 'text-fg-warning'}`}>
            Contrast {contrastPassed}/{contrastTotal}
          </span>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-y border-border bg-bg-tertiary/30">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            className={`flex-1 px-1 py-1.5 text-10 text-center transition-colors ${
              activeTab === key
                ? 'text-fg font-semibold border-b-2 border-fg'
                : 'text-fg-tertiary hover:text-fg-secondary'
            }`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-3 py-2 max-h-56 overflow-y-auto">
        {activeTab === 'landmarks' && (
          <LandmarksTab
            landmarks={data.landmarks}
            ariaAnnotations={data.ariaAnnotations}
            keyboardShortcuts={data.keyboardShortcuts}
            liveRegions={data.liveRegions}
          />
        )}
        {activeTab === 'headings' && <HeadingsTab headings={data.headingStructure} />}
        {activeTab === 'focus' && <FocusTab items={data.focusOrder} />}
        {activeTab === 'contrast' && <ContrastTab items={data.colorContrastReport} />}
        {activeTab === 'recommendations' && <RecommendationsTab items={data.recommendations} />}
      </div>
    </div>
  );
}

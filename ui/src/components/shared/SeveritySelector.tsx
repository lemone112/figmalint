import { useCallback } from 'react';

export type Severity = 'critical' | 'warning' | 'info' | 'off';

interface SeveritySelectorProps {
  value: Severity;
  onChange: (value: Severity) => void;
  label: string;
}

const SEVERITY_OPTIONS: Array<{
  value: Severity;
  abbr: string;
  dotClass: string;
  title: string;
}> = [
  { value: 'critical', abbr: 'C', dotClass: 'bg-fg-danger', title: 'Critical' },
  { value: 'warning', abbr: 'W', dotClass: 'bg-fg-warning', title: 'Warning' },
  { value: 'info', abbr: 'I', dotClass: 'bg-bg-brand', title: 'Info' },
  { value: 'off', abbr: 'O', dotClass: 'bg-fg-disabled', title: 'Off' },
];

export default function SeveritySelector({
  value,
  onChange,
  label,
}: SeveritySelectorProps) {
  const handleClick = useCallback(
    (severity: Severity) => {
      onChange(severity);
    },
    [onChange],
  );

  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-11 text-fg truncate" title={label}>
        {label}
      </span>
      <div className="flex items-center gap-0.5 shrink-0">
        {SEVERITY_OPTIONS.map((opt) => {
          const isActive = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleClick(opt.value)}
              className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${
                isActive
                  ? 'bg-bg-selected ring-1 ring-border-strong'
                  : 'hover:bg-bg-hover'
              }`}
              title={opt.title}
              aria-label={`Set ${label} to ${opt.title}`}
              aria-pressed={isActive}
            >
              <span
                className={`w-2 h-2 rounded-full ${opt.dotClass} ${
                  !isActive ? 'opacity-40' : ''
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

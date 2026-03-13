import { useState, useCallback, useRef } from 'react';

interface Preset {
  name: string;
  values: number[];
}

interface ScaleEditorProps {
  values: number[];
  onChange: (values: number[]) => void;
  label: string;
  presets?: Preset[];
}

export default function ScaleEditor({
  values,
  onChange,
  label,
  presets,
}: ScaleEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const sorted = [...values].sort((a, b) => a - b);

  const handleRemove = useCallback(
    (val: number) => {
      onChange(values.filter((v) => v !== val));
    },
    [values, onChange],
  );

  const handleAdd = useCallback(() => {
    const num = parseInt(inputValue.trim(), 10);
    if (isNaN(num) || num < 0) return;
    if (values.includes(num)) {
      // Already exists, just close
      setInputValue('');
      setIsAdding(false);
      return;
    }
    onChange([...values, num].sort((a, b) => a - b));
    setInputValue('');
    setIsAdding(false);
  }, [inputValue, values, onChange]);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
      } else if (e.key === 'Escape') {
        setInputValue('');
        setIsAdding(false);
      }
    },
    [handleAdd],
  );

  const handlePresetClick = useCallback(
    (preset: Preset) => {
      onChange(preset.values);
    },
    [onChange],
  );

  const startAdding = useCallback(() => {
    setIsAdding(true);
    // Focus input on next tick
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-11 font-medium text-fg-secondary">{label}</span>
        {presets && presets.length > 0 && (
          <div className="flex items-center gap-1">
            {presets.map((preset) => {
              const isActive =
                preset.values.length === values.length &&
                preset.values.every((v, i) => sorted[i] === v);
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className={`px-1.5 py-0.5 text-10 rounded transition-colors ${
                    isActive
                      ? 'bg-bg-brand text-fg-onbrand'
                      : 'text-fg-tertiary hover:bg-bg-hover'
                  }`}
                >
                  {preset.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {sorted.map((val) => (
          <button
            key={val}
            type="button"
            onClick={() => handleRemove(val)}
            className="group inline-flex items-center gap-0.5 px-1.5 py-0.5 text-11 bg-bg-secondary text-fg rounded hover:bg-bg-danger hover:text-fg-danger transition-colors"
            title={`Remove ${val}`}
            aria-label={`Remove ${val} from scale`}
          >
            {val}
            <svg
              width="8"
              height="8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        ))}

        {isAdding ? (
          <div className="inline-flex items-center gap-0.5">
            <input
              ref={inputRef}
              type="number"
              min={0}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onBlur={handleAdd}
              className="w-10 px-1 py-0.5 text-11 bg-bg-secondary border border-border rounded focus:outline-none focus:ring-1 focus:ring-bg-brand"
              placeholder="px"
              aria-label={`Add value to ${label}`}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={startAdding}
            className="inline-flex items-center justify-center w-5 h-5 text-fg-tertiary hover:bg-bg-hover rounded transition-colors"
            title="Add value"
            aria-label={`Add value to ${label}`}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

import type { Filters, FilterOptions } from '../types';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface Props {
  open: boolean;
  title: string;
  variant?: 'default' | 'charts';
  options: FilterOptions;
  temp: Filters;
  onToggle: (key: keyof Omit<Filters, 'injuredOnly' | 'killedOnly'>, value: string) => void;
  onCancel: () => void;
  onClear: () => void;
  onApply: () => void;
}

export function FilterPanel({
  open,
  title,
  variant = 'default',
  options,
  temp,
  onToggle,
  onCancel,
  onClear,
  onApply,
}: Props) {
  const ref = useFocusTrap<HTMLDivElement>(open, onCancel);
  if (!open) return null;
  const overlayClass =
    variant === 'default' ? 'filter-overlay filter-overlay--top' : 'filter-overlay';
  const panelClass = variant === 'default' ? 'filter-panel' : 'filter-panel filter-panel--charts';
  const headerClass =
    variant === 'default'
      ? 'filter-panel-header'
      : 'filter-panel-header filter-panel-header--charts';
  const bodyClass =
    variant === 'default' ? 'filter-panel-body' : 'filter-panel-body filter-panel-body--charts';

  return (
    <div className={overlayClass} onClick={onCancel}>
      <div
        ref={ref}
        className={panelClass}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={headerClass}>
          {variant === 'default' ? null : <h3>{title}</h3>}
          <div className="filter-actions filter-actions--top-bar">
            <button type="button" className="control-btn" onClick={onCancel}>
              Cancel
            </button>
            <button type="button" className="control-btn" onClick={onClear}>
              Clear
            </button>
            <button type="button" className="control-btn primary" onClick={onApply}>
              Apply
            </button>
          </div>
          {variant === 'default' ? <h3>{title}</h3> : null}
        </div>
        <div className={bodyClass}>
          <div className="filter-grid">
            <FilterGroup
              label="Boroughs"
              items={options.boroughs}
              selected={temp.boroughs}
              onToggle={(v) => onToggle('boroughs', v)}
            />
            <FilterGroup
              label="Contributing factors"
              items={options.factors.slice(0, 40)}
              selected={temp.factors}
              onToggle={(v) => onToggle('factors', v)}
            />
            <FilterGroup
              label="Vehicle type"
              items={options.vehicleTypes}
              selected={temp.vehicleTypes}
              onToggle={(v) => onToggle('vehicleTypes', v)}
            />
            <FilterGroup
              label="On street"
              items={options.onStreets}
              selected={temp.onStreets}
              onToggle={(v) => onToggle('onStreets', v)}
            />
            <FilterGroup
              label="Years"
              items={options.years}
              selected={temp.years}
              onToggle={(v) => onToggle('years', v)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface GroupProps {
  label: string;
  items: string[];
  selected: string[];
  onToggle: (value: string) => void;
}

function FilterGroup({ label, items, selected, onToggle }: GroupProps) {
  return (
    <div>
      <strong>{label}</strong>
      <div className="filter-list" role="group" aria-label={label}>
        {items.map((item) => (
          <label key={item} className="filter-item">
            <input
              type="checkbox"
              checked={selected.includes(item)}
              onChange={() => onToggle(item)}
            />{' '}
            {item}
          </label>
        ))}
      </div>
    </div>
  );
}

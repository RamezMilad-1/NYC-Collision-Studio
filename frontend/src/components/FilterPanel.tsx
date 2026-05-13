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
  const subtitle =
    variant === 'charts'
      ? 'Choose what flows into the charts above. Combine boroughs, factors, vehicles, streets and years.'
      : 'Narrow the data preview below. Filters apply only to the table.';

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        ref={ref}
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{title}</h3>
            <p className="modal-subtitle">{subtitle}</p>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn--ghost" onClick={onCancel}>
              Cancel
            </button>
            <button type="button" className="btn" onClick={onClear}>
              Clear all
            </button>
            <button type="button" className="btn btn--primary" onClick={onApply}>
              Apply
            </button>
          </div>
        </div>
        <div className="modal-body">
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
    <div className="filter-group">
      <span className="filter-group-label">
        {label}
        {selected.length > 0 ? (
          <span
            style={{
              marginLeft: 8,
              color: 'var(--accent)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            ({selected.length})
          </span>
        ) : null}
      </span>
      <div className="filter-list" role="group" aria-label={label}>
        {items.map((item) => (
          <label key={item} className="filter-item">
            <input
              type="checkbox"
              checked={selected.includes(item)}
              onChange={() => onToggle(item)}
            />
            <span>{item}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

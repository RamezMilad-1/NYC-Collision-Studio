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

type DimKey = keyof Omit<Filters, 'injuredOnly' | 'killedOnly'>;

const DIM_KEYS: DimKey[] = ['boroughs', 'factors', 'vehicleTypes', 'onStreets', 'years'];
const MAX_ACTIVE_DIMS = 2;

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

  const activeDimCount = DIM_KEYS.reduce(
    (n, k) => n + (temp[k].length > 0 ? 1 : 0),
    0,
  );
  const dimsExceeded = activeDimCount > MAX_ACTIVE_DIMS;
  const dimsAtCap = activeDimCount >= MAX_ACTIVE_DIMS;
  const isLocked = (dim: DimKey) => dimsAtCap && temp[dim].length === 0;

  const limitMessage = dimsExceeded
    ? 'You have more than two filter categories active. Clear one before applying — combinations of three or more categories aren’t supported.'
    : dimsAtCap
      ? 'You can combine at most two filter categories at a time. Clear one to enable the others.'
      : null;

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
            <button
              type="button"
              className="btn btn--primary"
              onClick={onApply}
              disabled={dimsExceeded}
              title={dimsExceeded ? limitMessage ?? undefined : undefined}
            >
              Apply
            </button>
          </div>
        </div>
        <div className="modal-body">
          {limitMessage ? (
            <p
              className="modal-subtitle"
              role="status"
              style={{ marginBottom: 12 }}
            >
              {limitMessage}
            </p>
          ) : null}
          <div className="filter-grid">
            <FilterGroup
              label="Boroughs"
              items={options.boroughs}
              selected={temp.boroughs}
              disabled={isLocked('boroughs')}
              onToggle={(v) => onToggle('boroughs', v)}
            />
            <FilterGroup
              label="Contributing factors"
              items={options.factors.slice(0, 40)}
              selected={temp.factors}
              disabled={isLocked('factors')}
              onToggle={(v) => onToggle('factors', v)}
            />
            <FilterGroup
              label="Vehicle type"
              items={options.vehicleTypes}
              selected={temp.vehicleTypes}
              disabled={isLocked('vehicleTypes')}
              onToggle={(v) => onToggle('vehicleTypes', v)}
            />
            <FilterGroup
              label="On street"
              items={options.onStreets}
              selected={temp.onStreets}
              disabled={isLocked('onStreets')}
              onToggle={(v) => onToggle('onStreets', v)}
            />
            <FilterGroup
              label="Years"
              items={options.years}
              selected={temp.years}
              disabled={isLocked('years')}
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
  disabled?: boolean;
  onToggle: (value: string) => void;
}

function FilterGroup({ label, items, selected, disabled = false, onToggle }: GroupProps) {
  const lockedTitle = disabled
    ? 'Clear another filter category to enable this one'
    : undefined;
  return (
    <div
      className="filter-group"
      aria-disabled={disabled || undefined}
      style={disabled ? { opacity: 0.45, pointerEvents: 'none' } : undefined}
      title={lockedTitle}
    >
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
              disabled={disabled}
              onChange={() => {
                if (!disabled) onToggle(item);
              }}
            />
            <span>{item}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

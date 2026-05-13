import type { Filters } from '../types';
import { filtersActive } from '../utils/filterUtils';

interface Props {
  /** Section name shown in the toolbar — e.g. "Overview". */
  label: string;
  filters: Filters;
  onOpenFilter: () => void;
  onToggleInjured: () => void;
  onToggleKilled: () => void;
  onReset: () => void;
}

/**
 * Compact toolbar that scopes filters to a single section of the page.
 * Sits above the KPI tiles (and any other "scoped" surface) so the user
 * can refine that section without affecting the rest of the dashboard.
 */
export function ScopedFilterBar({
  label,
  filters,
  onOpenFilter,
  onToggleInjured,
  onToggleKilled,
  onReset,
}: Props) {
  const active = filtersActive(filters);
  const dimensionCount =
    filters.boroughs.length +
    filters.factors.length +
    filters.vehicleTypes.length +
    filters.onStreets.length +
    filters.years.length +
    (filters.injuredOnly ? 1 : 0) +
    (filters.killedOnly ? 1 : 0);

  // Build a short summary of what's currently active for at-a-glance reading.
  const chips: string[] = [];
  if (filters.boroughs.length) chips.push(filters.boroughs.map(titleCase).join(', '));
  if (filters.years.length) chips.push(filters.years.join(', '));
  if (filters.factors.length) chips.push(...filters.factors.slice(0, 2));
  if (filters.vehicleTypes.length) chips.push(...filters.vehicleTypes.slice(0, 2));
  if (filters.onStreets.length) chips.push(...filters.onStreets.slice(0, 2));
  if (filters.injuredOnly) chips.push('Injuries only');
  if (filters.killedOnly) chips.push('Fatalities only');

  return (
    <div className="scope-bar" role="toolbar" aria-label={`${label} filters`}>
      <div className="scope-bar-label">
        <span className="scope-bar-eyebrow">{label}</span>
        {active ? (
          <span className="scope-bar-state scope-bar-state--filtered">
            Filtered · {dimensionCount} active
          </span>
        ) : (
          <span className="scope-bar-state">Showing full NYC dataset</span>
        )}
      </div>

      <div className="scope-bar-actions">
        {active ? (
          <div className="scope-bar-chips" aria-hidden="true">
            {chips.slice(0, 3).map((c, i) => (
              <span className="scope-bar-chip" key={i} title={c}>
                {truncate(c, 22)}
              </span>
            ))}
            {chips.length > 3 ? (
              <span className="scope-bar-chip scope-bar-chip--more">+{chips.length - 3}</span>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          className={`btn btn--sm ${active ? 'btn--active' : ''}`}
          onClick={onOpenFilter}
          aria-haspopup="dialog"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 5h16M7 12h10m-7 7h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Filter
          {dimensionCount > 0 ? (
            <span className="scope-count-pill" aria-label={`${dimensionCount} active`}>
              {dimensionCount}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          className={`btn btn--sm ${filters.injuredOnly ? 'btn--active' : ''}`}
          aria-pressed={filters.injuredOnly}
          onClick={onToggleInjured}
        >
          Injuries only
        </button>

        <button
          type="button"
          className={`btn btn--sm ${filters.killedOnly ? 'btn--active' : ''}`}
          aria-pressed={filters.killedOnly}
          onClick={onToggleKilled}
        >
          Fatalities only
        </button>

        {active ? (
          <button type="button" className="btn btn--sm btn--ghost" onClick={onReset}>
            Reset
          </button>
        ) : null}
      </div>
    </div>
  );
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

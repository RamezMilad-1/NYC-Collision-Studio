import type { Filters } from '../types';
import { filtersActive } from '../utils/filterUtils';

interface Props {
  graphFilters: Filters;
  onOpenGraphFilter: () => void;
  onToggleGraphInjured: () => void;
  onToggleGraphKilled: () => void;
  onGenerateFullReport: () => void;
  generatingFullReport: boolean;
}

export function ControlsCard({
  graphFilters,
  onOpenGraphFilter,
  onToggleGraphInjured,
  onToggleGraphKilled,
  onGenerateFullReport,
  generatingFullReport,
}: Props) {
  const active = filtersActive(graphFilters);
  const activeCount =
    graphFilters.boroughs.length +
    graphFilters.factors.length +
    graphFilters.vehicleTypes.length +
    graphFilters.onStreets.length +
    graphFilters.years.length +
    (graphFilters.injuredOnly ? 1 : 0) +
    (graphFilters.killedOnly ? 1 : 0);

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <span className="toolbar-label">View</span>
        <button
          type="button"
          className={`btn ${active ? 'btn--active' : ''}`}
          onClick={onOpenGraphFilter}
          aria-haspopup="dialog"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 5h16M7 12h10m-7 7h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Filters
          {activeCount > 0 ? (
            <span
              style={{
                background: 'var(--accent)',
                color: '#1a0606',
                fontWeight: 700,
                fontSize: 10.5,
                padding: '1px 6px',
                borderRadius: 999,
                marginLeft: 2,
                lineHeight: 1.4,
              }}
            >
              {activeCount}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          className={`btn ${graphFilters.injuredOnly ? 'btn--active' : ''}`}
          aria-pressed={graphFilters.injuredOnly}
          onClick={onToggleGraphInjured}
        >
          Injuries only
        </button>
        <button
          type="button"
          className={`btn ${graphFilters.killedOnly ? 'btn--active' : ''}`}
          aria-pressed={graphFilters.killedOnly}
          onClick={onToggleGraphKilled}
        >
          Fatalities only
        </button>
      </div>

      <div className="toolbar-group">
        <button
          type="button"
          className="btn btn--primary"
          onClick={onGenerateFullReport}
          disabled={generatingFullReport}
          aria-busy={generatingFullReport}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M14 3v6h6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M9 14h6M9 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {generatingFullReport ? 'Generating…' : 'Full dataset report'}
        </button>
      </div>
    </div>
  );
}

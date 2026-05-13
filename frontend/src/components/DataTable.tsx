import { useMemo } from 'react';
import type { CollisionRow, Filters } from '../types';
import { TableSkeleton } from './Skeleton';

interface Props {
  rows: CollisionRow[];
  loading: boolean;
  appliedFilters: Filters;
  onOpenFilter: () => void;
  searchMode: boolean;
  onToggleSearch: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  offset: number;
  pageSize: number;
  onPrev: () => void;
  onNext: () => void;
}

const PREFERRED_COLS = [
  'CRASH_ID',
  'CRASH_DATETIME',
  'BOROUGH',
  'ON_STREET_NAME',
  'OFF_STREET_NAME',
  'NUMBER OF PERSONS INJURED',
  'NUMBER OF PERSONS KILLED',
  'PERSON_TYPE',
  'CONTRIBUTING FACTOR VEHICLE 1',
];

function deriveColumns(rows: CollisionRow[]): string[] {
  const cols = new Set<string>();
  for (const row of rows.slice(0, 300)) {
    if (!row || typeof row !== 'object') continue;
    for (const k of Object.keys(row)) cols.add(k);
  }
  const rest = Array.from(cols)
    .filter((c) => !PREFERRED_COLS.includes(c))
    .sort();
  return [...PREFERRED_COLS.filter((c) => cols.has(c)), ...rest];
}

function cellText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function humanizeColumn(c: string): string {
  return c
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\bId\b/, 'ID');
}

export function DataTable({
  rows,
  loading,
  appliedFilters,
  onOpenFilter,
  searchMode,
  onToggleSearch,
  searchQuery,
  onSearchChange,
  offset,
  pageSize,
  onPrev,
  onNext,
}: Props) {
  const columns = useMemo(() => deriveColumns(rows), [rows]);
  const filtersOn =
    appliedFilters.boroughs.length > 0 ||
    appliedFilters.factors.length > 0 ||
    appliedFilters.vehicleTypes.length > 0 ||
    appliedFilters.onStreets.length > 0 ||
    appliedFilters.years.length > 0 ||
    appliedFilters.injuredOnly ||
    appliedFilters.killedOnly;

  const start = rows.length === 0 ? 0 : offset + 1;
  const end = Math.min(offset + pageSize, rows.length);

  return (
    <section className="table-card">
      <div className="table-header">
        <div>
          <h3 className="table-title">
            Crash records
            <span className="table-title-sub">
              {rows.length.toLocaleString()} match{rows.length === 1 ? '' : 'es'}
            </span>
          </h3>
        </div>
        <div className="table-tools" role="toolbar" aria-label="Data table controls">
          <button
            type="button"
            className={`btn ${filtersOn ? 'btn--active' : ''}`}
            onClick={onOpenFilter}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 5h16M7 12h10m-7 7h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Filter
          </button>
          <button
            type="button"
            className={`btn ${searchMode ? 'btn--active' : ''}`}
            aria-pressed={searchMode}
            onClick={onToggleSearch}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
              <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Search
          </button>
          {searchMode && (
            <input
              className="search-input"
              aria-label="Search rows"
              placeholder="Search rows — e.g. brooklyn 2022 pedestrian"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              autoFocus
            />
          )}
        </div>
      </div>

      <div className="table-scroll">
        {loading ? (
          <TableSkeleton rows={pageSize} cols={Math.max(columns.length || 8, 8)} />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col} scope="col">
                    {humanizeColumn(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(offset, offset + pageSize).map((r, i) => (
                <tr key={(r?.CRASH_ID as string | number | undefined) ?? offset + i}>
                  {columns.map((col) => (
                    <td key={col}>{cellText(r?.[col])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="table-footer">
        <div className="table-foot-note">
          Showing <strong style={{ color: 'var(--text-1)' }}>{start.toLocaleString()}</strong>–
          <strong style={{ color: 'var(--text-1)' }}>{end.toLocaleString()}</strong> of{' '}
          <strong style={{ color: 'var(--text-1)' }}>{rows.length.toLocaleString()}</strong>
        </div>
        <div className="pager">
          <button
            type="button"
            className="pager-btn"
            onClick={onPrev}
            disabled={offset === 0}
            title="Previous page"
            aria-label="Previous page"
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            className="pager-btn"
            onClick={onNext}
            disabled={offset + pageSize >= rows.length}
            title="Next page"
            aria-label="Next page"
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

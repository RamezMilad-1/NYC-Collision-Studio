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
  const filtersBadge =
    appliedFilters.boroughs.length || appliedFilters.factors.length ? 'control-btn active' : 'control-btn';

  return (
    <section className="panel table-panel">
      <div className="table-container">
        <div className="table-wrap">
          <h3 className="panel-title">Data preview (first rows)</h3>
          <div className="table-controls" role="toolbar" aria-label="Data table controls">
            <button type="button" className={filtersBadge} onClick={onOpenFilter}>
              Filter
            </button>
            <button
              type="button"
              className={searchMode ? 'control-btn active' : 'control-btn'}
              aria-pressed={searchMode}
              onClick={onToggleSearch}
            >
              Search
            </button>
            {searchMode && (
              <input
                className="search-input"
                aria-label="Search rows"
                placeholder="Search rows (use commas to search multiple terms, e.g. bronx, sedan)…"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            )}
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
                        {col}
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
          <div className="table-note">
            Showing up to {pageSize} rows from the loaded dataset. ({rows.length} rows match filters)
          </div>
        </div>
      </div>

      <div className="table-pager" aria-label="Table pager">
        <button
          type="button"
          className="pager-btn"
          onClick={onPrev}
          disabled={offset === 0}
          title="Previous rows"
          aria-label="Previous page"
        >
          ▲
        </button>
        <button
          type="button"
          className="pager-btn"
          onClick={onNext}
          disabled={offset + pageSize >= rows.length}
          title="Next rows"
          aria-label="Next page"
        >
          ▼
        </button>
      </div>
    </section>
  );
}

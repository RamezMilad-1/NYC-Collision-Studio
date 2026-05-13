import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';

import type {
  DatasetIndex,
  DatasetMetadata,
  Filters,
  FilterOptions,
  FullDataReport,
  Summary,
} from './types';

import { useTheme } from './hooks/useTheme';
import { useFilters } from './hooks/useFilters';
import { useCollisionData } from './hooks/useCollisionData';
import { usePagination } from './hooks/usePagination';
import { readFiltersFromUrl, useSyncFiltersToUrl } from './hooks/useUrlFilters';

import { addSummary, aggregateRows, EMPTY_SUMMARY, scaleSummary } from './utils/aggregations';
import { applyFilters, filtersActive } from './utils/filterUtils';

import { TopBar } from './components/TopBar';
import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { InsightStrip } from './components/InsightStrip';
import { ControlsCard } from './components/ControlsCard';
import { BoroughChart } from './components/BoroughChart';
import { HourlyChart } from './components/HourlyChart';
import { TopFactors } from './components/TopFactors';
import { YearlyTrend } from './components/YearlyTrend';
import { VictimsBreakdown } from './components/VictimsBreakdown';
import { DataTable } from './components/DataTable';
import { Footer } from './components/Footer';
import { DevicePopup } from './components/DevicePopup';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ChartSkeleton } from './components/Skeleton';

const FullDataReportModal = lazy(() =>
  import('./components/FullDataReportModal').then((m) => ({ default: m.FullDataReportModal })),
);
const FilterPanel = lazy(() =>
  import('./components/FilterPanel').then((m) => ({ default: m.FilterPanel })),
);

const PAGE_SIZE = 8;

const EMPTY_OPTIONS: FilterOptions = {
  boroughs: [],
  factors: [],
  vehicleTypes: [],
  onStreets: [],
  years: [],
};

type IndexedDim = 'boroughs' | 'years' | 'factors' | 'vehicleTypes';

function singleValueIndex(idx: DatasetIndex, dim: IndexedDim, v: string): Summary | null {
  if (dim === 'boroughs') return idx.byBorough[v] ?? null;
  if (dim === 'years') return idx.byYear[v] ?? null;
  if (dim === 'factors') return idx.byFactor[v] ?? null;
  return idx.byVehicleType[v] ?? null;
}

function joinIndex(
  idx: DatasetIndex,
  dimA: IndexedDim,
  a: string,
  dimB: IndexedDim,
  b: string,
): Summary | null {
  // Normalize so the dim with the join comes first in our switch.
  const pair = [dimA, dimB].sort().join('|');
  if (pair === 'boroughs|years') {
    const [bv, yv] = dimA === 'boroughs' ? [a, b] : [b, a];
    return idx.joins.boroughYear[bv]?.[yv] ?? null;
  }
  if (pair === 'boroughs|factors') {
    const [bv, fv] = dimA === 'boroughs' ? [a, b] : [b, a];
    return idx.joins.boroughFactor[bv]?.[fv] ?? null;
  }
  if (pair === 'factors|years') {
    const [yv, fv] = dimA === 'years' ? [a, b] : [b, a];
    return idx.joins.yearFactor[yv]?.[fv] ?? null;
  }
  if (pair === 'boroughs|vehicleTypes') {
    const [bv, vv] = dimA === 'boroughs' ? [a, b] : [b, a];
    return idx.joins.boroughVehicle[bv]?.[vv] ?? null;
  }
  if (pair === 'vehicleTypes|years') {
    const [yv, vv] = dimA === 'years' ? [a, b] : [b, a];
    return idx.joins.yearVehicle[yv]?.[vv] ?? null;
  }
  return null;
}

/**
 * Resolve a Summary from the pre-computed dataset index for the given
 * filter shape. Returns an EXACT full-dataset summary whenever possible:
 *
 *   - 0 active dims                       → idx.all
 *   - 1 dim, any number of values         → Σ byDim[v] over the values
 *   - 2 dims, any number of values        → Σ joins.<pair>[a][b] over the
 *                                            cartesian product of selections
 *   - has onStreets / injuredOnly /        → null (no index covers this;
 *     killedOnly / 3+ active dims          caller falls back to scaled sample)
 */
function lookupIndexed(idx: DatasetIndex | null, f: Filters): Summary | null {
  if (!idx) return null;
  if (f.injuredOnly || f.killedOnly) return null;
  if (f.onStreets.length > 0) return null;

  const dims: { dim: IndexedDim; values: string[] }[] = [];
  if (f.boroughs.length) dims.push({ dim: 'boroughs', values: f.boroughs });
  if (f.years.length) dims.push({ dim: 'years', values: f.years });
  if (f.factors.length) dims.push({ dim: 'factors', values: f.factors });
  if (f.vehicleTypes.length) dims.push({ dim: 'vehicleTypes', values: f.vehicleTypes });

  if (dims.length === 0) return idx.all;

  if (dims.length === 1) {
    const { dim, values } = dims[0];
    const parts: Summary[] = [];
    for (const v of values) {
      const s = singleValueIndex(idx, dim, v);
      if (!s) return null;
      parts.push(s);
    }
    return parts.reduce(addSummary);
  }

  if (dims.length === 2) {
    const [A, B] = dims;
    const parts: Summary[] = [];
    for (const a of A.values) {
      for (const b of B.values) {
        const s = joinIndex(idx, A.dim, a, B.dim, b);
        if (!s) return null;
        parts.push(s);
      }
    }
    return parts.reduce(addSummary);
  }

  return null;
}

export default function App() {
  const { mode: themeMode, toggle: toggleTheme } = useTheme();
  const { fullSummary, datasetIndex, sampleMetadata, rows, status, error, fullReady, rowsReady } =
    useCollisionData();

  // Two independent filter scopes (charts and table). The Overview KPIs
  // always reflect the full NYC dataset and are not filterable.
  const initialGraph = useMemo(() => readFiltersFromUrl('g_'), []);
  const initialTable = useMemo(() => readFiltersFromUrl('t_'), []);

  const graphFilters = useFilters(initialGraph);
  const tableFilters = useFilters(initialTable);

  useSyncFiltersToUrl(graphFilters.applied, 'g_');
  useSyncFiltersToUrl(tableFilters.applied, 't_');

  const [graphFilterOpen, setGraphFilterOpen] = useState(false);
  const [tableFilterOpen, setTableFilterOpen] = useState(false);

  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pager = usePagination(PAGE_SIZE);

  const [fullDataReport, setFullDataReport] = useState<FullDataReport | null>(null);
  const [fullDataReportOpen, setFullDataReportOpen] = useState(false);
  const [isGeneratingFullReport, setIsGeneratingFullReport] = useState(false);
  const [popupStep, setPopupStep] = useState(0);

  const options: FilterOptions = sampleMetadata?.options ?? EMPTY_OPTIONS;
  const baselineSummary: Summary = fullSummary ?? EMPTY_SUMMARY;

  // ───────────────────────────────────────────────────────────
  // Per-scope filtered row sets and summaries
  // ───────────────────────────────────────────────────────────

  const graphFilteredRows = useMemo(
    () => (filtersActive(graphFilters.applied) ? applyFilters(rows, graphFilters.applied) : rows),
    [rows, graphFilters.applied],
  );

  const filteredTableRows = useMemo(() => {
    const base = filtersActive(tableFilters.applied)
      ? applyFilters(rows, tableFilters.applied)
      : rows;
    const q = searchQuery.trim();
    if (!q) return base;
    const terms = q
      .split(/[, ]+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    if (terms.length === 0) return base;
    return base.filter((row) => {
      let hay = '';
      for (const k in row) {
        const v = (row as Record<string, unknown>)[k];
        if (v == null) continue;
        hay += (typeof v === 'object' ? JSON.stringify(v) : String(v)).toLowerCase() + ' ';
      }
      return terms.every((t) => hay.includes(t));
    });
  }, [rows, tableFilters.applied, searchQuery]);

  /**
   * Scaling factor that maps sample-derived counts up to full-dataset
   * magnitudes. The loaded preview is a uniform-ish subset of all NYC
   * crashes, so the ratio (full ÷ sample) lets us extrapolate filtered
   * sample aggregates into honest estimates for the whole dataset.
   * 0 / null until both numbers are known; falsy values disable scaling.
   */
  const sampleScale =
    fullSummary && rows.length > 0 ? fullSummary.totalCollisions / rows.length : 0;

  /**
   * Resolve the right Summary for a filter scope:
   *   1. No filters → baseline (full NYC, exact)
   *   2. Try the pre-computed index — supports multi-value 1- or 2-dim
   *      filters by summing across cells. Exact when it hits.
   *   3. Otherwise aggregate the loaded sample and SCALE the result up
   *      to full-dataset magnitudes. Approximate but in the right
   *      order of magnitude (was previously raw sample counts, which
   *      under-reported by ~1000× — that's the inaccuracy fix).
   */
  const summaryFor = (
    f: Filters,
    sampleRows: import('./types').CollisionRow[],
  ): Summary => {
    if (!filtersActive(f)) return baselineSummary;
    const indexed = lookupIndexed(datasetIndex, f);
    if (indexed) return indexed;
    const raw = aggregateRows(sampleRows);
    return sampleScale > 0 ? scaleSummary(raw, sampleScale) : raw;
  };

  const graphSummary: Summary = useMemo(
    () => summaryFor(graphFilters.applied, graphFilteredRows),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graphFilters.applied, graphFilteredRows, datasetIndex, baselineSummary],
  );

  const tableSummary: Summary = useMemo(() => {
    if (!filtersActive(tableFilters.applied) && !searchQuery) return baselineSummary;
    if (!searchQuery) {
      const indexed = lookupIndexed(datasetIndex, tableFilters.applied);
      if (indexed) return indexed;
    }
    return aggregateRows(filteredTableRows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTableRows, tableFilters.applied, searchQuery, datasetIndex, baselineSummary]);

  const graphShowingFullData = !filtersActive(graphFilters.applied);

  // ───────────────────────────────────────────────────────────
  // Hero meta strip — always derived from the full NYC baseline
  // ───────────────────────────────────────────────────────────

  const topBorough = useMemo(
    () =>
      baselineSummary.boroughs.reduce<{ name: string; value: number } | null>(
        (best, b) => (!best || b.value > best.value ? b : best),
        null,
      ),
    [baselineSummary.boroughs],
  );

  const peakHour = useMemo(() => {
    const peak = baselineSummary.collisionsByHourData.reduce<{ hour: string; collisions: number } | null>(
      (best, d) => (!best || d.collisions > best.collisions ? d : best),
      null,
    );
    return peak ? peak.hour : null;
  }, [baselineSummary.collisionsByHourData]);

  const yearsCovered = useMemo(() => {
    const years = baselineSummary.crashesByYearData ?? [];
    if (years.length > 0) {
      const min = Math.min(...years.map((y) => y.year));
      const max = Math.max(...years.map((y) => y.year));
      return `${min}–${max}`;
    }
    if (options.years.length > 0) {
      const sorted = [...options.years].sort((a, b) => Number(a) - Number(b));
      return `${sorted[0]}–${sorted[sorted.length - 1]}`;
    }
    return '2012–present';
  }, [baselineSummary.crashesByYearData, options.years]);

  // ───────────────────────────────────────────────────────────
  // Mobile popup
  // ───────────────────────────────────────────────────────────

  useEffect(() => {
    const hasSeenPopup = localStorage.getItem('devicePopupShown');
    if (hasSeenPopup) return;
    if (window.innerWidth < 768) setPopupStep(1);
  }, []);

  const dismissDevicePopup = useCallback(() => {
    setPopupStep((s) => {
      if (s === 1) return 2;
      localStorage.setItem('devicePopupShown', 'true');
      return 0;
    });
  }, []);

  // ───────────────────────────────────────────────────────────
  // Filter modal openers / actions
  // ───────────────────────────────────────────────────────────

  const openGraphFilter = () => {
    graphFilters.openInit();
    setGraphFilterOpen(true);
  };
  const openTableFilter = () => {
    tableFilters.openInit();
    setTableFilterOpen(true);
  };

  const onApplyGraphFilters = () => {
    graphFilters.apply();
    setGraphFilterOpen(false);
  };
  const onClearGraphFilters = () => {
    graphFilters.clear();
    setGraphFilterOpen(false);
  };
  const onApplyTableFilters = () => {
    tableFilters.apply();
    pager.reset();
    setTableFilterOpen(false);
  };
  const onClearTableFilters = () => {
    tableFilters.clear();
    pager.reset();
    setTableFilterOpen(false);
  };

  const toggleGraphInjured = () => {
    const next: Filters = {
      ...graphFilters.applied,
      injuredOnly: !graphFilters.applied.injuredOnly,
      killedOnly: graphFilters.applied.injuredOnly ? false : graphFilters.applied.killedOnly,
    };
    graphFilters.setApplied(next);
  };
  const toggleGraphKilled = () => {
    const next: Filters = {
      ...graphFilters.applied,
      killedOnly: !graphFilters.applied.killedOnly,
      injuredOnly: graphFilters.applied.killedOnly ? false : graphFilters.applied.injuredOnly,
    };
    graphFilters.setApplied(next);
  };

  const onTableSearchChange = (q: string) => {
    setSearchQuery(q);
    pager.reset();
  };

  // ───────────────────────────────────────────────────────────
  // Full-dataset PDF report
  // ───────────────────────────────────────────────────────────

  const handleGenerateFullDataReport = async () => {
    if (fullDataReport) {
      setFullDataReportOpen(true);
      return;
    }
    setIsGeneratingFullReport(true);
    try {
      const response = await fetch('/data/dataset_metadata.json');
      if (!response.ok) throw new Error('Failed to load metadata');
      const m = (await response.json()) as DatasetMetadata;

      const report: FullDataReport = {
        totalCollisions: m.total_collisions,
        totalInjured: m.total_injured,
        totalKilled: m.total_killed,
        boroughs: Object.entries(m.boroughs).map(([name, value]) => ({ name, value })),
        collisionsByHourData: Object.entries(m.crashes_by_hour).map(([hour, collisions]) => ({
          hour: `${hour}:00`,
          collisions,
        })),
        injuryFatalityData: [
          { type: 'Pedestrians Injured', count: m.injuries_by_type.pedestrians_injured, category: 'Injuries' },
          { type: 'Cyclists Injured', count: m.injuries_by_type.cyclists_injured, category: 'Injuries' },
          { type: 'Motorists Injured', count: m.injuries_by_type.motorists_injured, category: 'Injuries' },
          { type: 'Pedestrians Killed', count: m.fatalities_by_type.pedestrians_killed, category: 'Fatalities' },
          { type: 'Cyclists Killed', count: m.fatalities_by_type.cyclists_killed, category: 'Fatalities' },
          { type: 'Motorists Killed', count: m.fatalities_by_type.motorists_killed, category: 'Fatalities' },
        ],
        topFactors: Object.entries(m.top_contributing_factors).map(([factor, count]) => ({ factor, count })),
        crashesByYearData: Object.entries(m.crashes_by_year).map(([year, crashes]) => ({
          year: parseInt(year, 10),
          crashes,
        })),
        isFullData: true,
      };
      setFullDataReport(report);
      setFullDataReportOpen(true);
    } catch (e) {
      console.error('Error generating full data report:', e);
      alert('Error loading complete dataset metadata.');
    } finally {
      setIsGeneratingFullReport(false);
    }
  };

  const metaLoading = !fullReady && status !== 'error';
  const rowsLoading = !rowsReady && status !== 'error' && status !== 'ready';

  return (
    <div className="app">
      <TopBar
        onOpenReport={handleGenerateFullDataReport}
        loading={isGeneratingFullReport || metaLoading}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
      />

      {error ? (
        <div role="alert" className="error-banner shell">
          Couldn't load data: {error.message}
        </div>
      ) : null}

      <Header
        summary={baselineSummary}
        loading={metaLoading}
        yearsCovered={yearsCovered}
        topBorough={topBorough ? topBorough.name : null}
        peakHour={peakHour}
        showingFullData={true}
      />

      <main className="shell">
        <ErrorBoundary>
          <StatsOverview summary={baselineSummary} loading={metaLoading} />
        </ErrorBoundary>

        <ErrorBoundary>
          <InsightStrip summary={baselineSummary} />
        </ErrorBoundary>

        <div className="section-head">
          <div className="section-head-text">
            <h2>The shape of NYC crashes</h2>
            <p>
              {graphShowingFullData
                ? 'Charts below reflect every recorded NYC crash from 2012 to present. Apply chart filters to drill in.'
                : 'Filtered view — charts reflect the records matching the chart filters below.'}
            </p>
          </div>
          <div className="section-head-rule" />
        </div>

        <ErrorBoundary>
          <ControlsCard
            graphFilters={graphFilters.applied}
            onOpenGraphFilter={openGraphFilter}
            onToggleGraphInjured={toggleGraphInjured}
            onToggleGraphKilled={toggleGraphKilled}
            onGenerateFullReport={handleGenerateFullDataReport}
            generatingFullReport={isGeneratingFullReport}
          />

          {metaLoading ? (
            <div className="charts-grid">
              <div className="col-12">
                <div className="card">
                  <ChartSkeleton height={240} />
                </div>
              </div>
              <div className="col-4">
                <div className="card">
                  <ChartSkeleton height={220} />
                </div>
              </div>
              <div className="col-4">
                <div className="card">
                  <ChartSkeleton height={220} />
                </div>
              </div>
              <div className="col-4">
                <div className="card">
                  <ChartSkeleton height={220} />
                </div>
              </div>
            </div>
          ) : (
            <div className="charts-grid">
              <div className="col-12">
                <YearlyTrend
                  data={graphSummary.crashesByYearData ?? []}
                  isFullData={graphShowingFullData}
                />
              </div>
              <div className="col-4">
                <BoroughChart data={graphSummary.boroughs} />
              </div>
              <div className="col-4">
                <HourlyChart data={graphSummary.collisionsByHourData} />
              </div>
              <div className="col-4">
                <TopFactors factors={graphSummary.topFactors} />
              </div>
              <div className="col-12">
                <VictimsBreakdown
                  injured={graphSummary.injured}
                  killed={graphSummary.killed}
                  isFullData={graphShowingFullData}
                />
              </div>
            </div>
          )}
        </ErrorBoundary>

        <div className="section-head">
          <div className="section-head-text">
            <h2>Record-level explorer</h2>
            <p>
              Filter, search and paginate through individual crash records from the loaded preview
              ({rows.length.toLocaleString()} sample records). The full {fullSummary?.totalCollisions
                ? fullSummary.totalCollisions.toLocaleString()
                : '4.8M+'}
              -record dataset is summarized above.
            </p>
          </div>
          <div className="section-head-rule" />
        </div>

        <ErrorBoundary>
          <DataTable
            rows={filteredTableRows}
            loading={rowsLoading}
            appliedFilters={tableFilters.applied}
            onOpenFilter={openTableFilter}
            searchMode={searchMode}
            onToggleSearch={() => {
              setSearchMode((v) => !v);
              if (searchMode) setSearchQuery('');
            }}
            searchQuery={searchQuery}
            onSearchChange={onTableSearchChange}
            offset={pager.offset}
            pageSize={pager.pageSize}
            onPrev={pager.prev}
            onNext={() => pager.next(filteredTableRows.length)}
          />
          <p className="scope-summary-line">
            Showing <strong>{tableSummary.totalCollisions.toLocaleString()}</strong> matching
            collisions in this view.
          </p>
        </ErrorBoundary>
      </main>

      <Footer />

      <Suspense fallback={null}>
        <FilterPanel
          open={graphFilterOpen}
          title="Filter the charts"
          variant="charts"
          options={options}
          temp={graphFilters.temp}
          onToggle={graphFilters.toggleTemp}
          onCancel={() => setGraphFilterOpen(false)}
          onClear={onClearGraphFilters}
          onApply={onApplyGraphFilters}
        />
        <FilterPanel
          open={tableFilterOpen}
          title="Filter the records"
          variant="default"
          options={options}
          temp={tableFilters.temp}
          onToggle={tableFilters.toggleTemp}
          onCancel={() => setTableFilterOpen(false)}
          onClear={onClearTableFilters}
          onApply={onApplyTableFilters}
        />
        {fullDataReportOpen && fullDataReport && (
          <FullDataReportModal
            open={fullDataReportOpen}
            report={fullDataReport}
            onClose={() => setFullDataReportOpen(false)}
          />
        )}
      </Suspense>

      <DevicePopup step={popupStep} onDismiss={dismissDevicePopup} />
    </div>
  );
}

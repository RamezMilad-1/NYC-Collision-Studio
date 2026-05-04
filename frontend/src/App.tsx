import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';

import type {
  CollisionRow,
  DatasetMetadata,
  Filters,
  FilterOptions,
  FullDataReport,
  Summary,
} from './types';

import { useViewportWidth } from './hooks/useViewportWidth';
import { useFilters } from './hooks/useFilters';
import { useCollisionData } from './hooks/useCollisionData';
import { usePagination } from './hooks/usePagination';
import { readFiltersFromUrl, useSyncFiltersToUrl } from './hooks/useUrlFilters';

import { aggregateRows, EMPTY_SUMMARY } from './utils/aggregations';
import { applyFilters, filtersActive } from './utils/filterUtils';

import { Header } from './components/Header';
import { ControlsCard } from './components/ControlsCard';
import { BoroughChart } from './components/BoroughChart';
import { HourlyChart } from './components/HourlyChart';
import { TopFactors } from './components/TopFactors';
import { DataTable } from './components/DataTable';
import { Footer } from './components/Footer';
import { DevicePopup } from './components/DevicePopup';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ChartSkeleton } from './components/Skeleton';

// Modals are rarely opened — code-split them so they aren't in the initial bundle.
const SampleReportModal = lazy(() =>
  import('./components/SampleReportModal').then((m) => ({ default: m.SampleReportModal })),
);
const FullDataReportModal = lazy(() =>
  import('./components/FullDataReportModal').then((m) => ({ default: m.FullDataReportModal })),
);
const FilterPanel = lazy(() =>
  import('./components/FilterPanel').then((m) => ({ default: m.FilterPanel })),
);

const PAGE_SIZE = 6;

function deriveOptions(rows: CollisionRow[]): FilterOptions {
  const boroughSet = new Set<string>();
  const factorSet = new Set<string>();
  const vehicleCount = new Map<string, number>();
  const streetCount = new Map<string, number>();
  const yearSet = new Set<string>();

  for (const r of rows) {
    boroughSet.add(((r?.BOROUGH as string) ?? 'Unknown') || 'Unknown');
    const factor = ((r?.['CONTRIBUTING FACTOR VEHICLE 1'] as string) ?? 'Unknown') || 'Unknown';
    if (factor && factor !== '1' && factor !== '80') factorSet.add(factor);

    const vt =
      (r?.['VEHICLE TYPE CODE 1'] as string) ??
      (r?.['VEHICLE TYPE CODE'] as string) ??
      (r?.['VEHICLE TYPE'] as string) ??
      null;
    if (vt) {
      const str = String(vt).trim();
      const upper = str.toUpperCase();
      if (str && upper !== 'UNKNOWN' && upper !== 'N/A' && upper !== '-') {
        vehicleCount.set(str, (vehicleCount.get(str) ?? 0) + 1);
      }
    }

    const sname = (r?.ON_STREET_NAME as string) ?? (r?.['ON STREET NAME'] as string) ?? '';
    if (sname) {
      const str = String(sname).trim();
      const upper = str.toUpperCase();
      if (str && upper !== 'UNKNOWN' && upper !== 'N/A' && upper !== '-') {
        streetCount.set(str, (streetCount.get(str) ?? 0) + 1);
      }
    }

    const dt = r?.CRASH_DATETIME as string | undefined;
    if (dt) {
      const y = String(dt).split(' ')[0]?.split('-')[0];
      if (y) yearSet.add(y);
    }
  }

  return {
    boroughs: Array.from(boroughSet).filter(Boolean).sort(),
    factors: Array.from(factorSet).sort(),
    vehicleTypes: Array.from(vehicleCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([t]) => t),
    onStreets: Array.from(streetCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .map(([s]) => s),
    years: Array.from(yearSet).sort((a, b) => Number(b) - Number(a)),
  };
}

export default function App() {
  const viewportWidth = useViewportWidth();
  const { metadata, rows, status, error, metaReady, rowsReady } = useCollisionData();

  // initial filters can be hydrated from URL
  const initialTable = useMemo(() => readFiltersFromUrl('t_'), []);
  const initialGraph = useMemo(() => readFiltersFromUrl('g_'), []);

  const tableFilters = useFilters(initialTable);
  const graphFilters = useFilters(initialGraph);

  useSyncFiltersToUrl(tableFilters.applied, 't_');
  useSyncFiltersToUrl(graphFilters.applied, 'g_');

  const [filterOpen, setFilterOpen] = useState(false);
  const [graphFilterOpen, setGraphFilterOpen] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pager = usePagination(PAGE_SIZE);

  const [reportOpen, setReportOpen] = useState(false);
  const [fullDataReport, setFullDataReport] = useState<FullDataReport | null>(null);
  const [fullDataReportOpen, setFullDataReportOpen] = useState(false);
  const [isGeneratingFullReport, setIsGeneratingFullReport] = useState(false);
  const [popupStep, setPopupStep] = useState(0);

  // Filter options come from metadata if present, otherwise from rows.
  const options = useMemo<FilterOptions>(() => {
    if (metadata) return metadata.options;
    if (rows.length === 0) {
      return { boroughs: [], factors: [], vehicleTypes: [], onStreets: [], years: [] };
    }
    return deriveOptions(rows);
  }, [metadata, rows]);

  const filteredGraphData = useMemo(
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
        hay +=
          (typeof v === 'object' ? JSON.stringify(v) : String(v)).toLowerCase() + ' ';
      }
      return terms.every((t) => hay.includes(t));
    });
  }, [rows, tableFilters.applied, searchQuery]);

  const baselineSummary: Summary = useMemo(() => {
    if (metadata) return metadata;
    if (!rowsReady) return EMPTY_SUMMARY;
    return aggregateRows(rows);
  }, [metadata, rowsReady, rows]);

  const filteredGraphSummary: Summary = useMemo(
    () =>
      filtersActive(graphFilters.applied) ? aggregateRows(filteredGraphData) : baselineSummary,
    [filteredGraphData, graphFilters.applied, baselineSummary],
  );

  const tableFilteredSummary: Summary = useMemo(
    () =>
      filtersActive(tableFilters.applied) || searchQuery
        ? aggregateRows(filteredTableRows)
        : baselineSummary,
    [filteredTableRows, tableFilters.applied, searchQuery, baselineSummary],
  );

  const displaySummary: Summary = useMemo(() => {
    if (filtersActive(tableFilters.applied) || searchQuery) return tableFilteredSummary;
    if (filtersActive(graphFilters.applied)) return filteredGraphSummary;
    return baselineSummary;
  }, [
    tableFilters.applied,
    graphFilters.applied,
    searchQuery,
    tableFilteredSummary,
    filteredGraphSummary,
    baselineSummary,
  ]);

  // valid coords count for sample report
  const validLocationCount = useMemo(() => {
    let n = 0;
    for (const item of filteredTableRows) {
      const lat = Number(item?.LATITUDE ?? 0);
      const lon = Number(item?.LONGITUDE ?? 0);
      if (
        lat !== 0 &&
        lon !== 0 &&
        !Number.isNaN(lat) &&
        !Number.isNaN(lon) &&
        lat > 40 &&
        lat < 41 &&
        lon < -73 &&
        lon > -75
      )
        n++;
    }
    return n;
  }, [filteredTableRows]);

  // Device popup on first visit (mobile only)
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

  const openTableFilter = () => {
    tableFilters.openInit();
    setFilterOpen(true);
  };
  const openGraphFilter = () => {
    graphFilters.openInit();
    setGraphFilterOpen(true);
  };

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

  const onTableSearchChange = (q: string) => {
    setSearchQuery(q);
    pager.reset();
  };

  const onApplyTableFilters = () => {
    tableFilters.apply();
    pager.reset();
    setFilterOpen(false);
  };
  const onClearTableFilters = () => {
    tableFilters.clear();
    pager.reset();
    setFilterOpen(false);
  };
  const onApplyGraphFilters = () => {
    graphFilters.apply();
    setGraphFilterOpen(false);
  };
  const onClearGraphFilters = () => {
    graphFilters.clear();
    setGraphFilterOpen(false);
  };

  // Toggle quick filters from controls card; reuse the EMPTY_FILTERS shape if needed
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

  const metaLoading = !metaReady && status !== 'error';
  const rowsLoading = !rowsReady && status !== 'error';

  return (
    <div className="app">
      {error ? (
        <div role="alert" className="error-banner" style={{ padding: 12, color: '#fff', background: '#7a1a1a' }}>
          Could not load data: {error.message}
        </div>
      ) : null}

      <Header summary={displaySummary} loading={metaLoading} />

      <main className="content">
        <ErrorBoundary>
          <section
            className="panel charts compact"
            style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}
          >
            <ControlsCard
              graphFilters={graphFilters.applied}
              onOpenGraphFilter={openGraphFilter}
              onToggleGraphInjured={toggleGraphInjured}
              onToggleGraphKilled={toggleGraphKilled}
              onGenerateFullReport={handleGenerateFullDataReport}
              generatingFullReport={isGeneratingFullReport}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', width: '100%' }}>
              {metaLoading && filteredGraphSummary.boroughs.length === 0 ? (
                <>
                  <div className="panel-card chart-small">
                    <h4 className="panel-title">Borough Distribution crashes</h4>
                    <ChartSkeleton height={218} />
                  </div>
                  <div className="panel-card chart-small">
                    <h4 className="panel-title">Collisions by Hour</h4>
                    <ChartSkeleton height={200} />
                  </div>
                  <div className="panel-card top-factors-card">
                    <h4 className="panel-title">Top Contributing Factors</h4>
                    <ChartSkeleton height={180} />
                  </div>
                </>
              ) : (
                <>
                  <BoroughChart data={filteredGraphSummary.boroughs} viewportWidth={viewportWidth} />
                  <HourlyChart data={filteredGraphSummary.collisionsByHourData} />
                  <TopFactors factors={filteredGraphSummary.topFactors} />
                </>
              )}
            </div>
          </section>
        </ErrorBoundary>

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
        </ErrorBoundary>
      </main>

      <Footer />

      <Suspense fallback={null}>
        <FilterPanel
          open={filterOpen}
          title="Filter data"
          variant="default"
          options={options}
          temp={tableFilters.temp}
          onToggle={tableFilters.toggleTemp}
          onCancel={() => setFilterOpen(false)}
          onClear={onClearTableFilters}
          onApply={onApplyTableFilters}
        />
        <FilterPanel
          open={graphFilterOpen}
          title="Filter Charts"
          variant="charts"
          options={options}
          temp={graphFilters.temp}
          onToggle={graphFilters.toggleTemp}
          onCancel={() => setGraphFilterOpen(false)}
          onClear={onClearGraphFilters}
          onApply={onApplyGraphFilters}
        />
        {reportOpen && (
          <SampleReportModal
            open={reportOpen}
            onClose={() => setReportOpen(false)}
            summary={displaySummary}
            validLocationCount={validLocationCount}
          />
        )}
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

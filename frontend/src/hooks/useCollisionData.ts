import { useEffect, useMemo, useState } from 'react';
import type {
  CollisionRow,
  DatasetIndex,
  DatasetMetadata,
  SampleMetadata,
  Summary,
} from '../types';
import { summarizeDatasetMetadata } from '../utils/aggregations';

type Status = 'idle' | 'loading-meta' | 'loading-rows' | 'ready' | 'error';

export interface UseCollisionDataResult {
  /** Full-NYC dataset summary (4.8M crashes) — drives KPIs and charts by default. */
  fullSummary: Summary | null;
  /** Per-filter-value pre-aggregated summaries (scaled to full-NYC magnitudes). */
  datasetIndex: DatasetIndex | null;
  /** Filter options derived from the sample (richer than the full metadata). */
  sampleMetadata: SampleMetadata | null;
  /** Raw row preview for the data table (~5k diverse records). */
  rows: CollisionRow[];
  /** True once full-dataset metadata is available — main view can render. */
  fullReady: boolean;
  /** True once row preview is loaded — data table can render. */
  rowsReady: boolean;
  status: Status;
  error: Error | null;
}

const RECORDS_FILE = '/data/df_records_preview.jsonl';

function parseJsonl(text: string): CollisionRow[] {
  const out: CollisionRow[] = [];
  for (const line of text.split('\n')) {
    if (!line) continue;
    try {
      out.push(JSON.parse(line) as CollisionRow);
    } catch {
      // skip malformed
    }
  }
  return out;
}

/**
 * Data loader for NYC Collision Studio.
 *
 * Loads three compact JSON files eagerly (full-dataset metadata + sample
 * filter options + per-filter index) so the main view renders instantly with
 * REAL full-dataset numbers — and so single-filter views can swap in the
 * pre-computed scaled summary without re-aggregating row data. The row
 * preview JSONL is fetched lazily on idle and only feeds the record-level
 * data table.
 */
export function useCollisionData(): UseCollisionDataResult {
  const [datasetMetadata, setDatasetMetadata] = useState<DatasetMetadata | null>(null);
  const [sampleMetadata, setSampleMetadata] = useState<SampleMetadata | null>(null);
  const [datasetIndex, setDatasetIndex] = useState<DatasetIndex | null>(null);
  const [rows, setRows] = useState<CollisionRow[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [shouldLoadRows, setShouldLoadRows] = useState(false);

  // Phase 1: load all three metadata files in parallel (compact JSON).
  useEffect(() => {
    let cancelled = false;
    setStatus('loading-meta');
    Promise.all([
      fetch('/data/dataset_metadata.json').then((r) => {
        if (!r.ok) throw new Error(`dataset_metadata: HTTP ${r.status}`);
        return r.json() as Promise<DatasetMetadata>;
      }),
      fetch('/data/sample_metadata.json').then((r) => {
        if (!r.ok) throw new Error(`sample_metadata: HTTP ${r.status}`);
        return r.json() as Promise<SampleMetadata>;
      }),
      fetch('/data/dataset_index.json')
        .then((r) => {
          if (!r.ok) throw new Error(`dataset_index: HTTP ${r.status}`);
          return r.json() as Promise<DatasetIndex>;
        })
        // The index is non-critical — main view still works without it.
        .catch((e) => {
          console.warn('dataset_index unavailable; filtered views will fall back to sample', e);
          return null;
        }),
    ])
      .then(([ds, sm, idx]) => {
        if (cancelled) return;
        setDatasetMetadata(ds);
        setSampleMetadata(sm);
        setDatasetIndex(idx);
        const w = window as unknown as {
          requestIdleCallback?: (cb: () => void) => number;
        };
        if (w.requestIdleCallback) {
          w.requestIdleCallback(() => setShouldLoadRows(true));
        } else {
          setTimeout(() => setShouldLoadRows(true), 200);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e as Error);
        setShouldLoadRows(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Phase 2: load row preview for the data table.
  useEffect(() => {
    if (!shouldLoadRows) return;
    let cancelled = false;
    setStatus((s) => (s === 'error' ? s : 'loading-rows'));

    fetch(RECORDS_FILE)
      .then((r) => {
        if (!r.ok) throw new Error(`${RECORDS_FILE}: HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (cancelled) return;
        setRows(parseJsonl(text));
        setStatus('ready');
      })
      .catch((e) => {
        if (cancelled) return;
        console.error('Records preview load failed', e);
        setRows([]);
        setStatus('ready');
      });

    return () => {
      cancelled = true;
    };
  }, [shouldLoadRows]);

  const fullSummary = useMemo<Summary | null>(
    () => (datasetMetadata ? summarizeDatasetMetadata(datasetMetadata) : null),
    [datasetMetadata],
  );

  return {
    fullSummary,
    datasetIndex,
    sampleMetadata,
    rows,
    fullReady: fullSummary != null,
    rowsReady: rows.length > 0,
    status,
    error,
  };
}

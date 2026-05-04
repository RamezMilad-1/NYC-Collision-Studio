import { useEffect, useState } from 'react';
import type { CollisionRow, SampleMetadata } from '../types';

type Status = 'idle' | 'loading-meta' | 'loading-rows' | 'ready' | 'error';

export interface UseCollisionDataResult {
  metadata: SampleMetadata | null;
  rows: CollisionRow[];
  status: Status;
  error: Error | null;
  metaReady: boolean;
  rowsReady: boolean;
  loadRowsNow: () => void;
}

const SAMPLE_FILES = [
  '/data/df_clean_integrated_sample_part1.jsonl',
  '/data/df_clean_integrated_sample_part2.jsonl',
];

function parseJsonl(text: string): CollisionRow[] {
  const out: CollisionRow[] = [];
  for (const line of text.split('\n')) {
    if (!line) continue;
    try {
      out.push(JSON.parse(line) as CollisionRow);
    } catch {
      // ignore malformed
    }
  }
  return out;
}

/**
 * Loads pre-aggregated metadata immediately for fast first paint, then
 * lazily fetches the JSONL row data in the background (or on demand) so
 * the table view can show full rows. This avoids parsing ~140k rows
 * before the dashboard renders.
 */
export function useCollisionData(): UseCollisionDataResult {
  const [metadata, setMetadata] = useState<SampleMetadata | null>(null);
  const [rows, setRows] = useState<CollisionRow[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [shouldLoadRows, setShouldLoadRows] = useState(false);

  // Phase 1: load lightweight metadata
  useEffect(() => {
    let cancelled = false;
    setStatus('loading-meta');
    fetch('/data/sample_metadata.json')
      .then((r) => {
        if (!r.ok) throw new Error(`metadata: HTTP ${r.status}`);
        return r.json() as Promise<SampleMetadata>;
      })
      .then((meta) => {
        if (cancelled) return;
        setMetadata(meta);
        // schedule row load shortly after first paint
        if (typeof window !== 'undefined') {
          const w = window as unknown as {
            requestIdleCallback?: (cb: () => void) => number;
          };
          if (w.requestIdleCallback) {
            w.requestIdleCallback(() => setShouldLoadRows(true));
          } else {
            setTimeout(() => setShouldLoadRows(true), 200);
          }
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e as Error);
        // even if metadata is missing, fall back to loading rows directly
        setShouldLoadRows(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Phase 2: load JSONL row data once requested
  useEffect(() => {
    if (!shouldLoadRows) return;
    let cancelled = false;
    setStatus((s) => (s === 'error' ? s : 'loading-rows'));

    Promise.all(
      SAMPLE_FILES.map(async (f) => {
        const r = await fetch(f);
        if (!r.ok) throw new Error(`${f}: HTTP ${r.status}`);
        return r.text();
      }),
    )
      .then((texts) => {
        if (cancelled) return;
        const parsed = texts.flatMap(parseJsonl);
        setRows(parsed);
        setStatus('ready');
      })
      .catch((e) => {
        if (cancelled) return;
        console.error('Load error', e);
        setError(e as Error);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [shouldLoadRows]);

  return {
    metadata,
    rows,
    status,
    error,
    metaReady: metadata != null,
    rowsReady: rows.length > 0,
    loadRowsNow: () => setShouldLoadRows(true),
  };
}

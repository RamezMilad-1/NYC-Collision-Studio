import { useEffect, useRef } from 'react';
import type { Filters } from '../types';
import { EMPTY_FILTERS } from '../types';

const KEYS: Array<keyof Filters> = [
  'boroughs',
  'factors',
  'vehicleTypes',
  'onStreets',
  'years',
  'injuredOnly',
  'killedOnly',
];

export function readFiltersFromUrl(prefix = ''): Filters {
  if (typeof window === 'undefined') return EMPTY_FILTERS;
  const sp = new URLSearchParams(window.location.search);
  const f: Filters = { ...EMPTY_FILTERS };
  for (const k of KEYS) {
    const param = `${prefix}${k}`;
    const v = sp.get(param);
    if (v == null) continue;
    if (k === 'injuredOnly' || k === 'killedOnly') {
      f[k] = v === '1' || v === 'true';
    } else {
      f[k] = v
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
    }
  }
  return f;
}

function writeFiltersToParams(sp: URLSearchParams, f: Filters, prefix: string) {
  for (const k of KEYS) {
    const param = `${prefix}${k}`;
    if (k === 'injuredOnly' || k === 'killedOnly') {
      if (f[k]) sp.set(param, '1');
      else sp.delete(param);
    } else {
      const list = f[k];
      if (list.length) sp.set(param, list.join(','));
      else sp.delete(param);
    }
  }
}

/**
 * Two-way sync filters with the URL query string. Each filter set gets a
 * prefix (e.g. "t" for table, "g" for graph) so both can coexist.
 * Updates use replaceState to avoid polluting the back button stack.
 */
export function useSyncFiltersToUrl(filters: Filters, prefix: string): void {
  const first = useRef(true);
  useEffect(() => {
    // skip the very first effect to let initial state hydrate from URL first
    if (first.current) {
      first.current = false;
      return;
    }
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    writeFiltersToParams(sp, filters, prefix);
    const qs = sp.toString();
    const newUrl = `${window.location.pathname}${qs ? '?' + qs : ''}${window.location.hash}`;
    window.history.replaceState(null, '', newUrl);
  }, [filters, prefix]);
}

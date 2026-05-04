import { useCallback, useState } from 'react';
import type { Filters } from '../types';
import { EMPTY_FILTERS } from '../types';

type Key = keyof Omit<Filters, 'injuredOnly' | 'killedOnly'>;

export interface UseFiltersResult {
  applied: Filters;
  temp: Filters;
  setApplied: (f: Filters) => void;
  setTemp: (f: Filters) => void;
  toggleTemp: (key: Key, value: string) => void;
  setTempInjuredOnly: (v: boolean) => void;
  setTempKilledOnly: (v: boolean) => void;
  toggleAppliedInjuredOnly: () => void;
  toggleAppliedKilledOnly: () => void;
  apply: () => void;
  clear: () => void;
  openInit: () => void;
}

export function useFilters(initial: Filters = EMPTY_FILTERS): UseFiltersResult {
  const [applied, setApplied] = useState<Filters>(initial);
  const [temp, setTemp] = useState<Filters>(initial);

  const toggleTemp = useCallback((key: Key, value: string) => {
    setTemp((t) => {
      const set = new Set(t[key]);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      return { ...t, [key]: Array.from(set) };
    });
  }, []);

  const setTempInjuredOnly = useCallback(
    (v: boolean) => setTemp((t) => ({ ...t, injuredOnly: v })),
    [],
  );
  const setTempKilledOnly = useCallback(
    (v: boolean) => setTemp((t) => ({ ...t, killedOnly: v })),
    [],
  );

  // injured/killed are mutually exclusive on applied side
  const toggleAppliedInjuredOnly = useCallback(() => {
    setApplied((p) => ({
      ...p,
      injuredOnly: !p.injuredOnly,
      killedOnly: p.injuredOnly ? false : p.killedOnly,
    }));
  }, []);
  const toggleAppliedKilledOnly = useCallback(() => {
    setApplied((p) => ({
      ...p,
      killedOnly: !p.killedOnly,
      injuredOnly: p.killedOnly ? false : p.injuredOnly,
    }));
  }, []);

  const apply = useCallback(() => {
    setApplied(temp);
  }, [temp]);

  const clear = useCallback(() => {
    setTemp(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
  }, []);

  // initialize temp from applied (call when opening filter panel)
  const openInit = useCallback(() => {
    setTemp({
      boroughs: [...applied.boroughs],
      factors: [...applied.factors],
      vehicleTypes: [...applied.vehicleTypes],
      onStreets: [...applied.onStreets],
      years: [...applied.years],
      injuredOnly: applied.injuredOnly,
      killedOnly: applied.killedOnly,
    });
  }, [applied]);

  return {
    applied,
    temp,
    setApplied,
    setTemp,
    toggleTemp,
    setTempInjuredOnly,
    setTempKilledOnly,
    toggleAppliedInjuredOnly,
    toggleAppliedKilledOnly,
    apply,
    clear,
    openInit,
  };
}

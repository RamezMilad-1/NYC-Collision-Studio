import type { CollisionRow, DatasetMetadata, NameValue, Summary } from '../types';
import { rowInjuredCount, rowKilledCount } from './filterUtils';

function mergeNameValue(...lists: NameValue[][]): NameValue[] {
  const map = new Map<string, number>();
  for (const list of lists) {
    for (const it of list) map.set(it.name, (map.get(it.name) ?? 0) + it.value);
  }
  return Array.from(map, ([name, value]) => ({ name, value }));
}

/**
 * Sum two pre-computed Summaries. Used to combine multiple precomputed
 * index cells (one per filter value) into a single accurate summary —
 * e.g. boroughs=["BROOKLYN","QUEENS"] becomes byBorough.BROOKLYN +
 * byBorough.QUEENS. The result is exact (no sample estimation involved)
 * because each input summary already reflects its slice of the full
 * dataset.
 */
export function addSummary(a: Summary, b: Summary): Summary {
  const topFactors = mergeNameValue(a.topFactors, b.topFactors)
    .sort((x, y) => y.value - x.value)
    .slice(0, 6);

  const hourMap = new Map<string, number>();
  for (const h of a.collisionsByHourData) hourMap.set(h.hour, h.collisions);
  for (const h of b.collisionsByHourData) {
    hourMap.set(h.hour, (hourMap.get(h.hour) ?? 0) + h.collisions);
  }
  const collisionsByHourData = Array.from(hourMap, ([hour, collisions]) => ({
    hour,
    collisions,
  })).sort((x, y) => parseInt(x.hour, 10) - parseInt(y.hour, 10));

  const yearMap = new Map<number, number>();
  for (const y of a.crashesByYearData ?? []) yearMap.set(y.year, y.crashes);
  for (const y of b.crashesByYearData ?? []) {
    yearMap.set(y.year, (yearMap.get(y.year) ?? 0) + y.crashes);
  }
  const crashesByYearData = Array.from(yearMap, ([year, crashes]) => ({ year, crashes })).sort(
    (x, y) => x.year - y.year,
  );

  const ai = a.injured ?? { pedestrians: 0, cyclists: 0, motorists: 0 };
  const bi = b.injured ?? { pedestrians: 0, cyclists: 0, motorists: 0 };
  const ak = a.killed ?? { pedestrians: 0, cyclists: 0, motorists: 0 };
  const bk = b.killed ?? { pedestrians: 0, cyclists: 0, motorists: 0 };

  return {
    totalCollisions: a.totalCollisions + b.totalCollisions,
    totalInjured: a.totalInjured + b.totalInjured,
    totalKilled: a.totalKilled + b.totalKilled,
    boroughs: mergeNameValue(a.boroughs, b.boroughs).sort((x, y) => y.value - x.value),
    personTypeBreakdown: mergeNameValue(a.personTypeBreakdown, b.personTypeBreakdown),
    topFactors,
    collisionsByHourData,
    crashesByYearData,
    injured: {
      pedestrians: ai.pedestrians + bi.pedestrians,
      cyclists: ai.cyclists + bi.cyclists,
      motorists: ai.motorists + bi.motorists,
    },
    killed: {
      pedestrians: ak.pedestrians + bk.pedestrians,
      cyclists: ak.cyclists + bk.cyclists,
      motorists: ak.motorists + bk.motorists,
    },
  };
}

/**
 * Scale every numeric count in a Summary by `factor`. Used to extrapolate
 * a sample-derived Summary up to full-dataset magnitudes when no
 * precomputed index entry exists for the active filter combination
 * (e.g. 3+ active dimensions, an on-street filter, or injuredOnly /
 * killedOnly). Assumes the sample is a representative subset.
 */
export function scaleSummary(s: Summary, factor: number): Summary {
  if (!Number.isFinite(factor) || factor <= 0) return s;
  const scaleN = (n: number) => Math.round(n * factor);
  return {
    totalCollisions: scaleN(s.totalCollisions),
    totalInjured: scaleN(s.totalInjured),
    totalKilled: scaleN(s.totalKilled),
    boroughs: s.boroughs.map((b) => ({ name: b.name, value: scaleN(b.value) })),
    personTypeBreakdown: s.personTypeBreakdown.map((p) => ({
      name: p.name,
      value: scaleN(p.value),
    })),
    topFactors: s.topFactors.map((f) => ({ name: f.name, value: scaleN(f.value) })),
    collisionsByHourData: s.collisionsByHourData.map((h) => ({
      hour: h.hour,
      collisions: scaleN(h.collisions),
    })),
    crashesByYearData: s.crashesByYearData?.map((y) => ({
      year: y.year,
      crashes: scaleN(y.crashes),
    })),
    injured: s.injured
      ? {
          pedestrians: scaleN(s.injured.pedestrians),
          cyclists: scaleN(s.injured.cyclists),
          motorists: scaleN(s.injured.motorists),
        }
      : undefined,
    killed: s.killed
      ? {
          pedestrians: scaleN(s.killed.pedestrians),
          cyclists: scaleN(s.killed.cyclists),
          motorists: scaleN(s.killed.motorists),
        }
      : undefined,
  };
}

export function aggregateRows(rows: CollisionRow[]): Summary {
  let totalInjured = 0;
  let totalKilled = 0;
  const boroughCount: Record<string, number> = {};
  const personTypeCount: Record<string, number> = {};
  const factorCount: Record<string, number> = {};
  const collisionsByHour = Array<number>(24).fill(0);
  const collisionsByYear: Record<number, number> = {};

  let pedI = 0, cycI = 0, motI = 0, pedK = 0, cycK = 0, motK = 0;

  for (const item of rows) {
    totalInjured += rowInjuredCount(item);
    totalKilled += rowKilledCount(item);

    pedI += Number(item?.['NUMBER OF PEDESTRIANS INJURED'] ?? 0) || 0;
    cycI += Number(item?.['NUMBER OF CYCLIST INJURED'] ?? 0) || 0;
    motI += Number(item?.['NUMBER OF MOTORIST INJURED'] ?? 0) || 0;
    pedK += Number(item?.['NUMBER OF PEDESTRIANS KILLED'] ?? 0) || 0;
    cycK += Number(item?.['NUMBER OF CYCLIST KILLED'] ?? 0) || 0;
    motK += Number(item?.['NUMBER OF MOTORIST KILLED'] ?? 0) || 0;

    const borough = (item.BOROUGH as string) || 'Unknown';
    boroughCount[borough] = (boroughCount[borough] || 0) + 1;

    const personType = (item.PERSON_TYPE as string) || 'Unknown';
    personTypeCount[personType] = (personTypeCount[personType] || 0) + 1;

    const factor = (item['CONTRIBUTING FACTOR VEHICLE 1'] as string) || 'Unknown';
    factorCount[factor] = (factorCount[factor] || 0) + 1;

    const datetimeStr = item.CRASH_DATETIME as string | undefined;
    if (datetimeStr) {
      const hh = datetimeStr.split(' ')[1]?.split(':')[0];
      const hour = hh ? parseInt(hh, 10) : NaN;
      if (!Number.isNaN(hour) && hour >= 0 && hour <= 23) collisionsByHour[hour]++;
      const yy = datetimeStr.split(' ')[0]?.split('-')[0];
      const year = yy ? parseInt(yy, 10) : NaN;
      if (!Number.isNaN(year)) {
        collisionsByYear[year] = (collisionsByYear[year] || 0) + 1;
      }
    }
  }

  const boroughs = Object.entries(boroughCount).map(([name, value]) => ({ name, value }));
  const personTypeBreakdown = Object.entries(personTypeCount).map(([name, value]) => ({
    name,
    value,
  }));
  const topFactors = Object.entries(factorCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  const collisionsByHourData = collisionsByHour.map((count, hour) => ({
    hour: `${hour}:00`,
    collisions: count,
  }));

  const crashesByYearData = Object.entries(collisionsByYear)
    .map(([y, crashes]) => ({ year: Number(y), crashes }))
    .sort((a, b) => a.year - b.year);

  return {
    totalCollisions: rows.length,
    totalInjured,
    totalKilled,
    boroughs,
    personTypeBreakdown,
    topFactors,
    collisionsByHourData,
    crashesByYearData,
    injured: { pedestrians: pedI, cyclists: cycI, motorists: motI },
    killed: { pedestrians: pedK, cyclists: cycK, motorists: motK },
  };
}

/**
 * Convert the full-dataset metadata JSON into a Summary so the dashboard
 * can render the entire NYC collision history without loading row data.
 */
export function summarizeDatasetMetadata(m: DatasetMetadata): Summary {
  const boroughs = Object.entries(m.boroughs)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const topFactors = Object.entries(m.top_contributing_factors)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const collisionsByHourData = Object.entries(m.crashes_by_hour)
    .map(([h, c]) => ({ hour: `${h}:00`, collisions: c, _h: Number(h) }))
    .sort((a, b) => a._h - b._h)
    .map(({ hour, collisions }) => ({ hour, collisions }));

  const crashesByYearData = Object.entries(m.crashes_by_year)
    .map(([y, crashes]) => ({ year: Number(y), crashes }))
    .filter((p) => Number.isFinite(p.year))
    .sort((a, b) => a.year - b.year);

  return {
    totalCollisions: m.total_collisions,
    totalInjured: m.total_injured,
    totalKilled: m.total_killed,
    boroughs,
    personTypeBreakdown: [],
    topFactors,
    collisionsByHourData,
    crashesByYearData,
    injured: {
      pedestrians: m.injuries_by_type.pedestrians_injured,
      cyclists: m.injuries_by_type.cyclists_injured,
      motorists: m.injuries_by_type.motorists_injured,
    },
    killed: {
      pedestrians: m.fatalities_by_type.pedestrians_killed,
      cyclists: m.fatalities_by_type.cyclists_killed,
      motorists: m.fatalities_by_type.motorists_killed,
    },
  };
}

export const EMPTY_SUMMARY: Summary = {
  totalCollisions: 0,
  totalInjured: 0,
  totalKilled: 0,
  boroughs: [],
  personTypeBreakdown: [],
  topFactors: [],
  collisionsByHourData: [],
  crashesByYearData: [],
};

import type { CollisionRow, Summary } from '../types';
import { rowInjuredCount, rowKilledCount } from './filterUtils';

export function aggregateRows(rows: CollisionRow[]): Summary {
  let totalInjured = 0;
  let totalKilled = 0;
  const boroughCount: Record<string, number> = {};
  const personTypeCount: Record<string, number> = {};
  const factorCount: Record<string, number> = {};
  const collisionsByHour = Array<number>(24).fill(0);

  for (const item of rows) {
    totalInjured += rowInjuredCount(item);
    totalKilled += rowKilledCount(item);

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

  return {
    totalCollisions: rows.length,
    totalInjured,
    totalKilled,
    boroughs,
    personTypeBreakdown,
    topFactors,
    collisionsByHourData,
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
};

// Pre-compute aggregations from the JSONL sample files at build time so the
// browser doesn't have to recalculate them on every load. Outputs
// public/data/sample_metadata.json which is small enough to load eagerly while
// the larger JSONL files can be lazy-loaded for the data table.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'public', 'data');

const SAMPLE_FILES = [
  'df_clean_integrated_sample_part1.jsonl',
  'df_clean_integrated_sample_part2.jsonl',
];

const num = (v) => Number(v ?? 0) || 0;

function aggregate(rows) {
  let totalInjured = 0;
  let totalKilled = 0;
  const boroughCount = {};
  const personTypeCount = {};
  const factorCount = {};
  const vehicleCount = new Map();
  const onStreetCount = new Map();
  const yearSet = new Set();
  const collisionsByHour = Array(24).fill(0);

  for (const item of rows) {
    const injured =
      num(item['NUMBER OF PEDESTRIANS INJURED']) +
      num(item['NUMBER OF CYCLIST INJURED']) +
      num(item['NUMBER OF MOTORIST INJURED']);
    const killed =
      num(item['NUMBER OF PEDESTRIANS KILLED']) +
      num(item['NUMBER OF CYCLIST KILLED']) +
      num(item['NUMBER OF MOTORIST KILLED']);
    totalInjured += injured;
    totalKilled += killed;

    const borough = item.BOROUGH || 'Unknown';
    boroughCount[borough] = (boroughCount[borough] || 0) + 1;

    const personType = item.PERSON_TYPE || 'Unknown';
    personTypeCount[personType] = (personTypeCount[personType] || 0) + 1;

    const factor = item['CONTRIBUTING FACTOR VEHICLE 1'] || 'Unknown';
    factorCount[factor] = (factorCount[factor] || 0) + 1;

    const vt = item['VEHICLE TYPE CODE 1'] || item['VEHICLE TYPE'] || null;
    if (vt) {
      const str = String(vt).trim();
      const upper = str.toUpperCase();
      if (str && upper !== 'UNKNOWN' && upper !== 'N/A' && upper !== '-') {
        vehicleCount.set(str, (vehicleCount.get(str) || 0) + 1);
      }
    }

    const sname = item.ON_STREET_NAME || item['ON STREET NAME'] || '';
    if (sname) {
      const str = String(sname).trim();
      const upper = str.toUpperCase();
      if (str && upper !== 'UNKNOWN' && upper !== 'N/A' && upper !== '-') {
        onStreetCount.set(str, (onStreetCount.get(str) || 0) + 1);
      }
    }

    const dt = item.CRASH_DATETIME;
    if (dt) {
      const year = String(dt).split(' ')[0]?.split('-')[0];
      if (year) yearSet.add(year);
      const hour = parseInt(String(dt).split(' ')[1]?.split(':')[0] ?? '', 10);
      if (!Number.isNaN(hour) && hour >= 0 && hour <= 23) collisionsByHour[hour]++;
    }
  }

  const boroughs = Object.entries(boroughCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

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

  const vehicleTypes = Array.from(vehicleCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([type]) => type);

  const onStreets = Array.from(onStreetCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([street]) => street);

  return {
    totalCollisions: rows.length,
    totalInjured,
    totalKilled,
    boroughs,
    personTypeBreakdown,
    topFactors,
    collisionsByHourData,
    options: {
      boroughs: Object.keys(boroughCount).sort(),
      factors: Object.keys(factorCount)
        .filter((f) => f && f !== '1' && f !== '80')
        .sort(),
      vehicleTypes,
      onStreets,
      years: Array.from(yearSet).sort((a, b) => Number(b) - Number(a)),
    },
  };
}

function loadJsonl(path) {
  if (!existsSync(path)) return [];
  const text = readFileSync(path, 'utf8');
  const out = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try {
      out.push(JSON.parse(t));
    } catch {
      // ignore malformed line
    }
  }
  return out;
}

function main() {
  const all = [];
  for (const f of SAMPLE_FILES) {
    const path = join(dataDir, f);
    const rows = loadJsonl(path);
    console.log(`  ${f}: ${rows.length.toLocaleString()} rows`);
    all.push(...rows);
  }
  if (all.length === 0) {
    console.error('No sample rows found; aborting.');
    process.exit(1);
  }
  const result = aggregate(all);
  const outPath = join(dataDir, 'sample_metadata.json');
  writeFileSync(outPath, JSON.stringify(result));
  console.log(
    `Wrote ${outPath} (${all.length.toLocaleString()} rows aggregated).`,
  );
}

main();

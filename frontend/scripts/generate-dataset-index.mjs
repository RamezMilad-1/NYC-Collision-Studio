/**
 * Generate `public/data/dataset_index.json` — a per-filter-value summary index.
 *
 * Reads (does not modify) the user's existing analyzed outputs:
 *   - public/data/dataset_metadata.json (full-NYC totals from the user's pipeline)
 *   - public/data/df_clean_integrated_sample_part{1,2,3}.jsonl (the integrated sample)
 *
 * For each filter dimension (borough, year, contributing factor, vehicle type),
 * builds a Summary from the sample subset that matches that value, then SCALES it
 * up to the known full-NYC total for that bucket so the headline numbers in the
 * filtered view reflect real magnitudes (not just the loaded preview).
 *
 * Output is one JSON file the dashboard loads eagerly. Estimated size ~200KB.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'public', 'data');

const SAMPLE_FILES = [
  'df_clean_integrated_sample_part1.jsonl',
  'df_clean_integrated_sample_part2.jsonl',
  'df_clean_integrated_sample_part3.jsonl',
];

const num = (v) => Number(v ?? 0) || 0;

// --------------------------------------------------------------------------
// Aggregation (mirrors utils/aggregations.ts:aggregateRows so types line up)
// --------------------------------------------------------------------------

function aggregate(rows) {
  let totalInjured = 0;
  let totalKilled = 0;
  let pedI = 0, cycI = 0, motI = 0, pedK = 0, cycK = 0, motK = 0;
  const boroughCount = {};
  const personTypeCount = {};
  const factorCount = {};
  const collisionsByHour = Array(24).fill(0);
  const collisionsByYear = {};

  for (const r of rows) {
    const _pedI = num(r['NUMBER OF PEDESTRIANS INJURED']);
    const _cycI = num(r['NUMBER OF CYCLIST INJURED']);
    const _motI = num(r['NUMBER OF MOTORIST INJURED']);
    const _pedK = num(r['NUMBER OF PEDESTRIANS KILLED']);
    const _cycK = num(r['NUMBER OF CYCLIST KILLED']);
    const _motK = num(r['NUMBER OF MOTORIST KILLED']);

    pedI += _pedI; cycI += _cycI; motI += _motI;
    pedK += _pedK; cycK += _cycK; motK += _motK;
    totalInjured += _pedI + _cycI + _motI;
    totalKilled += _pedK + _cycK + _motK;

    const borough = r.BOROUGH || 'Unknown';
    boroughCount[borough] = (boroughCount[borough] || 0) + 1;

    const personType = r.PERSON_TYPE || 'Unknown';
    personTypeCount[personType] = (personTypeCount[personType] || 0) + 1;

    const factor = r['CONTRIBUTING FACTOR VEHICLE 1'] || 'Unknown';
    factorCount[factor] = (factorCount[factor] || 0) + 1;

    const dt = r.CRASH_DATETIME;
    if (dt) {
      const parts = String(dt).split(' ');
      const datePart = parts[0] || '';
      const timePart = parts[1] || '';
      const yy = datePart.split('-')[0];
      const year = yy ? parseInt(yy, 10) : NaN;
      if (Number.isFinite(year)) collisionsByYear[year] = (collisionsByYear[year] || 0) + 1;
      const hh = timePart.split(':')[0];
      const hour = hh ? parseInt(hh, 10) : NaN;
      if (Number.isFinite(hour) && hour >= 0 && hour <= 23) collisionsByHour[hour]++;
    }
  }

  return {
    totalCollisions: rows.length,
    totalInjured,
    totalKilled,
    boroughs: Object.entries(boroughCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    personTypeBreakdown: Object.entries(personTypeCount).map(([name, value]) => ({ name, value })),
    topFactors: Object.entries(factorCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value })),
    collisionsByHourData: collisionsByHour.map((c, h) => ({ hour: `${h}:00`, collisions: c })),
    crashesByYearData: Object.entries(collisionsByYear)
      .map(([y, c]) => ({ year: Number(y), crashes: c }))
      .sort((a, b) => a.year - b.year),
    injured: { pedestrians: pedI, cyclists: cycI, motorists: motI },
    killed: { pedestrians: pedK, cyclists: cycK, motorists: motK },
  };
}

/**
 * Multiply every numeric leaf of a Summary by `scale`, then pin `totalCollisions`
 * to the known full total (if provided) so percentages round to expectation.
 */
function scaleSummary(s, scale, fullTotal) {
  if (!Number.isFinite(scale) || scale === 0) return s;
  const round = Math.round;
  return {
    totalCollisions: fullTotal ?? round(s.totalCollisions * scale),
    totalInjured: round(s.totalInjured * scale),
    totalKilled: round(s.totalKilled * scale),
    boroughs: s.boroughs.map((b) => ({ ...b, value: round(b.value * scale) })),
    personTypeBreakdown: s.personTypeBreakdown.map((p) => ({ ...p, value: round(p.value * scale) })),
    topFactors: s.topFactors.map((f) => ({ ...f, value: round(f.value * scale) })),
    collisionsByHourData: s.collisionsByHourData.map((h) => ({
      ...h,
      collisions: round(h.collisions * scale),
    })),
    crashesByYearData: s.crashesByYearData.map((y) => ({ ...y, crashes: round(y.crashes * scale) })),
    injured: {
      pedestrians: round(s.injured.pedestrians * scale),
      cyclists: round(s.injured.cyclists * scale),
      motorists: round(s.injured.motorists * scale),
    },
    killed: {
      pedestrians: round(s.killed.pedestrians * scale),
      cyclists: round(s.killed.cyclists * scale),
      motorists: round(s.killed.motorists * scale),
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
      // skip malformed
    }
  }
  return out;
}

// --------------------------------------------------------------------------
// Build per-dimension index
// --------------------------------------------------------------------------

function buildIndex(rows, meta) {
  const totalSample = rows.length;
  const totalFull = meta.total_collisions;
  const overallScale = totalSample > 0 ? totalFull / totalSample : 1;

  // 1. "all" — straight from the user's full-NYC metadata
  const fullInjuredTotal =
    meta.injuries_by_type.pedestrians_injured +
    meta.injuries_by_type.cyclists_injured +
    meta.injuries_by_type.motorists_injured;
  const fullKilledTotal =
    meta.fatalities_by_type.pedestrians_killed +
    meta.fatalities_by_type.cyclists_killed +
    meta.fatalities_by_type.motorists_killed;

  const all = {
    totalCollisions: meta.total_collisions,
    totalInjured: fullInjuredTotal,
    totalKilled: fullKilledTotal,
    boroughs: Object.entries(meta.boroughs)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    personTypeBreakdown: [],
    topFactors: Object.entries(meta.top_contributing_factors)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6),
    collisionsByHourData: Object.entries(meta.crashes_by_hour)
      .map(([h, c]) => ({ hour: `${h}:00`, collisions: c, _h: Number(h) }))
      .sort((a, b) => a._h - b._h)
      .map(({ hour, collisions }) => ({ hour, collisions })),
    crashesByYearData: Object.entries(meta.crashes_by_year)
      .map(([y, c]) => ({ year: Number(y), crashes: c }))
      .sort((a, b) => a.year - b.year),
    injured: {
      pedestrians: meta.injuries_by_type.pedestrians_injured,
      cyclists: meta.injuries_by_type.cyclists_injured,
      motorists: meta.injuries_by_type.motorists_injured,
    },
    killed: {
      pedestrians: meta.fatalities_by_type.pedestrians_killed,
      cyclists: meta.fatalities_by_type.cyclists_killed,
      motorists: meta.fatalities_by_type.motorists_killed,
    },
  };

  // 2. byBorough — exact scale to full total per borough
  const byBorough = {};
  const groupBy = (key) => {
    const map = new Map();
    for (const r of rows) {
      const v = key(r);
      if (v == null || v === '') continue;
      if (!map.has(v)) map.set(v, []);
      map.get(v).push(r);
    }
    return map;
  };

  for (const [b, brows] of groupBy((r) => r.BOROUGH)) {
    const sample = aggregate(brows);
    const fullTotal = meta.boroughs[b];
    if (fullTotal && sample.totalCollisions > 0) {
      byBorough[b] = scaleSummary(sample, fullTotal / sample.totalCollisions, fullTotal);
    } else {
      byBorough[b] = sample;
    }
  }

  // 3. byYear — exact scale to full total per year
  const byYear = {};
  for (const [y, yrows] of groupBy((r) => {
    const dt = r.CRASH_DATETIME;
    if (!dt) return null;
    return String(dt).split(' ')[0]?.split('-')[0] || null;
  })) {
    const sample = aggregate(yrows);
    const fullTotal = meta.crashes_by_year[y];
    if (fullTotal && sample.totalCollisions > 0) {
      byYear[y] = scaleSummary(sample, fullTotal / sample.totalCollisions, fullTotal);
    } else {
      byYear[y] = sample;
    }
  }

  // 4. byFactor — top 10 have exact totals in meta; everything else gets the
  // overall sample→full ratio so magnitudes still feel real.
  const byFactor = {};
  for (const [f, frows] of groupBy((r) => r['CONTRIBUTING FACTOR VEHICLE 1'])) {
    if (!f || f === '1' || f === '80' || f === 'Unknown') continue;
    const sample = aggregate(frows);
    const fullTotal = meta.top_contributing_factors[f];
    if (fullTotal && sample.totalCollisions > 0) {
      byFactor[f] = scaleSummary(sample, fullTotal / sample.totalCollisions, fullTotal);
    } else if (sample.totalCollisions > 0) {
      const estimated = Math.round(sample.totalCollisions * overallScale);
      byFactor[f] = scaleSummary(sample, overallScale, estimated);
    } else {
      byFactor[f] = sample;
    }
  }

  // 5. byVehicleType — scaled by the overall sample→full ratio
  const byVehicleType = {};
  for (const [v, vrows] of groupBy(
    (r) => r['VEHICLE TYPE CODE 1'] || r['VEHICLE TYPE'] || null,
  )) {
    const upper = String(v).toUpperCase();
    if (upper === 'UNKNOWN' || upper === 'N/A' || upper === '-') continue;
    const sample = aggregate(vrows);
    if (sample.totalCollisions > 0) {
      const estimated = Math.round(sample.totalCollisions * overallScale);
      byVehicleType[v] = scaleSummary(sample, overallScale, estimated);
    } else {
      byVehicleType[v] = sample;
    }
  }

  // ---------------------------------------------------------------------
  // 6. PAIRWISE JOINS — sub-summaries for the most useful 2-filter combos.
  //    Each pair Summary is computed from the rows that match BOTH filters,
  //    then scaled to keep the headline number proportional to the full
  //    NYC-wide count for that intersection (estimated via independence
  //    when no exact full count exists).
  //
  //    Schema: { joins: { boroughYear: { BORO: { YEAR: Summary, ... } } } }
  // ---------------------------------------------------------------------

  // Helper: scale a sub-summary using the appropriate full-NYC anchor.
  // We pick the SMALLER of the two anchor totals as the upper bound for
  // the intersection, then scale the sample-derived intersection ratio
  // against that anchor — yields realistic magnitudes for combinations.
  function scaleByIntersection(sample, anchorA, anchorB, sampleAnchorA, sampleAnchorB) {
    if (sample.totalCollisions === 0) return sample;
    // Estimated full intersection count = min anchor × ratio of sample intersection
    // to the smaller of the two sample anchor counts.
    const smallerAnchor = Math.min(anchorA, anchorB);
    const smallerSampleAnchor = Math.min(sampleAnchorA, sampleAnchorB) || 1;
    const intersectionRatio = sample.totalCollisions / smallerSampleAnchor;
    const estimated = Math.round(smallerAnchor * intersectionRatio);
    const scale = estimated / sample.totalCollisions;
    return scaleSummary(sample, scale, estimated);
  }

  // Sample anchor counts for each value (so we can compute correct ratios)
  const sampleBoroughCount = {};
  for (const [b, brows] of groupBy((r) => r.BOROUGH)) sampleBoroughCount[b] = brows.length;
  const sampleYearCount = {};
  for (const [y, yrows] of groupBy((r) => {
    const dt = r.CRASH_DATETIME;
    if (!dt) return null;
    return String(dt).split(' ')[0]?.split('-')[0] || null;
  })) sampleYearCount[y] = yrows.length;
  const sampleFactorCount = {};
  for (const [f, frows] of groupBy((r) => r['CONTRIBUTING FACTOR VEHICLE 1'])) {
    sampleFactorCount[f] = frows.length;
  }
  const sampleVehicleCount = {};
  for (const [v, vrows] of groupBy(
    (r) => r['VEHICLE TYPE CODE 1'] || r['VEHICLE TYPE'] || null,
  )) sampleVehicleCount[v] = vrows.length;

  // Group rows by each combo
  function groupByPair(keyA, keyB) {
    const map = new Map();
    for (const r of rows) {
      const a = keyA(r);
      const b = keyB(r);
      if (a == null || a === '' || b == null || b === '') continue;
      const key = `${a} ${b}`;
      if (!map.has(key)) map.set(key, { a, b, rows: [] });
      map.get(key).rows.push(r);
    }
    return map;
  }

  // 6a. boroughYear
  const boroughYear = {};
  for (const { a: b, b: y, rows: prows } of groupByPair(
    (r) => r.BOROUGH,
    (r) => {
      const dt = r.CRASH_DATETIME;
      if (!dt) return null;
      return String(dt).split(' ')[0]?.split('-')[0] || null;
    },
  ).values()) {
    if (prows.length < 5) continue; // skip tiny intersections
    const fullA = meta.boroughs[b];
    const fullB = meta.crashes_by_year[y];
    if (!fullA || !fullB) continue;
    const sample = aggregate(prows);
    const scaled = scaleByIntersection(
      sample,
      fullA,
      fullB,
      sampleBoroughCount[b],
      sampleYearCount[y],
    );
    if (!boroughYear[b]) boroughYear[b] = {};
    boroughYear[b][y] = scaled;
  }

  // 6b. boroughFactor
  const boroughFactor = {};
  for (const { a: b, b: f, rows: prows } of groupByPair(
    (r) => r.BOROUGH,
    (r) => r['CONTRIBUTING FACTOR VEHICLE 1'],
  ).values()) {
    if (!f || f === '1' || f === '80' || f === 'Unknown') continue;
    if (prows.length < 5) continue;
    const fullA = meta.boroughs[b];
    const fullB = meta.top_contributing_factors[f]
      ?? Math.round(sampleFactorCount[f] * overallScale);
    if (!fullA || !fullB) continue;
    const sample = aggregate(prows);
    const scaled = scaleByIntersection(
      sample,
      fullA,
      fullB,
      sampleBoroughCount[b],
      sampleFactorCount[f],
    );
    if (!boroughFactor[b]) boroughFactor[b] = {};
    boroughFactor[b][f] = scaled;
  }

  // 6c. yearFactor
  const yearFactor = {};
  for (const { a: y, b: f, rows: prows } of groupByPair(
    (r) => {
      const dt = r.CRASH_DATETIME;
      if (!dt) return null;
      return String(dt).split(' ')[0]?.split('-')[0] || null;
    },
    (r) => r['CONTRIBUTING FACTOR VEHICLE 1'],
  ).values()) {
    if (!f || f === '1' || f === '80' || f === 'Unknown') continue;
    if (prows.length < 5) continue;
    const fullA = meta.crashes_by_year[y];
    const fullB = meta.top_contributing_factors[f]
      ?? Math.round(sampleFactorCount[f] * overallScale);
    if (!fullA || !fullB) continue;
    const sample = aggregate(prows);
    const scaled = scaleByIntersection(
      sample,
      fullA,
      fullB,
      sampleYearCount[y],
      sampleFactorCount[f],
    );
    if (!yearFactor[y]) yearFactor[y] = {};
    yearFactor[y][f] = scaled;
  }

  // 6d. boroughVehicle
  const boroughVehicle = {};
  for (const { a: b, b: v, rows: prows } of groupByPair(
    (r) => r.BOROUGH,
    (r) => r['VEHICLE TYPE CODE 1'] || r['VEHICLE TYPE'] || null,
  ).values()) {
    const upper = String(v).toUpperCase();
    if (upper === 'UNKNOWN' || upper === 'N/A' || upper === '-') continue;
    if (prows.length < 5) continue;
    const fullA = meta.boroughs[b];
    const estimatedFullV = Math.round(sampleVehicleCount[v] * overallScale);
    if (!fullA || !estimatedFullV) continue;
    const sample = aggregate(prows);
    const scaled = scaleByIntersection(
      sample,
      fullA,
      estimatedFullV,
      sampleBoroughCount[b],
      sampleVehicleCount[v],
    );
    if (!boroughVehicle[b]) boroughVehicle[b] = {};
    boroughVehicle[b][v] = scaled;
  }

  // 6e. yearVehicle
  const yearVehicle = {};
  for (const { a: y, b: v, rows: prows } of groupByPair(
    (r) => {
      const dt = r.CRASH_DATETIME;
      if (!dt) return null;
      return String(dt).split(' ')[0]?.split('-')[0] || null;
    },
    (r) => r['VEHICLE TYPE CODE 1'] || r['VEHICLE TYPE'] || null,
  ).values()) {
    const upper = String(v).toUpperCase();
    if (upper === 'UNKNOWN' || upper === 'N/A' || upper === '-') continue;
    if (prows.length < 5) continue;
    const fullA = meta.crashes_by_year[y];
    const estimatedFullV = Math.round(sampleVehicleCount[v] * overallScale);
    if (!fullA || !estimatedFullV) continue;
    const sample = aggregate(prows);
    const scaled = scaleByIntersection(
      sample,
      fullA,
      estimatedFullV,
      sampleYearCount[y],
      sampleVehicleCount[v],
    );
    if (!yearVehicle[y]) yearVehicle[y] = {};
    yearVehicle[y][v] = scaled;
  }

  const joins = { boroughYear, boroughFactor, yearFactor, boroughVehicle, yearVehicle };

  return { all, byBorough, byYear, byFactor, byVehicleType, joins };
}

// --------------------------------------------------------------------------
// Entry
// --------------------------------------------------------------------------

function main() {
  const metaPath = join(dataDir, 'dataset_metadata.json');
  if (!existsSync(metaPath)) {
    console.error(`Missing ${metaPath}. Aborting.`);
    process.exit(1);
  }
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));

  const rows = [];
  for (const f of SAMPLE_FILES) {
    const path = join(dataDir, f);
    const part = loadJsonl(path);
    console.log(`  ${f}: ${part.length.toLocaleString()} rows`);
    rows.push(...part);
  }

  if (rows.length === 0) {
    console.error(
      `\nNo sample rows found. The integrated sample JSONLs must exist in\n` +
        `  ${dataDir}\n` +
        `for the index to be generated. They are gitignored — keep them locally.`,
    );
    process.exit(1);
  }

  console.log(`\nAggregating across ${rows.length.toLocaleString()} sample rows…`);
  const index = buildIndex(rows, meta);

  const outPath = join(dataDir, 'dataset_index.json');
  // Compact JSON keeps the file small for fast loading.
  writeFileSync(outPath, JSON.stringify(index));
  const sizeKb = (readFileSync(outPath).length / 1024).toFixed(1);
  console.log(`\nWrote ${outPath} (${sizeKb} KB)`);
  console.log(
    `  ${Object.keys(index.byBorough).length} boroughs · ` +
      `${Object.keys(index.byYear).length} years · ` +
      `${Object.keys(index.byFactor).length} factors · ` +
      `${Object.keys(index.byVehicleType).length} vehicle types`,
  );
  const countPairs = (obj) =>
    Object.values(obj).reduce((sum, inner) => sum + Object.keys(inner).length, 0);
  console.log(
    `  joins → ${countPairs(index.joins.boroughYear)} borough×year · ` +
      `${countPairs(index.joins.boroughFactor)} borough×factor · ` +
      `${countPairs(index.joins.yearFactor)} year×factor · ` +
      `${countPairs(index.joins.boroughVehicle)} borough×vehicle · ` +
      `${countPairs(index.joins.yearVehicle)} year×vehicle`,
  );
}

main();

import { BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { FullDataReport } from '../types';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { exportElementToPDF } from '../utils/pdfExport';

// Print-friendly palette — vivid, fully-opaque hues that survive html2canvas
// rasterization, with a darker grid for clearer chart structure on paper.
const RC = {
  borough: '#075985',   // brighter teal-blue
  hour: '#0f172a',      // near-black for continuous time
  factor: '#6b21a8',    // richer purple
  year: '#7f1d1d',      // dark crimson
  injury: '#0369a1',    // strong cyan-blue
  fatality: '#b91c1c',  // bright red
  axis: '#1e293b',
  grid: '#94a3b8',      // visible gridlines
  text: '#0f172a',
};

function pct(part: number, whole: number, digits = 0): string {
  if (!whole) return '0%';
  return `${((part / whole) * 100).toFixed(digits)}%`;
}

interface Props {
  open: boolean;
  report: FullDataReport;
  onClose: () => void;
}

export function FullDataReportModal({ open, report, onClose }: Props) {
  const ref = useFocusTrap<HTMLDivElement>(open, onClose);
  if (!open) return null;

  // ── Borough insight ────────────────────────────────────────
  const totalBorough = report.boroughs.reduce((s, b) => s + b.value, 0);
  const sortedBoroughs = [...report.boroughs].sort((a, b) => b.value - a.value);
  const topBorough = sortedBoroughs[0];
  const lowBorough = sortedBoroughs[sortedBoroughs.length - 1];

  // ── Hourly insight ─────────────────────────────────────────
  const peakHour = report.collisionsByHourData.reduce(
    (best, d) => (d.collisions > best.collisions ? d : best),
    report.collisionsByHourData[0] ?? { hour: '0:00', collisions: 0 },
  );
  const minHour = report.collisionsByHourData.reduce(
    (best, d) => (d.collisions < best.collisions ? d : best),
    report.collisionsByHourData[0] ?? { hour: '0:00', collisions: 0 },
  );

  // ── Victims insight ────────────────────────────────────────
  const injuries = report.injuryFatalityData.filter((i) => i.category === 'Injuries');
  const fatalities = report.injuryFatalityData.filter((i) => i.category === 'Fatalities');
  const totalInjuries = injuries.reduce((s, i) => s + i.count, 0);
  const totalFatalities = fatalities.reduce((s, i) => s + i.count, 0);
  const motoristsInjured =
    injuries.find((i) => i.type === 'Motorists Injured')?.count ?? 0;
  const pedestriansKilled =
    fatalities.find((i) => i.type === 'Pedestrians Killed')?.count ?? 0;

  // ── Factor insight ─────────────────────────────────────────
  const sortedFactors = [...report.topFactors].sort((a, b) => b.count - a.count);
  const topFactor = sortedFactors[0];
  const secondFactor = sortedFactors[1];
  const factorRatio =
    topFactor && secondFactor && secondFactor.count > 0
      ? (topFactor.count / secondFactor.count).toFixed(1)
      : '—';

  // ── Yearly insight ─────────────────────────────────────────
  const sortedYears = [...report.crashesByYearData].sort((a, b) => a.year - b.year);
  const peakYear = sortedYears.reduce(
    (best, d) => (d.crashes > best.crashes ? d : best),
    sortedYears[0] ?? { year: 0, crashes: 0 },
  );
  const firstYear = sortedYears[0];
  const lastYear = sortedYears[sortedYears.length - 1];
  const yearDelta =
    firstYear && lastYear && firstYear.crashes > 0
      ? ((lastYear.crashes - firstYear.crashes) / firstYear.crashes) * 100
      : 0;
  const yearDeltaSign = yearDelta >= 0 ? '+' : '−';

  return (
    <div className="report-overlay" onClick={onClose}>
      <div
        ref={ref}
        className="report-panel"
        id="full-report-view"
        role="dialog"
        aria-modal="true"
        aria-label="Complete Dataset Report"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="report-header">
          <h2>NYC Collision Report · Full dataset</h2>
          <div className="report-actions">
            <button type="button" className="btn report-close" onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => exportElementToPDF('full-report-view', 'full')}
            >
              Download PDF
            </button>
          </div>
        </div>

        <div className="report-body">
          <div className="report-section report-summary">
            <div className="stat">
              <div className="stat-label">Total Collisions</div>
              <div className="stat-value">{report.totalCollisions.toLocaleString()}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Total Injured</div>
              <div className="stat-value">{report.totalInjured.toLocaleString()}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Total Killed</div>
              <div className="stat-value">{report.totalKilled.toLocaleString()}</div>
            </div>
          </div>

          <div className="report-section">
            <h3>Crashes by Borough</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={report.boroughs} margin={{ top: 10, right: 12, bottom: 30, left: 12 }}>
                <CartesianGrid stroke={RC.grid} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: RC.text, fontSize: 12, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  angle={-25}
                  textAnchor="end"
                  height={64}
                />
                <YAxis
                  tick={{ fill: RC.axis, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`
                  }
                />
                <Tooltip
                  formatter={(value: number) => [value.toLocaleString(), 'Crashes']}
                  cursor={{ fill: 'rgba(30,58,138,0.06)' }}
                />
                <Bar
                  dataKey="value"
                  fill={RC.borough}
                  fillOpacity={1}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={64}
                />
              </BarChart>
            </ResponsiveContainer>
            {topBorough && lowBorough ? (
              <p className="chart-insight">
                <strong>{topBorough.name}</strong> accounts for{' '}
                <strong>{pct(topBorough.value, totalBorough)}</strong> of all crashes;{' '}
                <strong>{lowBorough.name}</strong> the fewest at{' '}
                <strong>{pct(lowBorough.value, totalBorough)}</strong>.
              </p>
            ) : null}
          </div>

          <div className="report-section">
            <h3>Crashes by Hour of Day</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={report.collisionsByHourData} margin={{ top: 10, right: 12, bottom: 0, left: 12 }}>
                <CartesianGrid stroke={RC.grid} vertical={false} />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: RC.axis, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval={2}
                />
                <YAxis
                  tick={{ fill: RC.axis, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`
                  }
                />
                <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Crashes']} />
                <Line
                  type="monotone"
                  dataKey="collisions"
                  stroke={RC.hour}
                  strokeWidth={2.5}
                  strokeOpacity={1}
                  dot={{ r: 3, fill: RC.hour, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: RC.hour }}
                />
              </LineChart>
            </ResponsiveContainer>
            {peakHour ? (
              <p className="chart-insight">
                Peak at <strong>{peakHour.hour}</strong> with{' '}
                <strong>{peakHour.collisions.toLocaleString()}</strong> crashes; the quietest hour
                is <strong>{minHour.hour}</strong> ({minHour.collisions.toLocaleString()}).
              </p>
            ) : null}
          </div>

          <div className="report-section">
            <h3>Injuries and Fatalities by Type</h3>
            <p className="report-section-sub">
              <span className="legend-swatch" style={{ background: RC.injury }} /> Injuries
              <span className="legend-swatch" style={{ background: RC.fatality, marginLeft: 14 }} /> Fatalities
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <div>
                <h4 className="report-subhead" style={{ color: RC.injury }}>Injuries</h4>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart
                    data={report.injuryFatalityData.filter((i) => i.category === 'Injuries')}
                    margin={{ top: 10, right: 12, left: 12, bottom: 50 }}
                  >
                    <CartesianGrid stroke={RC.grid} vertical={false} />
                    <XAxis
                      dataKey="type"
                      tick={{ fill: RC.text, fontSize: 10.5, fontWeight: 600 }}
                      angle={-25}
                      textAnchor="end"
                      height={56}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => v.replace(' Injured', '').replace(' Killed', '')}
                    />
                    <YAxis
                      tick={{ fill: RC.axis, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`
                      }
                    />
                    <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Injuries']} />
                    <Bar
                      dataKey="count"
                      fill={RC.injury}
                      fillOpacity={1}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={56}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h4 className="report-subhead" style={{ color: RC.fatality }}>Fatalities</h4>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart
                    data={report.injuryFatalityData.filter((i) => i.category === 'Fatalities')}
                    margin={{ top: 10, right: 12, left: 12, bottom: 50 }}
                  >
                    <CartesianGrid stroke={RC.grid} vertical={false} />
                    <XAxis
                      dataKey="type"
                      tick={{ fill: RC.text, fontSize: 10.5, fontWeight: 600 }}
                      angle={-25}
                      textAnchor="end"
                      height={56}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => v.replace(' Injured', '').replace(' Killed', '')}
                    />
                    <YAxis
                      tick={{ fill: RC.axis, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`
                      }
                    />
                    <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Fatalities']} />
                    <Bar
                      dataKey="count"
                      fill={RC.fatality}
                      fillOpacity={1}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={56}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <p className="chart-insight">
              Motorists are <strong>{pct(motoristsInjured, totalInjuries)}</strong> of injuries,
              but pedestrians bear <strong>{pct(pedestriansKilled, totalFatalities)}</strong> of
              fatalities — the deadliest disparity in NYC's collision data.
            </p>
          </div>

          <div className="report-section">
            <h3>Top 10 Contributing Factors</h3>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={report.topFactors} margin={{ top: 10, right: 12, bottom: 100, left: 12 }}>
                <CartesianGrid stroke={RC.grid} vertical={false} />
                <XAxis
                  dataKey="factor"
                  tick={{ fill: RC.text, fontSize: 10.5, fontWeight: 600 }}
                  angle={-30}
                  textAnchor="end"
                  height={100}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  tick={{ fill: RC.axis, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`
                  }
                />
                <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Crashes']} />
                <Bar
                  dataKey="count"
                  fill={RC.factor}
                  fillOpacity={1}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
            {topFactor ? (
              <p className="chart-insight">
                <strong>{topFactor.factor}</strong> leads, cited in{' '}
                <strong>{topFactor.count.toLocaleString()}</strong> crashes —{' '}
                <strong>{factorRatio}×</strong> more than the next-most-common cause.
              </p>
            ) : null}
          </div>

          <div className="report-section">
            <h3>Crashes by Year</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={report.crashesByYearData} margin={{ top: 10, right: 12, bottom: 0, left: 12 }}>
                <CartesianGrid stroke={RC.grid} vertical={false} />
                <XAxis
                  dataKey="year"
                  tick={{ fill: RC.axis, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: RC.axis, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`
                  }
                />
                <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Crashes']} />
                <Line
                  type="monotone"
                  dataKey="crashes"
                  stroke={RC.year}
                  strokeWidth={2.5}
                  strokeOpacity={1}
                  dot={{ r: 4, fill: RC.year, stroke: '#fff', strokeWidth: 1.5 }}
                  activeDot={{ r: 6, fill: RC.year, stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
            {peakYear && firstYear && lastYear ? (
              <p className="chart-insight">
                Crashes peaked in <strong>{peakYear.year}</strong> (
                {peakYear.crashes.toLocaleString()}); from <strong>{firstYear.year}</strong> to{' '}
                <strong>{lastYear.year}</strong> the trend shifted{' '}
                <strong>
                  {yearDeltaSign}
                  {Math.abs(yearDelta).toFixed(0)}%
                </strong>
                .
              </p>
            ) : null}
          </div>

          <div className="report-section">
            <h3>Methodology &amp; sources</h3>
            <p className="paragraph">
              This report aggregates the complete NYC Open Data motor vehicle collision dataset. It
              covers <strong>{report.totalCollisions.toLocaleString()}</strong> crash records
              spanning all five boroughs, with detailed breakdowns by time, location, severity, and
              contributing factor.
            </p>
            <p className="paragraph">
              The dashboard above uses a representative sample for fast interactive exploration; the
              full-dataset report you're viewing draws on the complete record set. Reports are
              produced with the same pipeline and remain consistent with the original data.
            </p>
            <p className="paragraph">
              <strong>Original data sources:</strong>
              <br />
              Motor Vehicle Collisions – Crashes:{' '}
              <a
                href="https://data.cityofnewyork.us/Public-Safety/Motor-Vehicle-Collisions-Crashes/h9gi-nx95"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in NYC Open Data
              </a>
              <br />
              Motor Vehicle Collisions – Persons:{' '}
              <a
                href="https://data.cityofnewyork.us/Public-Safety/Motor-Vehicle-Collisions-Person/f55k-p6yu"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in NYC Open Data
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

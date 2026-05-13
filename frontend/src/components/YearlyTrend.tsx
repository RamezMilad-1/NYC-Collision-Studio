import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { YearBucket } from '../types';
import { ChartSkeleton } from './Skeleton';

interface Props {
  data: YearBucket[];
  isFullData: boolean;
}

export function YearlyTrend({ data, isFullData }: Props) {
  if (data.length === 0) {
    return (
      <div className="card yearly-card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Crashes by year</h3>
            <p className="card-sub">Long-run trend</p>
          </div>
        </div>
        <ChartSkeleton height={240} />
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.crashes, 0);
  const first = data[0];
  const last = data[data.length - 1];

  const biggestDrop = data.slice(1).reduce(
    (best, current, index) => {
      const previous = data[index];
      const change =
        previous.crashes > 0
          ? ((current.crashes - previous.crashes) / previous.crashes) * 100
          : 0;

      return change < best.change
        ? {
            fromYear: previous.year,
            toYear: current.year,
            fromCrashes: previous.crashes,
            toCrashes: current.crashes,
            change,
          }
        : best;
    },
    {
      fromYear: first.year,
      toYear: first.year,
      fromCrashes: first.crashes,
      toCrashes: first.crashes,
      change: 0,
    }
  );

  const dropPercent = Math.abs(biggestDrop.change).toFixed(0);

  return (
    <div className="card yearly-card">
      <div className="yearly-head">
        <div>
          <h3 className="card-title">
            Crashes by year · {first.year} – {last.year}
            <span
              className="card-pill"
              style={{ marginLeft: 10, verticalAlign: 'middle' }}
            >
              {isFullData ? 'Full dataset' : 'Filtered'}
            </span>
          </h3>

          <p className="card-sub yearly-peak">
            <strong>{total.toLocaleString()}</strong> total crashes · latest year{' '}
            <strong>{last.year}</strong> ({last.crashes.toLocaleString()} crashes)
          </p>
        </div>

        <div
          className="yearly-summary"
          aria-label={`Biggest drop from ${biggestDrop.fromYear} to ${biggestDrop.toYear}: ${dropPercent}% fewer crashes`}
          style={{
            alignItems: 'flex-end',
            gap: 6,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'flex-end',
              gap: 10,
              whiteSpace: 'nowrap',
            }}
          >
            <span
              className="delta delta--down"
              title={`Largest year-over-year decrease: ${biggestDrop.fromYear} to ${biggestDrop.toYear}`}
              style={{
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontSize: 10.5,
                fontWeight: 800,
              }}
            >
              Biggest drop · {biggestDrop.fromYear} → {biggestDrop.toYear}
            </span>

            <span className="card-big-stat">−{dropPercent}%</span>

            <span
              style={{
                color: 'var(--text-1)',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                opacity: 0.92,
              }}
            >
              fewer crashes
            </span>
          </div>
        </div>
      </div>

      <div className="yearly-legend" aria-hidden="true">
        <span className="legend-dot" style={{ ['--legend-color' as never]: 'var(--accent)' }}>
          Annual crashes
        </span>
      </div>

      <div style={{ height: 240, marginTop: 6 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="yearGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="var(--chart-grid-stroke)" vertical={false} />

            <XAxis
              dataKey="year"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--text-3)', fontSize: 11 }}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--text-3)', fontSize: 11 }}
              tickFormatter={(v) =>
                v >= 1_000_000
                  ? `${(v / 1_000_000).toFixed(1)}M`
                  : v >= 1000
                    ? `${Math.round(v / 1000)}k`
                    : `${v}`
              }
              width={42}
            />

            <Tooltip
              cursor={{ stroke: 'var(--chart-cursor-stroke)', strokeWidth: 1 }}
              formatter={(value: number) => [`${value.toLocaleString()} crashes`, 'Annual total']}
              labelFormatter={(l) => `Year ${l}`}
            />

            <Area
              type="monotone"
              dataKey="crashes"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#yearGradient)"
              activeDot={{
                r: 4,
                fill: 'var(--accent)',
                stroke: 'var(--chart-dot-ring)',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="chart-insight">
        The sharpest year-over-year decrease was from{' '}
        <strong>{biggestDrop.fromYear}</strong> to <strong>{biggestDrop.toYear}</strong>, when
        crashes fell by <strong>{dropPercent}%</strong> from{' '}
        <strong>{biggestDrop.fromCrashes.toLocaleString()}</strong> to{' '}
        <strong>{biggestDrop.toCrashes.toLocaleString()}</strong>.
      </p>
    </div>
  );
}
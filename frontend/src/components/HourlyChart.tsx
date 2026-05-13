import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { HourBucket } from '../types';

interface Props {
  data: HourBucket[];
}

export function HourlyChart({ data }: Props) {
  const peak = data.reduce(
    (best, d) => (d.collisions > best.collisions ? d : best),
    data[0] ?? { hour: '0:00', collisions: 0 },
  );
  const lull = data.reduce(
    (best, d) => (d.collisions < best.collisions ? d : best),
    data[0] ?? { hour: '0:00', collisions: 0 },
  );
  const total = data.reduce((s, d) => s + d.collisions, 0);
  const avg = data.length > 0 ? Math.round(total / data.length) : 0;
  const peakRatio = avg > 0 ? (peak.collisions / avg).toFixed(1) : '—';

  return (
    <div className="card hourly-card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Crashes by hour</h3>
          <p className="card-sub hourly-meta">
            Peak at <strong>{peak.hour}</strong> · average <strong>{avg.toLocaleString()}</strong>/hr
          </p>
        </div>
        <span className="card-pill">24-hour</span>
      </div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="hourGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--btn-primary-top)" stopOpacity={0.55} />
                <stop offset="100%" stopColor="var(--btn-primary-top)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--chart-grid-stroke)" vertical={false} />
            <XAxis
              dataKey="hour"
              interval={3}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--text-3)', fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--text-3)', fontSize: 11 }}
              tickFormatter={(v) =>
                v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `${v}`
              }
              width={36}
            />
            <Tooltip
              cursor={{ stroke: 'var(--chart-cursor-stroke)', strokeWidth: 1 }}
              formatter={(value: number) => [value.toLocaleString(), 'Crashes']}
            />
            <Area
              type="monotone"
              dataKey="collisions"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#hourGradient)"
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
      {data.length > 0 ? (
        <p className="chart-insight">
          <strong>{peak.hour}</strong> is <strong>{peakRatio}×</strong> busier than the daily
          average; <strong>{lull.hour}</strong> is the calmest hour on NYC streets.
        </p>
      ) : null}
    </div>
  );
}

import { useId } from 'react';
import type { Summary } from '../types';
import { CountUp } from './CountUp';
import { Skeleton } from './Skeleton';

interface Props {
  summary: Summary;
  loading: boolean;
}

const ICONS = {
  crash: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 11h14l-1.4-4.2A2 2 0 0 0 15.7 5H8.3a2 2 0 0 0-1.9 1.4L5 11Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M5 11v6h2v1h2v-1h6v1h2v-1h2v-6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="8" cy="14.5" r="1" fill="currentColor" />
      <circle cx="16" cy="14.5" r="1" fill="currentColor" />
    </svg>
  ),
  injured: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="7" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 21c.6-3.5 3.5-6 7-6s6.4 2.5 7 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  killed: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12v6h4v-4h8v4h4v-6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M4 12 7 7h10l3 5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 14l4 4M14 14l-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  factor: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2 3 7v6c0 5 3.8 8.5 9 9 5.2-.5 9-4 9-9V7l-9-5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 12h6M9 9h6M9 15h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
};

export function StatsOverview({ summary, loading }: Props) {
  const totalPeople = summary.totalInjured + summary.totalKilled;
  const fatalityRate =
    summary.totalCollisions > 0
      ? ((summary.totalKilled / summary.totalCollisions) * 100).toFixed(2)
      : '0.00';
  const injuryRate =
    summary.totalCollisions > 0
      ? ((summary.totalInjured / summary.totalCollisions) * 100).toFixed(1)
      : '0.0';
  const topFactor = summary.topFactors[0];
  const yearly = summary.crashesByYearData ?? [];

  return (
    <div className="kpis fade-up" style={{ animationDelay: '60ms' }}>
      <KpiTile
        icon={ICONS.crash}
        label="Total Collisions"
        value={summary.totalCollisions}
        foot={
          <>
            <strong>{summary.boroughs.length || 5}</strong> boroughs ·{' '}
            {yearly.length > 0 ? <span>{yearly.length} years</span> : '14 years'}
          </>
        }
        loading={loading}
        spark={yearly}
        sparkLabel={
          yearly.length > 0
            ? `Crashes per year, ${yearly[0].year}–${yearly[yearly.length - 1].year}`
            : undefined
        }
        accent
      />
      <KpiTile
        icon={ICONS.injured}
        label="People Injured"
        value={summary.totalInjured}
        foot={
          <>
            <strong>{injuryRate}%</strong> crash injury rate
            {totalPeople > 0 ? (
              <span style={{ color: 'var(--text-4)' }}>
                {' · '}
                {Math.round((summary.totalInjured / totalPeople) * 100)}% of all victims
              </span>
            ) : null}
          </>
        }
        loading={loading}
      />
      <KpiTile
        icon={ICONS.killed}
        label="All Fatalities"
        value={summary.totalKilled}
        foot={
          <>
            <strong>{fatalityRate}%</strong> crash fatality rate
          </>
        }
        loading={loading}
      />
      <KpiTile
        icon={ICONS.factor}
        label="Top contributing factor"
        value={topFactor?.value ?? 0}
        foot={
          topFactor ? (
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'inline-block',
                maxWidth: '100%',
                color: 'var(--text-2)',
              }}
              title={topFactor.name}
            >
              {topFactor.name}
            </span>
          ) : (
            '—'
          )
        }
        loading={loading}
      />
    </div>
  );
}

interface TileProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  foot: React.ReactNode;
  loading: boolean;
  spark?: { year: number; crashes: number }[];
  sparkLabel?: string;
  accent?: boolean;
}

function KpiTile({ icon, label, value, foot, loading, spark, sparkLabel, accent }: TileProps) {
  const hasSpark = !loading && spark && spark.length > 1;
  return (
    <div className={`kpi ${accent ? 'kpi--accent' : ''}`} role="group" aria-label={label}>
      <div className="kpi-label">
        <span>{label}</span>
        <span className="kpi-icon">{icon}</span>
      </div>
      <div className="kpi-value">
        {loading ? <Skeleton width={120} height={32} /> : <CountUp value={value} />}
      </div>
      <div className="kpi-foot">{loading ? <Skeleton width={120} height={12} /> : foot}</div>
      {hasSpark ? (
        <YearlySpark
          data={spark!}
          label={sparkLabel}
          variant={accent ? 'accent' : 'info'}
        />
      ) : null}
    </div>
  );
}

interface SparkProps {
  data: { year: number; crashes: number }[];
  label?: string;
  variant: 'accent' | 'info';
}

function YearlySpark({ data, label, variant }: SparkProps) {
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const gid = `kpi-spark-${variant}-${rawId}`;
  const color = variant === 'accent' ? 'var(--accent)' : 'var(--info)';
  const W = 200;
  const H = 36;
  const PAD_X = 2;
  const PAD_Y = 4;
  const min = Math.min(...data.map((d) => d.crashes));
  const max = Math.max(...data.map((d) => d.crashes));
  const range = max - min || 1;
  const stepX = (W - PAD_X * 2) / Math.max(data.length - 1, 1);
  const pts = data.map((d, i) => {
    const x = PAD_X + i * stepX;
    const y = PAD_Y + (H - PAD_Y * 2) * (1 - (d.crashes - min) / range);
    return [x, y] as const;
  });
  const linePath = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1][0].toFixed(2)},${H} L${pts[0][0].toFixed(2)},${H} Z`;
  const last = pts[pts.length - 1];

  return (
    <div className="kpi-spark">
      {label ? <div className="kpi-spark-label">{label}</div> : null}
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height="100%" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.45} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gid})`} />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={last[0]} cy={last[1]} r={2.2} fill={color} />
      </svg>
    </div>
  );
}

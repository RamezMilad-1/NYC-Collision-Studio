import type { Summary } from '../types';
import { Skeleton } from './Skeleton';

interface Props {
  summary: Summary;
  loading: boolean;
}

export function StatsOverview({ summary, loading }: Props) {
  return (
    <div className="overview">
      <StatCard label="Collisions" value={summary.totalCollisions} note="Records shown" loading={loading} cls="gradient-1" />
      <StatCard label="Injured" value={summary.totalInjured} note="Number of injured people" loading={loading} cls="gradient-2" />
      <StatCard label="Killed" value={summary.totalKilled} note="Number of fatalities" loading={loading} cls="gradient-3" />
      <StatCard label="Boroughs" value={summary.boroughs.length} note="Distinct boroughs found" loading={loading} cls="gradient-4" />
    </div>
  );
}

interface CardProps {
  label: string;
  value: number;
  note: string;
  loading: boolean;
  cls: string;
}

function StatCard({ label, value, note, loading, cls }: CardProps) {
  return (
    <div className={`stat-card ${cls}`} role="group" aria-label={label}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {loading ? <Skeleton width={64} height={28} /> : value.toLocaleString()}
      </div>
      <div className="stat-note">{note}</div>
    </div>
  );
}

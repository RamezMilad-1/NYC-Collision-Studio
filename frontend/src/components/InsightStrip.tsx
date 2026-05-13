import type { Summary } from '../types';

interface Props {
  summary: Summary;
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

export function InsightStrip({ summary }: Props) {
  const topBorough = summary.boroughs.reduce<{ name: string; value: number } | null>(
    (best, b) => (!best || b.value > best.value ? b : best),
    null,
  );
  const totalBorough = summary.boroughs.reduce((s, b) => s + b.value, 0);
  const boroughShare =
    topBorough && totalBorough > 0 ? ((topBorough.value / totalBorough) * 100).toFixed(0) : '0';

  const peakHour = summary.collisionsByHourData.reduce(
    (best, d) => (!best || d.collisions > best.collisions ? d : best),
    summary.collisionsByHourData[0] ?? null,
  );

  const topFactor = summary.topFactors[0];
  const totalFactorTop = summary.topFactors.reduce((s, f) => s + f.value, 0);
  const factorShare =
    topFactor && totalFactorTop > 0 ? ((topFactor.value / totalFactorTop) * 100).toFixed(0) : '0';

  return (
    <div className="insights fade-up" style={{ animationDelay: '160ms' }}>
      <div className="insight">
        <div className="insight-label">Geography</div>
        <p className="insight-headline">
          <span className="insight-num">{boroughShare}%</span> of crashes happen in{' '}
          {topBorough ? titleCase(topBorough.name) : '—'}
        </p>
        <p className="insight-foot">
          Of the loaded sample · {topBorough?.value.toLocaleString() ?? 0} crashes
        </p>
      </div>
      <div className="insight">
        <div className="insight-label">When it happens</div>
        <p className="insight-headline">
          The day's peak hits{' '}
          <span className="insight-num">{peakHour ? peakHour.hour : '—'}</span>
        </p>
        <p className="insight-foot">
          {peakHour
            ? `${peakHour.collisions.toLocaleString()} crashes recorded in that hour`
            : 'No hourly data yet'}
        </p>
      </div>
      <div className="insight">
        <div className="insight-label">Why it happens</div>
        <p className="insight-headline">
          Leading factor:{' '}
          <span className="insight-num">{topFactor ? truncate(topFactor.name, 32) : '—'}</span>
        </p>
        <p className="insight-foot">
          {topFactor
            ? `Cited in ${factorShare}% of the top 6 causes`
            : 'Insufficient data'}
        </p>
      </div>
    </div>
  );
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

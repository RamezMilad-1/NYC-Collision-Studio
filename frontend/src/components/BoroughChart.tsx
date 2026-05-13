import type { NameValue } from '../types';

interface Props {
  data: NameValue[];
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

export function BoroughChart({ data }: Props) {
  const max = data.reduce((m, b) => (b.value > m ? b.value : m), 0);
  const total = data.reduce((s, b) => s + b.value, 0);
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const top = sorted[0];
  const low = sorted[sorted.length - 1];
  const topShare = top && total > 0 ? ((top.value / total) * 100).toFixed(0) : '0';
  const lowShare = low && total > 0 ? ((low.value / total) * 100).toFixed(0) : '0';

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Crashes by borough</h3>
          <p className="card-sub">Distribution across NYC's five boroughs</p>
        </div>
        <span className="card-pill">{sorted.length} regions</span>
      </div>
      <div className="borough-list">
        {sorted.map((b) => {
          const pct = max > 0 ? (b.value / max) * 100 : 0;
          const sharePct = total > 0 ? ((b.value / total) * 100).toFixed(1) : '0.0';
          return (
            <div className="borough-row" key={b.name}>
              <div className="borough-name">{titleCase(b.name)}</div>
              <div
                className="borough-bar"
                role="img"
                aria-label={`${titleCase(b.name)}: ${b.value.toLocaleString()} crashes, ${sharePct}% share`}
              >
                <div className="borough-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="borough-value">
                {b.value.toLocaleString()}
                <span style={{ color: 'var(--text-4)', fontSize: 10.5, marginLeft: 4 }}>{sharePct}%</span>
              </div>
            </div>
          );
        })}
      </div>
      {top && low ? (
        <p className="chart-insight">
          <strong>{titleCase(top.name)}</strong> leads with{' '}
          <strong>{topShare}%</strong> of crashes; <strong>{titleCase(low.name)}</strong> the
          fewest at <strong>{lowShare}%</strong>.
        </p>
      ) : null}
    </div>
  );
}

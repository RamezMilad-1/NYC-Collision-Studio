import type { NameValue } from '../types';

interface Props {
  factors: NameValue[];
}

export function TopFactors({ factors }: Props) {
  const max = factors[0]?.value ?? 0;
  const top = factors[0];
  const second = factors[1];
  const ratio =
    top && second && second.value > 0 ? (top.value / second.value).toFixed(1) : '—';
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Top contributing factors</h3>
          <p className="card-sub">What's most often cited at the scene</p>
        </div>
        <span className="card-pill">{factors.length}</span>
      </div>
      <ul className="factors-list" aria-label="Top contributing factors">
        {factors.map((f, i) => {
          const pct = max > 0 ? (f.value / max) * 100 : 0;
          return (
            <li className="factor-row" key={f.name}>
              <div className="factor-rank">{String(i + 1).padStart(2, '0')}</div>
              <div className="factor-body">
                <div className="factor-name" title={f.name}>
                  {f.name}
                </div>
                <div className="factor-bar" aria-hidden="true">
                  <div className="factor-bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="factor-value">{compact(f.value)}</div>
            </li>
          );
        })}
      </ul>
      {top ? (
        <p className="chart-insight">
          <strong>{top.name}</strong> leads — <strong>{ratio}×</strong> more cited than the
          next-most-common factor.
        </p>
      ) : null}
    </div>
  );
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return n.toLocaleString();
}

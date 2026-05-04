import type { NameValue } from '../types';

const ICONS = ['🚗', '⚠️', '👀', '🌧️', '📱', '❓'];

interface Props {
  factors: NameValue[];
}

export function TopFactors({ factors }: Props) {
  const max = factors[0]?.value ?? 0;
  return (
    <div className="panel-card top-factors-card">
      <h4 className="panel-title">Top Contributing Factors</h4>
      <ul className="top-factors-list" aria-label="Top contributing factors">
        {factors.map((f, i) => {
          const pct = max > 0 ? (f.value / max) * 100 : 0;
          return (
            <li className="factor-row" key={f.name}>
              <div className="factor-icon" aria-hidden="true">
                {ICONS[i] ?? '•'}
              </div>
              <div className="factor-info">
                <div className="factor-name">{f.name}</div>
                <div
                  className="factor-bar-wrap"
                  role="img"
                  aria-label={`${pct.toFixed(0)}% of the leading factor`}
                >
                  <div className="factor-bar" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="factor-value">{f.value}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

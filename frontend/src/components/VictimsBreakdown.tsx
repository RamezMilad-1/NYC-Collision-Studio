import { useState } from 'react';
import type { VictimBreakdown } from '../types';

interface Props {
  injured?: VictimBreakdown;
  killed?: VictimBreakdown;
  isFullData: boolean;
}

type Mode = 'injured' | 'killed';

const ICON_PED = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M12 7v6m0 0-3 8m3-8 3 8m-4-12-3 4m4-4 3 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ICON_CYC = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="6" cy="17" r="3" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="18" cy="17" r="3" stroke="currentColor" strokeWidth="1.6" />
    <path d="M6 17 12 8h4m-4 0 6 9M9 7h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ICON_MOT = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3 13h18l-2-5H5l-2 5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <circle cx="7" cy="16" r="2" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="17" cy="16" r="2" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const ZERO: VictimBreakdown = { pedestrians: 0, cyclists: 0, motorists: 0 };

export function VictimsBreakdown({ injured, killed, isFullData }: Props) {
  const [mode, setMode] = useState<Mode>('injured');

  const i = injured ?? ZERO;
  const k = killed ?? ZERO;
  const active = mode === 'injured' ? i : k;
  const total = active.pedestrians + active.cyclists + active.motorists;
  const allTotal =
    i.pedestrians + i.cyclists + i.motorists + k.pedestrians + k.cyclists + k.motorists;

  const tiles = [
    { key: 'ped', label: 'Pedestrians', icon: ICON_PED, value: active.pedestrians },
    { key: 'cyc', label: 'Cyclists', icon: ICON_CYC, value: active.cyclists },
    { key: 'mot', label: 'Motorists', icon: ICON_MOT, value: active.motorists },
  ];

  const motoristsInjuredShare =
    i.pedestrians + i.cyclists + i.motorists > 0
      ? ((i.motorists / (i.pedestrians + i.cyclists + i.motorists)) * 100).toFixed(0)
      : '0';

  const pedestriansKilledShare =
    k.pedestrians + k.cyclists + k.motorists > 0
      ? ((k.pedestrians / (k.pedestrians + k.cyclists + k.motorists)) * 100).toFixed(0)
      : '0';

  return (
    <div className="card victims-card">
      <div className="card-header">
        <div>
          <h3 className="card-title">
            Who is being harmed
            <span
              className="card-pill"
              style={{ marginLeft: 10, verticalAlign: 'middle' }}
            >
              {isFullData ? 'Full dataset' : 'Filtered'}
            </span>
          </h3>
          <p className="card-sub">
            Total people {mode === 'injured' ? 'injured' : 'killed'}:{' '}
            <strong style={{ color: 'var(--text-1)' }}>{total.toLocaleString()}</strong> · all
            victims: {allTotal.toLocaleString()}
          </p>
        </div>

        <div
          className="toolbar-group"
          role="tablist"
          aria-label="Severity"
          style={{ gap: 8 }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'injured'}
            className={`btn victims-filter-btn ${mode === 'injured' ? 'btn--active' : ''}`}
            onClick={() => setMode('injured')}
          >
            Injured
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === 'killed'}
            className={`btn victims-filter-btn ${mode === 'killed' ? 'btn--active' : ''}`}
            onClick={() => setMode('killed')}
          >
            Fatalities
          </button>
        </div>
      </div>

      <div className="victims-grid">
        {tiles.map((t) => {
          const pct = total > 0 ? (t.value / total) * 100 : 0;

          return (
            <div className="victim-tile" key={t.key}>
              <div className="victim-tile-label">
                {t.icon}
                <span>{t.label}</span>
              </div>
              <div className="victim-tile-value">{t.value.toLocaleString()}</div>
              <div
                className="victim-tile-pct"
                role="img"
                aria-label={`${pct.toFixed(1)}% of victims`}
              >
                <div className="victim-tile-pct-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="victim-tile-foot">
                {pct.toFixed(1)}% of {mode === 'injured' ? 'injured' : 'fatalities'}
              </div>
            </div>
          );
        })}
      </div>

      <p className="chart-insight">
        Motorists are <strong>{motoristsInjuredShare}%</strong> of injuries, but pedestrians bear{' '}
        <strong>{pedestriansKilledShare}%</strong> of fatalities — the deadliest disparity in the
        data.
      </p>
    </div>
  );
}
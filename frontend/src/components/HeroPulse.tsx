import type { Summary } from '../types';

interface Props {
  summary: Summary;
  showingFullData: boolean;
  loading: boolean;
}

/**
 * Computes the average interval between events given a count and a span of
 * years. Returns a human-friendly "every N <unit>" string.
 */
function rhythm(count: number, years: number): { num: string; unit: string } {
  if (count <= 0 || years <= 0) return { num: '—', unit: '' };
  const seconds = (years * 365.25 * 24 * 3600) / count;
  if (seconds < 90) return { num: Math.round(seconds).toString(), unit: 'sec' };
  if (seconds < 5400) return { num: Math.round(seconds / 60).toString(), unit: 'min' };
  if (seconds < 60 * 60 * 24 * 2) return { num: Math.round(seconds / 3600).toString(), unit: 'hr' };
  return { num: Math.round(seconds / 86400).toString(), unit: 'days' };
}

export function HeroPulse({ summary, showingFullData, loading }: Props) {
  const yearly = summary.crashesByYearData ?? [];
  const years = yearly.length > 0 ? yearly.length : 14;
  const crash = rhythm(summary.totalCollisions, years);
  const injury = rhythm(summary.totalInjured, years);
  const fatality = rhythm(summary.totalKilled, years);

  const rows = [
    {
      key: 'crash',
      label: 'a crash is reported',
      num: crash.num,
      unit: crash.unit,
      tone: 'accent' as const,
    },
    {
      key: 'inj',
      label: 'someone is injured',
      num: injury.num,
      unit: injury.unit,
      tone: 'warm' as const,
    },
    {
      key: 'fat',
      label: 'a fatality occurs',
      num: fatality.num,
      unit: fatality.unit,
      tone: 'cool' as const,
    },
  ];

  return (
    <aside className="hero-pulse" aria-label="Average frequency of events">
      <div className="hero-pulse-head">
        <span className="hero-pulse-eyebrow">In NYC</span>
        <h3 className="hero-pulse-title">How often it happens</h3>
        <p className="hero-pulse-sub">
          {showingFullData
            ? 'On average, across the full dataset'
            : 'In the current filtered view'}
        </p>
      </div>
      <ul className="hero-pulse-list">
        {rows.map((r) => (
          <li key={r.key} className={`hero-pulse-row hero-pulse-row--${r.tone}`}>
            <div className="hero-pulse-row-top">
              <span className={`pulse-dot pulse-dot--${r.tone}`} aria-hidden="true" />
              <span className="hero-pulse-row-prefix">Every</span>
              <span className="hero-pulse-row-num">
                {loading ? (
                  <span className="skeleton" style={{ width: 60, height: 22, display: 'inline-block' }} />
                ) : (
                  <>
                    {r.num}
                    <span className="hero-pulse-row-unit">&nbsp;{r.unit}</span>
                  </>
                )}
              </span>
            </div>
            <div className="hero-pulse-row-label">{r.label}</div>
          </li>
        ))}
      </ul>
      <div className="hero-pulse-foot">
        Averaged across <strong>{years}</strong> {years === 1 ? 'year' : 'years'} of NYC Open Data
      </div>
    </aside>
  );
}

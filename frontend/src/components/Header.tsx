import type { Summary } from '../types';
import { CountUp } from './CountUp';
import { Skeleton } from './Skeleton';
import { HeroPulse } from './HeroPulse';

interface Props {
  summary: Summary;
  loading: boolean;
  yearsCovered: string;
  topBorough: string | null;
  peakHour: string | null;
  showingFullData: boolean;
}

export function Header({
  summary,
  loading,
  yearsCovered,
  topBorough,
  peakHour,
  showingFullData,
}: Props) {
  return (
    <section className="hero shell fade-up">
      <div
        style={{
          width: '100%',
          boxSizing: 'border-box',
          paddingInline: 'clamp(8px, 2vw, 20px)',
        }}
      >
        <div className="hero-grid">
          <div className="hero-content">
            <span className="hero-eyebrow">NYC Open Data · Motor Vehicle Collisions</span>
            <h1>
              Mapping 15 years of <span className="hl">traffic collisions across NYC.</span>.
            </h1>
            <p className="hero-sub">
              Explore more than a decade of NYC motor vehicle crashes
              by borough, hour, contributing factor, and victim type.
              Filter the dataset live, uncover high-risk patterns, and
              export a full offline report.
            </p>
            <div className="hero-meta">
              <span className={`meta-chip ${showingFullData ? 'meta-chip--accent' : ''}`}>
                {showingFullData ? 'Full dataset' : 'Filtered view'} <strong>{yearsCovered}</strong>
              </span>
              <span className="meta-chip">
                {showingFullData ? 'Crashes' : 'Crashes in view'}{' '}
                <strong>
                  {loading ? (
                    <Skeleton width={56} height={12} />
                  ) : (
                    <CountUp value={summary.totalCollisions} />
                  )}
                </strong>
              </span>
              {topBorough ? (
                <span className="meta-chip">
                  Most affected <strong>{titleCase(topBorough)}</strong>
                </span>
              ) : null}
              {peakHour ? (
                <span className="meta-chip">
                  Peak hour <strong>{peakHour}</strong>
                </span>
              ) : null}
            </div>
          </div>
          <HeroPulse summary={summary} showingFullData={showingFullData} loading={loading} />
        </div>
      </div>
    </section>
  );
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

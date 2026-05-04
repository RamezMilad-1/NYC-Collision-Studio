import type { Summary } from '../types';
import { StatsOverview } from './StatsOverview';

interface Props {
  summary: Summary;
  loading: boolean;
}

export function Header({ summary, loading }: Props) {
  return (
    <header className="hero">
      <div className="hero-inner">
        <div className="logo-wrap">
          <svg className="logo" viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <rect x="0" y="0" width="64" height="64" rx="12" fill="url(#g)" />
            <path
              d="M16 40 L28 24 L40 40"
              stroke="#061226"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <defs>
              <linearGradient id="g" x1="0" x2="1">
                <stop offset="0" stopColor="#7B61FF" />
                <stop offset="1" stopColor="#00D4FF" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="hero-text">
          <h1>NYC Collision Studio</h1>
          <p className="subtitle">
            A vibrant, interactive snapshot — explore collisions, victims, and contributing factors. (SAMPLE DATA)
          </p>
        </div>
      </div>
      <StatsOverview summary={summary} loading={loading} />
    </header>
  );
}

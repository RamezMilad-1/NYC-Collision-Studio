import type { ThemeMode } from '../hooks/useTheme';

interface Props {
  onOpenReport: () => void;
  loading: boolean;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
}

export function TopBar({ onOpenReport, loading, themeMode, onToggleTheme }: Props) {
  const isLight = themeMode === 'light';
  return (
    <header className="topbar">
      <div className="shell topbar-inner">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M3 20 L9 8 L14 14 L21 4"
                stroke="var(--on-accent-fg)"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="brand-name">NYC Collision Studio</span>
          <span className="brand-dot" aria-hidden="true" />
          <span className="brand-tag topbar-tag">Atlas · 2012–2026</span>
        </div>

        <div className="topbar-actions">
          <span className="topbar-status" aria-live="polite">
            <span className="status-dot" />
            {loading ? 'Indexing…' : 'Live sample'}
          </span>
          <a
            className="topbar-link"
            href="https://opendata.cityofnewyork.us/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Data source
          </a>
          <button
            type="button"
            className="btn btn--sm btn--ghost theme-toggle"
            onClick={onToggleTheme}
            aria-pressed={isLight}
            aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
            title={isLight ? 'Dark mode' : 'Light mode'}
          >
            {isLight ? (
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M21 14.5A8.5 8.5 0 0 1 9.5 3 8.4 8.4 0 0 0 12 21a8.5 8.5 0 0 0 9-6.5Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
          <button type="button" className="btn btn--sm btn--primary" onClick={onOpenReport}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3v12m0 0 4-4m-4 4-4-4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M5 21h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Full report
          </button>
        </div>
      </div>
    </header>
  );
}

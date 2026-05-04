interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number;
  className?: string;
}

export function Skeleton({ width = '100%', height = 16, radius = 6, className = '' }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton ${className}`.trim()}
      style={{ width, height, borderRadius: radius, display: 'inline-block' }}
    />
  );
}

export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading chart"
      style={{ width: '100%', height, padding: 8 }}
    >
      <Skeleton height={height - 16} />
      <span className="visually-hidden">Loading chart…</span>
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 8 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-live="polite" aria-label="Loading table data">
      <table className="data-table" aria-hidden="true">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}>
                <Skeleton width={70} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}>
                  <Skeleton width={Math.floor(50 + Math.random() * 50)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <span className="visually-hidden">Loading table data…</span>
    </div>
  );
}

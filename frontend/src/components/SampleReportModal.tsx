import { BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, ResponsiveContainer } from 'recharts';
import type { Summary } from '../types';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { exportElementToPDF } from '../utils/pdfExport';

interface Props {
  open: boolean;
  onClose: () => void;
  summary: Summary;
  validLocationCount: number;
}

export function SampleReportModal({ open, onClose, summary, validLocationCount }: Props) {
  const ref = useFocusTrap<HTMLDivElement>(open, onClose);
  if (!open) return null;
  return (
    <div className="report-overlay" onClick={onClose}>
      <div
        ref={ref}
        className="report-panel"
        id="report-view"
        role="dialog"
        aria-modal="true"
        aria-label="Official Collision Report"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="report-header">
          <h2>Official Collision Report</h2>
          <div className="report-actions">
            <button type="button" className="control-btn report-close" onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className="control-btn primary"
              onClick={() => exportElementToPDF('report-view', 'sample')}
            >
              Download PDF
            </button>
          </div>
        </div>

        <div className="section summary">
          <div className="stat">
            <div className="stat-label">Total Collisions</div>
            <div className="stat-value">{summary.totalCollisions}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Total Injured</div>
            <div className="stat-value">{summary.totalInjured}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Total Killed</div>
            <div className="stat-value">{summary.totalKilled}</div>
          </div>
        </div>

        <div className="section">
          <h3>Borough distribution</h3>
          <div className="chart">
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={summary.boroughs}>
                <XAxis dataKey="name" tick={{ fill: '#334155', fontSize: 12 }} />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="value" fill="#7B61FF" radius={[6, 6, 6, 6]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="section">
          <h3>Collisions by hour</h3>
          <div className="chart">
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={summary.collisionsByHourData}>
                <XAxis dataKey="hour" tick={{ fill: '#334155', fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: '#334155', fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="collisions" stroke="#00D4FF" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="section">
          <h3>Location Coverage</h3>
          <p className="paragraph">
            This report contains {validLocationCount} crash records with valid location data across NYC boroughs.
            Interactive heat map visualization available in the main dashboard for detailed geographic analysis.
          </p>
        </div>

        <div className="section">
          <h3>Report summary</h3>
          <p className="paragraph">
            This report summarises the currently loaded collision dataset. Totals reflect the filtered view at the
            time of generation. Review borough distribution, hourly patterns, and location heat map above for
            operational planning and prioritization.
          </p>
        </div>
      </div>
    </div>
  );
}

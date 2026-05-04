import { BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, ResponsiveContainer } from 'recharts';
import type { FullDataReport } from '../types';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { exportElementToPDF } from '../utils/pdfExport';

interface Props {
  open: boolean;
  report: FullDataReport;
  onClose: () => void;
}

export function FullDataReportModal({ open, report, onClose }: Props) {
  const ref = useFocusTrap<HTMLDivElement>(open, onClose);
  if (!open) return null;
  return (
    <div className="report-overlay" onClick={onClose}>
      <div
        ref={ref}
        className="report-panel"
        id="full-report-view"
        role="dialog"
        aria-modal="true"
        aria-label="Complete Dataset Report"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="report-header">
          <h2>Complete Dataset Report</h2>
          <div className="report-actions">
            <button type="button" className="control-btn report-close" onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className="control-btn primary"
              onClick={() => exportElementToPDF('full-report-view', 'full')}
            >
              Download PDF
            </button>
          </div>
        </div>

        <div className="section summary">
          <div className="stat">
            <div className="stat-label">Total Collisions</div>
            <div className="stat-value">{report.totalCollisions.toLocaleString()}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Total Injured</div>
            <div className="stat-value">{report.totalInjured.toLocaleString()}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Total Killed</div>
            <div className="stat-value">{report.totalKilled.toLocaleString()}</div>
          </div>
        </div>

        <div className="section">
          <h3>Crashes by Borough</h3>
          <div className="chart">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={report.boroughs}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#334155', fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fill: '#334155', fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Crashes']} />
                <Bar dataKey="value" fill="#7B61FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="section">
          <h3>Crashes by Hour of Day</h3>
          <div className="chart">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={report.collisionsByHourData}>
                <XAxis dataKey="hour" tick={{ fill: '#334155', fontSize: 12 }} />
                <YAxis tick={{ fill: '#334155', fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Crashes']} />
                <Line
                  type="monotone"
                  dataKey="collisions"
                  stroke="#00D4FF"
                  strokeWidth={3}
                  dot={{ fill: '#00D4FF', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="section">
          <h3>Injuries and Fatalities by Type</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <h4 style={{ textAlign: 'center', color: '#334155', marginBottom: 10, fontSize: 14 }}>
                Injuries
              </h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={report.injuryFatalityData.filter((i) => i.category === 'Injuries')}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis
                    dataKey="type"
                    tick={{ fill: '#334155', fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fill: '#334155', fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Injuries']} />
                  <Bar dataKey="count" fill="#FFD166" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h4 style={{ textAlign: 'center', color: '#334155', marginBottom: 10, fontSize: 14 }}>
                Fatalities
              </h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={report.injuryFatalityData.filter((i) => i.category === 'Fatalities')}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis
                    dataKey="type"
                    tick={{ fill: '#334155', fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fill: '#334155', fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Fatalities']} />
                  <Bar dataKey="count" fill="#FF6B6B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="section">
          <h3>Top 10 Contributing Factors</h3>
          <div className="chart">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={report.topFactors} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <XAxis
                  dataKey="factor"
                  tick={{ fill: '#334155', fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fill: '#334155', fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Crashes']} />
                <Bar dataKey="count" fill="#4ECDC4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="section">
          <h3>Crashes by Year</h3>
          <div className="chart">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={report.crashesByYearData}>
                <XAxis dataKey="year" tick={{ fill: '#334155', fontSize: 12 }} />
                <YAxis tick={{ fill: '#334155', fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Crashes']} />
                <Line
                  type="monotone"
                  dataKey="crashes"
                  stroke="#FF6B6B"
                  strokeWidth={3}
                  dot={{ fill: '#FF6B6B', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="section">
          <h3>Report Summary</h3>
          <p className="paragraph">
            This comprehensive data report analyzes the complete NYC collision dataset, providing insights into
            crash patterns, contributing factors, and temporal trends. The data covers{' '}
            {report.totalCollisions.toLocaleString()} collision records across all five boroughs, with detailed
            breakdowns by time, location, and severity.
          </p>
          <p className="paragraph">
            Key findings include peak crash hours, borough-specific patterns, and the most common contributing
            factors leading to collisions. This analysis helps identify high-risk periods and areas for targeted
            safety interventions.
          </p>
          <p className="paragraph">
            The dataset used in this report is derived from the original publicly available NYC Open Data sources.
            The data remains consistent with the original records.
          </p>
          <p className="paragraph">
            <strong>Original Data Sources:</strong>
            <br />
            Motor Vehicle Collisions – Crashes:{' '}
            <a
              href="https://data.cityofnewyork.us/Public-Safety/Motor-Vehicle-Collisions-Crashes/h9gi-nx95"
              target="_blank"
              rel="noopener noreferrer"
            >
              View Dataset
            </a>
            <br />
            Motor Vehicle Collisions – Persons:{' '}
            <a
              href="https://data.cityofnewyork.us/Public-Safety/Motor-Vehicle-Collisions-Person/f55k-p6yu"
              target="_blank"
              rel="noopener noreferrer"
            >
              View Dataset
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

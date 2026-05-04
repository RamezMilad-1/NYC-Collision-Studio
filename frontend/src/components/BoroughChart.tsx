import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { NameValue } from '../types';
import { formatBoroughAxisCompact, formatBoroughAxisLabel } from '../utils/formatters';

interface Props {
  data: NameValue[];
  viewportWidth: number;
}

export function BoroughChart({ data, viewportWidth }: Props) {
  const isNarrow = viewportWidth < 600;
  return (
    <div className="panel-card chart-small">
      <h4 className="panel-title">Borough Distribution crashes</h4>
      <div className="chart-container chart-container--borough">
        <ResponsiveContainer width="100%" height={isNarrow ? 195 : 218}>
          <BarChart data={data} margin={{ top: 6, right: 2, left: 2, bottom: 4 }}>
            <XAxis
              dataKey="name"
              interval={0}
              angle={isNarrow ? 0 : -32}
              textAnchor={isNarrow ? 'middle' : 'end'}
              height={isNarrow ? 36 : 62}
              tick={{ fill: '#9aa4b2', fontSize: isNarrow ? 9 : 10 }}
              tickFormatter={isNarrow ? formatBoroughAxisCompact : formatBoroughAxisLabel}
            />
            <YAxis hide />
            <Tooltip />
            <defs>
              <linearGradient id="boroughGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#8A63FF" />
                <stop offset="100%" stopColor="#5A3CE0" />
              </linearGradient>
            </defs>
            <Bar dataKey="value" fill="url(#boroughGradient)" radius={[6, 6, 6, 6]} barSize={15} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

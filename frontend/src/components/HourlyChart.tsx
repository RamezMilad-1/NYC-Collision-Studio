import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { HourBucket } from '../types';

interface Props {
  data: HourBucket[];
}

export function HourlyChart({ data }: Props) {
  return (
    <div className="panel-card chart-small">
      <h4 className="panel-title">Collisions by Hour</h4>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <XAxis dataKey="hour" tick={{ fill: '#9aa4b2', fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fill: '#9aa4b2', fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="collisions" stroke="#ff61c0ff" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

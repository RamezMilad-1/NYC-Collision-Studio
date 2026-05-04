import type { Filters } from '../types';
import { filtersActive } from '../utils/filterUtils';

interface Props {
  graphFilters: Filters;
  onOpenGraphFilter: () => void;
  onToggleGraphInjured: () => void;
  onToggleGraphKilled: () => void;
  onGenerateFullReport: () => void;
  generatingFullReport: boolean;
}

export function ControlsCard({
  graphFilters,
  onOpenGraphFilter,
  onToggleGraphInjured,
  onToggleGraphKilled,
  onGenerateFullReport,
  generatingFullReport,
}: Props) {
  const active = filtersActive(graphFilters);
  return (
    <div
      className="panel-card"
      style={{
        padding: '10px',
        marginBottom: '4px',
        background: 'linear-gradient(145deg, rgba(123, 97, 255, 0.08), rgba(0, 212, 255, 0.04))',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 12px 40px rgba(2,6,23,0.6)',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', alignItems: 'start' }}>
        <div>
          <h4
            style={{
              margin: '0 0 12px 0',
              fontSize: '15px',
              fontWeight: 500,
              color: '#dbeafe',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              paddingBottom: '6px',
            }}
          >
            Data Filtering
          </h4>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'rgba(219, 234, 254, 0.6)', lineHeight: 1.4 }}>
            Narrow down the dataset to focus on specific criteria
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              className={active ? 'control-btn active' : 'control-btn'}
              onClick={onOpenGraphFilter}
              style={{ fontSize: '14px', padding: '12px 16px', minHeight: 'auto', lineHeight: 1.4, justifyContent: 'flex-start' }}
            >
              Advanced Filters
            </button>
            <button
              type="button"
              className={graphFilters.injuredOnly ? 'control-btn active' : 'control-btn'}
              aria-pressed={graphFilters.injuredOnly}
              onClick={onToggleGraphInjured}
              style={{ fontSize: '14px', padding: '12px 16px', minHeight: 'auto', lineHeight: 1.4, justifyContent: 'flex-start' }}
            >
              Show Injuries Only
            </button>
            <button
              type="button"
              className={graphFilters.killedOnly ? 'control-btn active' : 'control-btn'}
              aria-pressed={graphFilters.killedOnly}
              onClick={onToggleGraphKilled}
              style={{ fontSize: '14px', padding: '12px 16px', minHeight: 'auto', lineHeight: 1.4, justifyContent: 'flex-start' }}
            >
              Show Fatalities Only
            </button>
          </div>
        </div>

        <div>
          <h4
            style={{
              margin: '0 0 12px 0',
              fontSize: '15px',
              fontWeight: 500,
              color: '#dbeafe',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              paddingBottom: '6px',
            }}
          >
            Report Generation
          </h4>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'rgba(219, 234, 254, 0.6)', lineHeight: 1.4 }}>
            Create detailed PDF reports from the complete dataset
          </p>
          <button
            type="button"
            className="control-btn primary"
            onClick={onGenerateFullReport}
            disabled={generatingFullReport}
            aria-busy={generatingFullReport}
            style={{ fontSize: '14px', padding: '14px 20px', minHeight: 'auto', lineHeight: 1.4, width: '100%', fontWeight: 500 }}
          >
            {generatingFullReport ? 'Generating Report...' : 'Generate and download the Complete Dataset Report'}
          </button>
        </div>
      </div>
    </div>
  );
}

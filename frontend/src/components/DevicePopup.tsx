import { useFocusTrap } from '../hooks/useFocusTrap';

interface Props {
  step: number;
  onDismiss: () => void;
}

export function DevicePopup({ step, onDismiss }: Props) {
  const ref = useFocusTrap<HTMLDivElement>(step > 0, onDismiss);
  if (step <= 0) return null;
  return (
    <div className="device-popup-overlay" onClick={onDismiss}>
      <div
        ref={ref}
        className="device-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="device-popup-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="device-popup-header">
          <span className="device-icon" aria-hidden="true">
            {step === 1 ? '🖥️' : '📊'}
          </span>
          <button
            type="button"
            className="device-popup-close"
            onClick={onDismiss}
            aria-label="Close popup"
          >
            ×
          </button>
        </div>
        <div className="device-popup-content">
          {step === 1 ? (
            <>
              <h3 id="device-popup-title">Best on a bigger screen</h3>
              <p>
                NYC Collision Studio is designed for laptops and desktops — multi-column charts and
                data tables breathe better with more room.
              </p>
              <p style={{ fontSize: 12.5, color: 'var(--text-4)' }}>
                On mobile, try rotating to landscape for the data table.
              </p>
            </>
          ) : (
            <>
              <h3 id="device-popup-title">Sample data notice</h3>
              <p>
                The interactive dashboard uses a representative sample for performance. For
                complete dataset analysis, click <strong>Full report</strong> in the top bar.
              </p>
            </>
          )}
          <div className="device-popup-actions">
            <button type="button" className="btn btn--primary" onClick={onDismiss}>
              {step === 1 ? 'Continue' : 'Got it'}
            </button>
          </div>
          <div className="popup-step-indicator">Step {step} of 2</div>
        </div>
      </div>
    </div>
  );
}

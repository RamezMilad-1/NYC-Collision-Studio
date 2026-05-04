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
          <div className="device-icon" aria-hidden="true">💻</div>
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
              <h3 id="device-popup-title">Best Experience on Desktop</h3>
              <p>For the optimal viewing experience of NYC Collision Studio, we recommend using a laptop, desktop, or tablet.</p>
              <p>If you're on a phone, try rotating to landscape orientation for better data visualization.</p>
              <div className="popup-step-indicator">1/2</div>
            </>
          ) : (
            <>
              <h3 id="device-popup-title">Data Sample Notice</h3>
              <p>This snapshot displays only a sample of the collision data for demonstration purposes.</p>
              <p>For the complete dataset and full analysis, please use the "Generate and download the Complete Dataset Report" button.</p>
              <div className="popup-step-indicator">2/2</div>
            </>
          )}
          <div className="device-popup-actions">
            <button type="button" className="control-btn primary" onClick={onDismiss}>
              {step === 1 ? 'Got it!' : 'done'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

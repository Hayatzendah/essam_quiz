import { useState } from 'react';
import './StateSelectionModal.css';

const GERMAN_STATES = [
  'Baden-Württemberg',
  'Bayern',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen',
  'Nordrhein-Westfalen',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thüringen',
];

function StateSelectionModal({ onSelect, onClose }) {
  const [selectedState, setSelectedState] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedState) {
      setError('الرجاء اختيار ولاية');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSelect(selectedState);
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        'حدث خطأ أثناء حفظ الولاية'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>اختر ولايتك</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          <p className="modal-description">
            ⚠️ اختر ولايتك لعرض الأسئلة الخاصة بها في امتحان Leben in Deutschland
          </p>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="state">الولاية *</label>
              <select
                id="state"
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  setError('');
                }}
                required
                className="state-select"
              >
                <option value="">-- اختر الولاية --</option>
                {GERMAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="modal-actions">
              <button
                type="button"
                onClick={onClose}
                className="cancel-btn"
                disabled={loading}
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="submit-btn"
                disabled={loading || !selectedState}
              >
                {loading ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default StateSelectionModal;




















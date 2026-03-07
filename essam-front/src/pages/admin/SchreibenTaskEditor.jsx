import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getSchreibenTask,
  createSchreibenTask,
  updateSchreibenTask,
  linkSchreibenExam,
  unlinkSchreibenExam,
  updateFieldCorrectAnswer,
  uploadImage
} from '../../services/api';
import { useLevels } from '../../hooks/useLevels';

const SimpleHtmlEditor = lazy(() => import('../../components/SimpleHtmlEditor'));

// Field Types for form blocks
const FIELD_TYPES = [
  { value: 'text_input', label: 'حقل نصي' },
  { value: 'prefilled', label: 'نص معبأ مسبقاً' },
  { value: 'select', label: 'قائمة منسدلة' },
  { value: 'multiselect', label: 'اختيار متعدد' },
];

// Generate unique block ID
const generateBlockId = () => `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ألوان جاهزة للفقرة والبطاقات (مثل باقي المحررات)
const PARAGRAPH_COLORS = [
  { value: '', label: 'أصفر', bg: '#fefce8', border: '#fde68a' },
  { value: '#ffffff', label: 'أبيض', bg: '#ffffff', border: '#d1d5db' },
  { value: '#f0fdf4', label: 'أخضر', bg: '#f0fdf4', border: '#bbf7d0' },
  { value: '#eff6ff', label: 'أزرق', bg: '#eff6ff', border: '#bfdbfe' },
  { value: '#fef2f2', label: 'أحمر', bg: '#fef2f2', border: '#fecaca' },
  { value: '#faf5ff', label: 'بنفسجي', bg: '#faf5ff', border: '#e9d5ff' },
  { value: '#f5f5f5', label: 'رمادي', bg: '#f5f5f5', border: '#d4d4d4' },
];
const CARD_COLORS = [
  { key: 'sky', label: 'أزرق فاتح', bg: '#f0f9ff', border: '#bae6fd', text: '#0c4a6e' },
  { key: 'emerald', label: 'أخضر', bg: '#ecfdf5', border: '#a7f3d0', text: '#064e3b' },
  { key: 'violet', label: 'بنفسجي', bg: '#f5f3ff', border: '#c4b5fd', text: '#4c1d95' },
  { key: 'rose', label: 'وردي', bg: '#fff1f2', border: '#fecdd3', text: '#881337' },
  { key: 'amber', label: 'ذهبي', bg: '#fffbeb', border: '#fde68a', text: '#78350f' },
  { key: 'orange', label: 'برتقالي', bg: '#fff7ed', border: '#fed7aa', text: '#7c2d12' },
  { key: 'indigo', label: 'نيلي', bg: '#eef2ff', border: '#c7d2fe', text: '#3730a3' },
  { key: 'gray', label: 'رمادي', bg: '#f3f4f6', border: '#d1d5db', text: '#374151' },
];

// Block type component for Text (محرر وورد + لون الفقرة)
const TextBlockEditor = ({ block, onChange, onRemove }) => {
  const bgColor = block.data?.bgColor ?? '';
  const textColor = block.data?.textColor ?? '';
  const resolvedBg = bgColor || '#f8fafc';
  const resolvedBorder = PARAGRAPH_COLORS.find(c => c.value === bgColor)?.border || '#e2e8f0';
  return (
    <div style={{
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontWeight: '600', color: '#475569' }}>📝 كتلة نصية</span>
        <button type="button" onClick={onRemove} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
          حذف
        </button>
      </div>
      <label style={{ fontSize: 12, color: '#64748b', marginBottom: 6, display: 'block' }}>لون الخلفية:</label>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
        {PARAGRAPH_COLORS.map((c) => (
          <button key={c.value || 'default'} type="button" title={c.label}
            onClick={() => onChange({ ...block, data: { ...block.data, bgColor: c.value } })}
            style={{
              width: 22, height: 22, borderRadius: '50%', border: `2px solid ${bgColor === c.value ? '#3b82f6' : c.border}`,
              backgroundColor: c.bg, cursor: 'pointer', boxShadow: bgColor === c.value ? '0 0 0 2px #93c5fd' : 'none',
            }}
          />
        ))}
        <input type="color" value={bgColor || '#fefce8'} onChange={(e) => onChange({ ...block, data: { ...block.data, bgColor: e.target.value } })}
          title="لون مخصص" style={{ width: 22, height: 22, border: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%' }} />
      </div>
      <Suspense fallback={<div style={{ minHeight: 100, padding: 12, border: '1px solid #e2e8f0', borderRadius: 6 }}>جاري التحميل...</div>}>
        <div style={{ backgroundColor: resolvedBg, border: `1px solid ${resolvedBorder}`, borderRadius: 8, padding: 12 }}>
          <SimpleHtmlEditor
            value={block.data?.content || ''}
            onChange={(html) => onChange({ ...block, data: { ...block.data, content: html || '' } })}
            placeholder="أدخل النص هنا..."
            dir="ltr"
          />
        </div>
      </Suspense>
    </div>
  );
};

// Block type component for Image
const ImageBlockEditor = ({ block, onChange, onRemove }) => (
  <div style={{
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
      <span style={{ fontWeight: '600', color: '#166534' }}>🖼️ كتلة صورة</span>
      <button
        type="button"
        onClick={onRemove}
        style={{
          background: '#fee2e2',
          color: '#dc2626',
          border: 'none',
          padding: '4px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '13px',
        }}
      >
        حذف
      </button>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <input
        type="text"
        value={block.data?.src || ''}
        onChange={(e) => onChange({ ...block, data: { ...block.data, src: e.target.value } })}
        placeholder="رابط الصورة (URL)"
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '14px',
        }}
      />
      <input
        type="text"
        value={block.data?.alt || ''}
        onChange={(e) => onChange({ ...block, data: { ...block.data, alt: e.target.value } })}
        placeholder="النص البديل للصورة (Alt text)"
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '14px',
        }}
      />
      <input
        type="text"
        value={block.data?.caption || ''}
        onChange={(e) => onChange({ ...block, data: { ...block.data, caption: e.target.value } })}
        placeholder="وصف الصورة (اختياري)"
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '14px',
        }}
      />
      {block.data?.src && (
        <img
          src={block.data.src}
          alt={block.data.alt || 'Preview'}
          style={{ maxWidth: '300px', borderRadius: '8px', marginTop: '8px' }}
          onError={(e) => e.target.style.display = 'none'}
        />
      )}
    </div>
  </div>
);

// Single field editor within a form block
const FieldEditor = ({ field, onChange, onRemove, taskId, isEditing }) => {
  const [savingAnswer, setSavingAnswer] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  const handleFieldChange = (key, value) => {
    onChange({ ...field, [key]: value });
    setSaveSuccess('');
  };


  const handleSaveCorrectAnswer = async () => {
    const fieldId = field._id || field.id || field.fieldId;
    if (!fieldId || !taskId) return;

    try {
      setSavingAnswer(true);
      setSaveSuccess('');

      let body;
      if (field.type === 'text_input') {
        body = { value: field.value || '' };
      } else if (field.type === 'select' || field.type === 'multiselect') {
        body = { correctAnswers: field.correctAnswers || [] };
      } else {
        return;
      }

      await updateFieldCorrectAnswer(taskId, fieldId, body);
      setSaveSuccess('تم الحفظ');
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving correct answer:', err);
      setSaveSuccess('خطأ في الحفظ');
      setTimeout(() => setSaveSuccess(''), 3000);
    } finally {
      setSavingAnswer(false);
    }
  };

  const fieldId = field._id || field.id || field.fieldId;
  const canSave = isEditing && fieldId && (field.type === 'text_input' || field.type === 'select' || field.type === 'multiselect');

  return (
    <div style={{
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '6px',
      padding: '12px',
      marginBottom: '8px',
    }}>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={field.label || ''}
          onChange={(e) => handleFieldChange('label', e.target.value)}
          placeholder="تسمية الحقل"
          style={{
            flex: '1',
            minWidth: '150px',
            padding: '8px 10px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '13px',
          }}
        />
        <select
          value={field.type || 'text_input'}
          onChange={(e) => handleFieldChange('type', e.target.value)}
          style={{
            padding: '8px 10px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '13px',
            minWidth: '140px',
          }}
        >
          {FIELD_TYPES.map(ft => (
            <option key={ft.value} value={ft.value}>{ft.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={onRemove}
          style={{
            background: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #fecaca',
            padding: '8px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Additional fields based on type */}
      {field.type === 'prefilled' && (
        <input
          type="text"
          value={field.value || ''}
          onChange={(e) => handleFieldChange('value', e.target.value)}
          placeholder="القيمة المعبأة مسبقاً"
          style={{
            width: '100%',
            padding: '8px 10px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '13px',
            marginTop: '8px',
          }}
        />
      )}

      {(field.type === 'select' || field.type === 'multiselect') && (() => {
        // Track correct answers by INDEX to avoid issues with empty/duplicate text
        const options = field.options || [];
        const correctAnswers = field.correctAnswers || [];
        const correctIndices = new Set();
        const remaining = [...correctAnswers];
        options.forEach((opt, i) => {
          const idx = remaining.indexOf(opt);
          if (idx !== -1) {
            correctIndices.add(i);
            remaining.splice(idx, 1);
          }
        });

        const rebuildCorrectAnswers = (newIndices, opts) => {
          return [...newIndices].sort((a, b) => a - b).map(idx => opts[idx]).filter(v => v !== undefined);
        };

        return (
        <div style={{ marginTop: '8px' }}>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px', fontWeight: '600' }}>
            الخيارات {field.type === 'multiselect' ? '(اختر الإجابات الصحيحة)' : '(اختر الإجابة الصحيحة)'}:
          </p>
          {options.map((opt, i) => {
            const isCorrect = correctIndices.has(i);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <input
                  type={field.type === 'multiselect' ? 'checkbox' : 'radio'}
                  name={`correct-${fieldId || field.label || 'field'}`}
                  checked={isCorrect}
                  onChange={() => {
                    const newIndices = new Set(correctIndices);
                    if (field.type === 'multiselect') {
                      if (isCorrect) newIndices.delete(i); else newIndices.add(i);
                    } else {
                      newIndices.clear();
                      newIndices.add(i);
                    }
                    handleFieldChange('correctAnswers', rebuildCorrectAnswers(newIndices, options));
                  }}
                  title="إجابة صحيحة"
                  style={{ cursor: 'pointer', accentColor: '#10b981' }}
                />
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const newOptions = [...options];
                    newOptions[i] = e.target.value;
                    // Rebuild correctAnswers with same indices but updated text
                    const newCorrect = rebuildCorrectAnswers(correctIndices, newOptions);
                    onChange({ ...field, options: newOptions, correctAnswers: newCorrect });
                  }}
                  placeholder={`خيار ${i + 1}`}
                  style={{
                    flex: '1',
                    padding: '7px 10px',
                    border: isCorrect ? '1px solid #10b981' : '1px solid #d1d5db',
                    background: isCorrect ? '#f0fdf4' : 'white',
                    borderRadius: '4px',
                    fontSize: '13px',
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const newOptions = options.filter((_, idx) => idx !== i);
                    // Rebuild indices: shift down indices after removed one
                    const newIndices = new Set();
                    correctIndices.forEach(ci => {
                      if (ci < i) newIndices.add(ci);
                      else if (ci > i) newIndices.add(ci - 1);
                      // ci === i is removed
                    });
                    onChange({ ...field, options: newOptions, correctAnswers: rebuildCorrectAnswers(newIndices, newOptions) });
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '4px',
                  }}
                  title="حذف الخيار"
                >
                  ✕
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => {
              const newOptions = [...(field.options || []), ''];
              handleFieldChange('options', newOptions);
            }}
            style={{
              padding: '6px 14px',
              background: '#f8fafc',
              color: '#3b82f6',
              border: '1px dashed #93c5fd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              marginTop: '4px',
            }}
          >
            + إضافة خيار
          </button>
          {canSave && (field.options || []).length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={handleSaveCorrectAnswer}
                disabled={savingAnswer}
                style={{
                  padding: '6px 14px',
                  background: savingAnswer ? '#d1d5db' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: savingAnswer ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                }}
              >
                {savingAnswer ? '...' : 'حفظ الإجابة'}
              </button>
              {saveSuccess && (
                <span style={{
                  fontSize: '12px',
                  color: saveSuccess === 'تم الحفظ' ? '#10b981' : '#ef4444',
                  fontWeight: '600',
                }}>
                  {saveSuccess}
                </span>
              )}
            </div>
          )}
        </div>
        );
      })()}

      {field.type === 'text_input' && (
        <>
          <input
            type="text"
            value={field.placeholder || ''}
            onChange={(e) => handleFieldChange('placeholder', e.target.value)}
            placeholder="نص التلميح (Placeholder)"
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '13px',
              marginTop: '8px',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
            <input
              type="text"
              value={field.value || ''}
              onChange={(e) => handleFieldChange('value', e.target.value)}
              placeholder="الإجابة الصحيحة"
              style={{
                flex: '1',
                padding: '8px 10px',
                border: '1px solid #10b981',
                borderRadius: '4px',
                fontSize: '13px',
                background: '#f0fdf4',
              }}
            />
            {canSave && (
              <button
                type="button"
                onClick={handleSaveCorrectAnswer}
                disabled={savingAnswer}
                style={{
                  padding: '8px 14px',
                  background: savingAnswer ? '#d1d5db' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: savingAnswer ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  fontWeight: '600',
                }}
              >
                {savingAnswer ? '...' : 'حفظ'}
              </button>
            )}
            {saveSuccess && (
              <span style={{
                fontSize: '12px',
                color: saveSuccess === 'تم الحفظ' ? '#10b981' : '#ef4444',
                fontWeight: '600',
                whiteSpace: 'nowrap',
              }}>
                {saveSuccess}
              </span>
            )}
          </div>
        </>
      )}

    </div>
  );
};

// Block type component for Cards (بطاقات + لون كل بطاقة + محرر عنوان)
const CardsBlockEditor = ({ block, onChange, onRemove }) => {
  const cards = block.data?.cards || [];
  const cardsLayout = block.data?.cardsLayout || 'vertical';

  const addCard = () => {
    onChange({
      ...block,
      data: {
        ...block.data,
        cards: [...cards, { title: '', content: '', color: CARD_COLORS[cards.length % CARD_COLORS.length].key }],
        cardsLayout,
      },
    });
  };

  const updateCard = (index, field, value) => {
    const newCards = cards.map((c, i) => (i === index ? { ...c, [field]: value } : c));
    onChange({ ...block, data: { ...block.data, cards: newCards, cardsLayout } });
  };

  const removeCard = (index) => {
    const newCards = cards.filter((_, i) => i !== index);
    onChange({ ...block, data: { ...block.data, cards: newCards, cardsLayout } });
  };

  const setLayout = (layout) => {
    onChange({ ...block, data: { ...block.data, cards, cardsLayout: layout } });
  };

  return (
    <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontWeight: '600', color: '#92400e' }}>📋 بطاقات</span>
        <button type="button" onClick={onRemove} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>حذف</button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button type="button" onClick={() => setLayout('horizontal')}
          style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer', backgroundColor: cardsLayout === 'horizontal' ? '#eab308' : '#fef9c3', color: cardsLayout === 'horizontal' ? '#fff' : '#854d0e' }}>أفقي</button>
        <button type="button" onClick={() => setLayout('vertical')}
          style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer', backgroundColor: cardsLayout === 'vertical' ? '#eab308' : '#fef9c3', color: cardsLayout === 'vertical' ? '#fff' : '#854d0e' }}>عمودي</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: cardsLayout === 'horizontal' ? '1fr' : 'repeat(3, 1fr)', gap: 10 }}>
        {cards.map((card, idx) => {
          const selColor = CARD_COLORS.find(c => c.key === (card.color || '')) || CARD_COLORS[idx % CARD_COLORS.length];
          return (
            <div key={idx} style={{ padding: 12, backgroundColor: selColor.bg, border: `2px solid ${selColor.border}`, borderRadius: 8 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                {CARD_COLORS.map(c => (
                  <button key={c.key} type="button" title={c.label} onClick={() => updateCard(idx, 'color', c.key)}
                    style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: c.bg, border: `2px solid ${card.color === c.key ? c.text : c.border}`, cursor: 'pointer', boxShadow: card.color === c.key ? `0 0 0 2px ${c.border}` : 'none' }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 11, color: selColor.text, fontWeight: 600 }}>عنوان البطاقة (محرر وورد)</span>
                  <Suspense fallback={<input type="text" placeholder="عنوان..." style={{ width: '100%', padding: 6, marginTop: 4 }} />}>
                    <SimpleHtmlEditor value={card.title || ''} onChange={(html) => updateCard(idx, 'title', html || '')} placeholder="عنوان البطاقة..." dir="ltr" />
                  </Suspense>
                </div>
                <button type="button" onClick={() => removeCard(idx)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>حذف</button>
              </div>
              <Suspense fallback={<textarea rows={2} style={{ width: '100%', padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }} />}>
                <SimpleHtmlEditor value={card.content || ''} onChange={(html) => updateCard(idx, 'content', html || '')} placeholder="محتوى البطاقة..." dir="ltr" />
              </Suspense>
            </div>
          );
        })}
      </div>
      <button type="button" onClick={addCard} style={{ width: '100%', padding: '10px', background: '#fef9c3', color: '#854d0e', border: '1px dashed #eab308', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500, marginTop: 8 }}>
        + بطاقة جديدة
      </button>
    </div>
  );
};

// Block type component for Form
const FormBlockEditor = ({ block, onChange, onRemove, taskId, isEditing }) => {
  const fields = block.data?.fields || [];

  const addField = () => {
    onChange({
      ...block,
      data: {
        ...block.data,
        fields: [...fields, { type: 'text_input', label: '', placeholder: '' }]
      }
    });
  };

  const updateField = (index, updatedField) => {
    const newFields = [...fields];
    newFields[index] = updatedField;
    onChange({ ...block, data: { ...block.data, fields: newFields } });
  };

  const removeField = (index) => {
    const newFields = fields.filter((_, i) => i !== index);
    onChange({ ...block, data: { ...block.data, fields: newFields } });
  };

  return (
    <div style={{
      background: '#eff6ff',
      border: '1px solid #bfdbfe',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontWeight: '600', color: '#1e40af' }}>📋 كتلة نموذج</span>
        <button
          type="button"
          onClick={onRemove}
          style={{
            background: '#fee2e2',
            color: '#dc2626',
            border: 'none',
            padding: '4px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          حذف
        </button>
      </div>

      {/* Form title - محرر وورد */}
      <div style={{ marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>عنوان النموذج (اختياري)</span>
        <Suspense fallback={<input type="text" placeholder="عنوان النموذج..." style={{ width: '100%', padding: 10, marginTop: 4, border: '1px solid #d1d5db', borderRadius: 6 }} />}>
          <SimpleHtmlEditor
            value={block.data?.title || ''}
            onChange={(html) => onChange({ ...block, data: { ...block.data, title: html || '' } })}
            placeholder="عنوان النموذج..."
            dir="ltr"
          />
        </Suspense>
      </div>

      {/* Fields */}
      <div style={{ marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>الحقول:</p>
        {fields.map((field, index) => (
          <FieldEditor
            key={index}
            field={field}
            onChange={(updated) => updateField(index, updated)}
            onRemove={() => removeField(index)}
            taskId={taskId}
            isEditing={isEditing}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={addField}
        style={{
          width: '100%',
          padding: '10px',
          background: '#dbeafe',
          color: '#1d4ed8',
          border: '1px dashed #93c5fd',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500',
        }}
      >
        + إضافة حقل
      </button>
    </div>
  );
};

function SchreibenTaskEditor({ embedded, initialExamId, onSuccess, onCancel }) {
  const navigate = useNavigate();
  const { taskId: taskIdParam } = useParams();
  const taskId = embedded ? null : taskIdParam;
  const isEditing = Boolean(taskId) && taskId !== 'new';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState('B1');
  const [provider, setProvider] = useState('goethe');
  const [status, setStatus] = useState('draft');
  const [instructions, setInstructions] = useState('');
  const [instructionsBgColor, setInstructionsBgColor] = useState('');
  const [instructionsTextColor, setInstructionsTextColor] = useState('');
  const [contentBlocks, setContentBlocks] = useState([]);

  // Exam linking state
  const [linkedExamId, setLinkedExamId] = useState('');
  const [examIdInput, setExamIdInput] = useState('');
  const [linkingExam, setLinkingExam] = useState(false);

  // Image upload
  const imageInputRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const { levelNames: levels } = useLevels();
  const providers = [
    { value: 'goethe', label: 'Goethe' },
    { value: 'telc', label: 'TELC' },
    { value: 'oesd', label: 'ÖSD' },
    { value: 'ecl', label: 'ECL' },
    { value: 'dtb', label: 'DTB' },
    { value: 'dtz', label: 'DTZ' },
  ];
  const statuses = [
    { value: 'draft', label: 'مسودة' },
    { value: 'published', label: 'منشور' },
    { value: 'archived', label: 'مؤرشف' },
  ];

  // Load task if editing
  useEffect(() => {
    if (isEditing) {
      loadTask();
    }
  }, [taskId]);

  const loadTask = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getSchreibenTask(taskId);
      const task = data.task || data;

      setTitle(task.title || '');
      setLevel(task.level || 'B1');
      setProvider(task.provider || 'goethe');
      setStatus(task.status || 'draft');
      setInstructions(task.instructions || '');
      setInstructionsBgColor(task.instructionsBgColor || '');
      setInstructionsTextColor(task.instructionsTextColor || '');

      // Parse contentBlocks data from JSON strings to objects for editing
      const blocks = (task.contentBlocks || []).map(block => ({
        id: block.id || generateBlockId(),
        type: block.type,
        data: typeof block.data === 'string' ? JSON.parse(block.data) : (block.data || {})
      }));
      setContentBlocks(blocks);

      setLinkedExamId(task.examId || '');
      setExamIdInput(task.examId || '');
    } catch (err) {
      console.error('Error loading task:', err);
      setError('حدث خطأ أثناء تحميل المهمة');
    } finally {
      setLoading(false);
    }
  };

  // Add block
  const addBlock = (type) => {
    const newBlock = {
      id: generateBlockId(),
      type,
      data: {}
    };
    if (type === 'text') {
      newBlock.data = { content: '' };
    } else if (type === 'form') {
      newBlock.data = { title: '', fields: [] };
    } else if (type === 'image') {
      newBlock.data = { src: '', alt: '', caption: '' };
    } else if (type === 'cards') {
      newBlock.data = { cards: [], cardsLayout: 'vertical' };
    }
    setContentBlocks([...contentBlocks, newBlock]);
  };

  // Update block
  const updateBlock = (index, updatedBlock) => {
    const newBlocks = [...contentBlocks];
    newBlocks[index] = updatedBlock;
    setContentBlocks(newBlocks);
  };

  // Remove block
  const removeBlock = (index) => {
    setContentBlocks(contentBlocks.filter((_, i) => i !== index));
  };

  // Move block
  const moveBlock = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= contentBlocks.length) return;

    const newBlocks = [...contentBlocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    setContentBlocks(newBlocks);
  };

  // Upload image and add as content block
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      setError('');
      const data = await uploadImage(file);
      const src = data.url || data.path || data.src;
      if (!src) throw new Error('لم يتم إرجاع رابط الصورة');

      const newBlock = {
        id: generateBlockId(),
        type: 'image',
        data: { src, alt: '', caption: '' },
      };
      setContentBlocks(prev => [...prev, newBlock]);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError(err.response?.data?.message || err.message || 'حدث خطأ أثناء رفع الصورة');
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  // Link exam to task
  const handleLinkExam = async () => {
    if (!examIdInput.trim()) {
      setError('يرجى إدخال معرف الامتحان');
      return;
    }

    try {
      setLinkingExam(true);
      setError('');
      await linkSchreibenExam(taskId, examIdInput.trim());
      setLinkedExamId(examIdInput.trim());
      setSuccess('تم ربط المهمة بالامتحان بنجاح!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error linking exam:', err);
      setError('حدث خطأ أثناء ربط الامتحان');
    } finally {
      setLinkingExam(false);
    }
  };

  // Unlink exam from task
  const handleUnlinkExam = async () => {
    if (!window.confirm('هل أنت متأكد من إلغاء ربط الامتحان؟')) return;

    try {
      setLinkingExam(true);
      setError('');
      await unlinkSchreibenExam(taskId);
      setLinkedExamId('');
      setExamIdInput('');
      setSuccess('تم إلغاء ربط الامتحان بنجاح!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error unlinking exam:', err);
      setError('حدث خطأ أثناء إلغاء ربط الامتحان');
    } finally {
      setLinkingExam(false);
    }
  };

  // Strip HTML tags for "empty" check
  const stripHtml = (html) => (html || '').replace(/<[^>]*>/g, '').trim();

  // Save task
  const handleSave = async () => {
    if (!stripHtml(title)) {
      setError('يرجى إدخال عنوان المهمة');
      return;
    }

    try {
      setSaving(true);
      setError('');

      // Filter out empty blocks before saving
      const validBlocks = contentBlocks.filter(block => {
        if (block.type === 'text') {
          // تأكد إن content موجود ومش فاضي
          return block.data?.content?.trim().length > 0;
        }
        if (block.type === 'form') {
          // form block صالح لو فيه عنوان أو حقول (العنوان اختياري)
          return (block.data?.title?.trim()) || (block.data?.fields?.length > 0);
        }
        if (block.type === 'image') {
          return block.data?.src?.trim().length > 0;
        }
        if (block.type === 'cards') {
          return Array.isArray(block.data?.cards) && block.data.cards.length > 0;
        }
        return true;
      });

      // Transform contentBlocks to match backend DTO
      // Backend expects: { id: string, type: string, data: object }
      const transformedBlocks = validBlocks.map(block => ({
        id: block.id || generateBlockId(),
        type: block.type,
        data: block.data || {}
      }));

      const taskData = {
        title: title.trim(),
        level,
        provider,
        status,
        instructions: instructions.trim(),
        instructionsBgColor: instructionsBgColor || undefined,
        instructionsTextColor: instructionsTextColor || undefined,
        contentBlocks: transformedBlocks,
      };

      if (isEditing) {
        await updateSchreibenTask(taskId, taskData);
        setSuccess('تم حفظ التغييرات بنجاح!');
      } else {
        const created = await createSchreibenTask(taskData);
        const createdId = created?.task?._id || created?.task?.id || created?._id || created?.id;
        if (embedded && initialExamId && createdId) {
          try {
            await linkSchreibenExam(createdId, initialExamId);
          } catch (e) {
            console.warn('Link exam after create:', e);
          }
        }
        setSuccess('تم إنشاء المهمة بنجاح!');
        if (embedded && onSuccess) {
          setTimeout(() => onSuccess(created), 800);
        } else if (!embedded) {
          setTimeout(() => navigate('/admin/schreiben'), 1500);
        }
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving task:', err);
      setError('حدث خطأ أثناء حفظ المهمة');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
        جاري تحميل المهمة...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: embedded ? '0' : '20px' }}>
      {/* Header - مخفي في الوضع المضمّن (من أسئلة متعددة) */}
      {!embedded && (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px',
        padding: '20px 28px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        border: '1px solid #E9ECEF'
      }}>
        <button
          onClick={() => navigate('/admin/schreiben')}
          style={{
            background: 'white',
            border: '1px solid #DEE2E6',
            padding: '10px',
            borderRadius: '8px',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <svg fill="none" viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" stroke="#000" />
          </svg>
        </button>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
          {isEditing ? 'تعديل مهمة الكتابة' : 'إنشاء مهمة كتابة جديدة'}
        </h1>
      </div>
      )}

      {/* Messages */}
      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          borderRadius: '8px',
          marginBottom: '16px',
        }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{
          padding: '12px',
          backgroundColor: '#d1fae5',
          color: '#065f46',
          borderRadius: '8px',
          marginBottom: '16px',
        }}>
          {success}
        </div>
      )}

      {/* Basic Info Card */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        border: '1px solid #E9ECEF'
      }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
          المعلومات الأساسية
        </h2>

        {/* Title - محرر وورد */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#374151' }}>
            عنوان المهمة *
          </label>
          <Suspense fallback={<input type="text" placeholder="جاري التحميل..." style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 8 }} />}>
            <SimpleHtmlEditor
              value={title}
              onChange={(html) => setTitle(html || '')}
              placeholder="مثال: كتابة رسالة إلى صديق"
            />
          </Suspense>
        </div>

        {/* Level, Provider, Status Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#374151' }}>
              المستوى
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '15px',
              }}
            >
              {levels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#374151' }}>
              المزود
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '15px',
              }}
            >
              {providers.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#374151' }}>
              الحالة
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '15px',
              }}
            >
              {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Instructions - محرر وورد + لون الفقرة */}
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#374151' }}>
            التعليمات العامة
          </label>
          <label style={{ fontSize: 12, color: '#64748b', marginBottom: 6, display: 'block' }}>لون خلفية الفقرة:</label>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
            {PARAGRAPH_COLORS.map((c) => (
              <button key={c.value || 'default'} type="button" title={c.label}
                onClick={() => setInstructionsBgColor(c.value)}
                style={{
                  width: 22, height: 22, borderRadius: '50%', border: `2px solid ${instructionsBgColor === c.value ? '#3b82f6' : c.border}`,
                  backgroundColor: c.bg, cursor: 'pointer', boxShadow: instructionsBgColor === c.value ? '0 0 0 2px #93c5fd' : 'none',
                }}
              />
            ))}
            <input type="color" value={instructionsBgColor || '#fefce8'} onChange={(e) => setInstructionsBgColor(e.target.value)}
              title="لون مخصص" style={{ width: 22, height: 22, border: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%' }} />
          </div>
          <Suspense fallback={<textarea rows={4} style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 8 }} placeholder="جاري التحميل..." />}>
            <div style={{
              backgroundColor: instructionsBgColor ? (PARAGRAPH_COLORS.find(c => c.value === instructionsBgColor)?.bg || instructionsBgColor) : '#f8fafc',
              border: `1px solid ${instructionsBgColor ? (PARAGRAPH_COLORS.find(c => c.value === instructionsBgColor)?.border || instructionsBgColor) : '#e2e8f0'}`,
              borderRadius: 8,
              padding: 12,
            }}>
              <SimpleHtmlEditor
                value={instructions}
                onChange={(html) => setInstructions(html || '')}
                placeholder="أدخل التعليمات العامة للمهمة..."
              />
            </div>
          </Suspense>
        </div>
      </div>

      {/* Content Blocks Card */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        border: '1px solid #E9ECEF'
      }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
          محتوى المهمة
        </h2>

        {/* Blocks */}
        {contentBlocks.map((block, index) => (
          <div key={index} style={{ position: 'relative' }}>
            {/* Move buttons */}
            <div style={{
              position: 'absolute',
              left: '-40px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}>
              <button
                type="button"
                onClick={() => moveBlock(index, 'up')}
                disabled={index === 0}
                style={{
                  background: index === 0 ? '#f3f4f6' : '#fff',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  padding: '4px',
                  cursor: index === 0 ? 'not-allowed' : 'pointer',
                  opacity: index === 0 ? 0.3 : 1,
                }}
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => moveBlock(index, 'down')}
                disabled={index === contentBlocks.length - 1}
                style={{
                  background: index === contentBlocks.length - 1 ? '#f3f4f6' : '#fff',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  padding: '4px',
                  cursor: index === contentBlocks.length - 1 ? 'not-allowed' : 'pointer',
                  opacity: index === contentBlocks.length - 1 ? 0.3 : 1,
                }}
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Block editor */}
            {block.type === 'text' && (
              <TextBlockEditor
                block={block}
                onChange={(updated) => updateBlock(index, updated)}
                onRemove={() => removeBlock(index)}
              />
            )}
            {block.type === 'form' && (
              <FormBlockEditor
                block={block}
                onChange={(updated) => updateBlock(index, updated)}
                onRemove={() => removeBlock(index)}
                taskId={taskId}
                isEditing={isEditing}
              />
            )}
            {block.type === 'image' && (
              <ImageBlockEditor
                block={block}
                onChange={(updated) => updateBlock(index, updated)}
                onRemove={() => removeBlock(index)}
              />
            )}
            {block.type === 'cards' && (
              <CardsBlockEditor
                block={block}
                onChange={(updated) => updateBlock(index, updated)}
                onRemove={() => removeBlock(index)}
              />
            )}
          </div>
        ))}

        {/* Add block buttons */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          justifyContent: 'center',
          padding: '20px',
          background: '#f9fafb',
          borderRadius: '8px',
          border: '2px dashed #d1d5db',
        }}>
          <button
            type="button"
            onClick={() => addBlock('text')}
            style={{
              padding: '10px 20px',
              background: '#f8fafc',
              color: '#475569',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            📝 إضافة نص
          </button>
          <button
            type="button"
            onClick={() => addBlock('form')}
            style={{
              padding: '10px 20px',
              background: '#eff6ff',
              color: '#1e40af',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            📋 إضافة نموذج
          </button>
          <button
            type="button"
            onClick={() => addBlock('cards')}
            style={{
              padding: '10px 20px',
              background: '#fef9c3',
              color: '#854d0e',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            🃏 إضافة بطاقات
          </button>
        </div>
      </div>

      {/* Exam Linking Card - Only show when editing */}
      {isEditing && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          border: '1px solid #E9ECEF'
        }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
            ربط بامتحان (اختياري)
          </h2>

          {linkedExamId ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              background: '#d1fae5',
              borderRadius: '8px',
              border: '1px solid #a7f3d0',
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: '600', color: '#065f46' }}>
                  ✓ مرتبطة بامتحان
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#047857', fontFamily: 'monospace' }}>
                  ID: {linkedExamId}
                </p>
              </div>
              <button
                type="button"
                onClick={handleUnlinkExam}
                disabled={linkingExam}
                style={{
                  padding: '8px 16px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  cursor: linkingExam ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                {linkingExam ? 'جاري...' : 'إلغاء الربط'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#374151', fontSize: '14px' }}>
                  معرف الامتحان (Exam ID)
                </label>
                <input
                  type="text"
                  value={examIdInput}
                  onChange={(e) => setExamIdInput(e.target.value)}
                  placeholder="مثال: 6929bfed58d67e05dec3deb6"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                  }}
                />
              </div>
              <button
                type="button"
                onClick={handleLinkExam}
                disabled={linkingExam || !examIdInput.trim()}
                style={{
                  padding: '12px 24px',
                  background: linkingExam || !examIdInput.trim() ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: linkingExam || !examIdInput.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                }}
              >
                {linkingExam ? 'جاري الربط...' : 'ربط الامتحان'}
              </button>
            </div>
          )}

          <p style={{ marginTop: '12px', fontSize: '13px', color: '#6b7280' }}>
            يمكنك ربط هذه المهمة بامتحان موجود لتتبع إجابات الطلاب وتصحيحها تلقائياً.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end',
      }}>
        <button
          type="button"
          onClick={embedded && onCancel ? onCancel : () => navigate('/admin/schreiben')}
          style={{
            padding: '12px 24px',
            background: '#f3f4f6',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: '500',
          }}
        >
          {embedded ? 'إلغاء' : 'إلغاء'}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '12px 32px',
            background: saving ? '#9ca3af' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '15px',
            fontWeight: '600',
          }}
        >
          {saving ? 'جاري الحفظ...' : (isEditing ? 'حفظ التغييرات' : 'إنشاء المهمة')}
        </button>
      </div>
    </div>
  );
}

export default SchreibenTaskEditor;

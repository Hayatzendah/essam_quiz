import { useState } from 'react';
import { examsAPI } from '../services/examsAPI';

const QUESTION_TYPES = [
  { value: 'mcq', label: 'اختيار من متعدد (MCQ)' },
  { value: 'true_false', label: 'صح / خطأ' },
  { value: 'fill', label: 'أكمل الفراغ (Fill)' },
  { value: 'match', label: 'توصيل (Match)' },
  { value: 'reorder', label: 'ترتيب (Reorder)' },
];

const emptyQuestion = () => ({
  id: Date.now() + Math.random(),
  prompt: '',
  qType: 'mcq',
  options: [
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ],
  answerKeyBoolean: true,
  fillExact: '',
  answerKeyMatch: [{ left: '', right: '' }],
  matchLeftItems: [''],
  matchRightItems: ['', ''],
  matchCorrect: [0],
  answerKeyReorder: [],
  reorderInput: '',
  points: 1,
});

function buildQuestionPayload(q) {
  const data = {
    prompt: q.prompt.trim(),
    qType: q.qType,
    points: q.points || 1,
  };
  if (q.qType === 'mcq') {
    data.options = q.options.filter(o => o.text.trim()).map(o => ({
      text: o.text.trim(),
      isCorrect: o.isCorrect,
    }));
  } else if (q.qType === 'true_false') {
    data.answerKeyBoolean = q.answerKeyBoolean;
  } else if (q.qType === 'fill') {
    data.fillExact = q.fillExact.trim();
  } else if (q.qType === 'match') {
    const { leftItems: lefts, rightItems: rights, correct } = (() => {
      if (q.matchLeftItems && q.matchRightItems) {
        return { leftItems: q.matchLeftItems, rightItems: q.matchRightItems, correct: q.matchCorrect || [] };
      }
      const pairs = q.answerKeyMatch || [];
      return {
        leftItems: pairs.map(p => (p.left ?? p[0] ?? '')),
        rightItems: pairs.map(p => (p.right ?? p[1] ?? '')),
        correct: pairs.map((_, i) => i),
      };
    })();
    const leftsTrim = lefts.map(s => (s && s.trim ? s.trim() : String(s)).trim()).filter(Boolean);
    const rightsTrim = rights.map(s => (s && s.trim ? s.trim() : String(s)).trim()).filter(Boolean);
    data.answerKeyMatch = leftsTrim
      .map((left, i) => {
        const rightIdx = correct[i];
        const right = rightIdx != null && rightsTrim[rightIdx] ? rightsTrim[rightIdx] : '';
        return right ? [left, right] : null;
      })
      .filter(Boolean);
    data.matchRightOptions = rightsTrim;
  } else if (q.qType === 'reorder') {
    data.answerKeyReorder = q.reorderInput
      ? q.reorderInput.split('|').map(s => s.trim()).filter(Boolean)
      : q.answerKeyReorder || [];
  }
  return data;
}

/**
 * فورم إضافة أسئلة فقط (نفس فورم القواعد / أسئلة متعددة) — للاستخدام المضمن في إدارة Grammatik-Training.
 * لا يعرض اختيار امتحان ولا أسئلة متعددة منفصلة، فقط إضافة أسئلة.
 */
export default function InlineAddQuestionsForm({ examId, sectionKey = '_default', hasSections = false, onSuccess }) {
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [results, setResults] = useState(null);

  const addQuestion = () => setQuestions(prev => [...prev, emptyQuestion()]);
  const removeQuestion = (id) => {
    if (questions.length <= 1) return;
    setQuestions(prev => prev.filter(q => q.id !== id));
  };
  const updateQuestion = (id, field, value) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };
  const updateOption = (qId, optIdx, field, value) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      const opts = [...q.options];
      if (field === 'isCorrect') {
        opts.forEach((o, i) => { o.isCorrect = i === optIdx; });
      } else {
        opts[optIdx] = { ...opts[optIdx], [field]: value };
      }
      return { ...q, options: opts };
    }));
  };
  const addOption = (qId) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      return { ...q, options: [...q.options, { text: '', isCorrect: false }] };
    }));
  };
  const removeOption = (qId, optIdx) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId || q.options.length <= 2) return q;
      return { ...q, options: q.options.filter((_, i) => i !== optIdx) };
    }));
  };
  const getMatchState = (q) => {
    const hasNew = q.matchLeftItems != null && q.matchRightItems != null;
    if (hasNew) {
      return {
        leftItems: q.matchLeftItems.length ? q.matchLeftItems : [''],
        rightItems: q.matchRightItems.length ? q.matchRightItems : ['', ''],
        correct: q.matchCorrect || (q.matchLeftItems || []).map((_, i) => i),
      };
    }
    const pairs = q.answerKeyMatch || [{ left: '', right: '' }];
    return {
      leftItems: pairs.map(p => p.left ?? ''),
      rightItems: pairs.length ? [...pairs.map(p => p.right ?? ''), ''] : ['', ''],
      correct: pairs.map((_, i) => i),
    };
  };

  const addMatchLeft = (qId) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      const { leftItems, rightItems, correct } = getMatchState(q);
      const next = [...leftItems, ''];
      const nextCorrect = [...correct, Math.min(correct[correct.length - 1] ?? 0, rightItems.length - 1)];
      return { ...q, matchLeftItems: next, matchRightItems: rightItems, matchCorrect: nextCorrect };
    }));
  };
  const addMatchRight = (qId) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      const { leftItems, rightItems, correct } = getMatchState(q);
      return { ...q, matchLeftItems: leftItems, matchRightItems: [...rightItems, ''], matchCorrect: correct };
    }));
  };
  const updateMatchLeft = (qId, idx, value) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      const { leftItems, rightItems, correct } = getMatchState(q);
      const next = [...leftItems];
      next[idx] = value;
      return { ...q, matchLeftItems: next, matchRightItems: rightItems, matchCorrect: correct };
    }));
  };
  const updateMatchRight = (qId, idx, value) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      const { leftItems, rightItems, correct } = getMatchState(q);
      const next = [...rightItems];
      next[idx] = value;
      return { ...q, matchLeftItems: leftItems, matchRightItems: next, matchCorrect: correct };
    }));
  };
  const updateMatchCorrect = (qId, leftIdx, rightIdx) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      const { leftItems, rightItems, correct } = getMatchState(q);
      const next = [...correct];
      next[leftIdx] = typeof rightIdx === 'number' ? rightIdx : parseInt(rightIdx, 10);
      return { ...q, matchLeftItems: leftItems, matchRightItems: rightItems, matchCorrect: next };
    }));
  };
  const removeMatchLeft = (qId, idx) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      const { leftItems, rightItems, correct } = getMatchState(q);
      if (leftItems.length <= 1) return q;
      const nextLeft = leftItems.filter((_, i) => i !== idx);
      const nextCorrect = correct.filter((_, i) => i !== idx);
      return { ...q, matchLeftItems: nextLeft, matchRightItems: rightItems, matchCorrect: nextCorrect };
    }));
  };
  const removeMatchRight = (qId, idx) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      const { leftItems, rightItems, correct } = getMatchState(q);
      if (rightItems.length <= 1) return q;
      const nextRight = rightItems.filter((_, i) => i !== idx);
      const nextCorrect = correct.map(c => {
        if (c === idx) return 0;
        if (c > idx) return Math.min(c - 1, nextRight.length - 1);
        return c;
      });
      return { ...q, matchLeftItems: leftItems, matchRightItems: nextRight, matchCorrect: nextCorrect };
    }));
  };

  const ensureMatchState = (q) => {
    if (q.qType !== 'match') return q;
    const { leftItems, rightItems, correct } = getMatchState(q);
    return { ...q, matchLeftItems: leftItems, matchRightItems: rightItems, matchCorrect: correct };
  };

  const handleSubmit = async () => {
    if (loading || !examId) return;
    setError('');
    setSuccess('');
    setResults(null);
    const actualQuestions = questions.filter(q => q.prompt.trim());
    if (actualQuestions.length === 0) {
      setError('أضف سؤالاً واحداً على الأقل مع نص السؤال');
      return;
    }
    const emptyPrompts = questions.filter(q => !q.prompt.trim());
    if (emptyPrompts.length > 0 && actualQuestions.length > 0) {
      setError('جميع الأسئلة يجب أن تحتوي على نص');
      return;
    }
    setLoading(true);
    try {
      const payload = actualQuestions.map(buildQuestionPayload);
      const result = hasSections && sectionKey
        ? await examsAPI.bulkCreateQuestions(examId, sectionKey, null, payload, null, null, null, null, null)
        : await examsAPI.bulkCreateQuestionsNoSection(examId, null, payload, null, null, null, null, null);
      setResults(result);
      setSuccess(result.success > 0 ? `تم إنشاء ${result.success} سؤال بنجاح${result.failed > 0 ? ` (${result.failed} فشل)` : ''}` : '');
      setQuestions([emptyQuestion()]);
      if (typeof onSuccess === 'function') onSuccess();
    } catch (err) {
      setError('فشل إنشاء الأسئلة: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const blockStyle = {
    padding: 16,
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    marginBottom: 12,
  };

  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 'bold', color: '#334155', margin: 0 }}>
          إضافة أسئلة ({questions.length} سؤال)
        </h3>
        <button
          type="button"
          onClick={addQuestion}
          style={{
            padding: '6px 14px', backgroundColor: '#22c55e', color: 'white',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}
        >
          + سؤال جديد
        </button>
      </div>

      {error && (
        <div style={{ padding: 10, marginBottom: 12, backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: 10, marginBottom: 12, backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, color: '#16a34a', fontSize: 13 }}>
          {success}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {questions.map((q, qi) => (
          <div key={q.id} style={{ ...blockStyle, backgroundColor: qi % 2 === 0 ? '#f8fafc' : '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>سؤال {qi + 1}</span>
              {questions.length > 1 && (
                <button type="button" onClick={() => removeQuestion(q.id)}
                  style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, padding: '2px 10px', fontSize: 12, cursor: 'pointer' }}>
                  حذف
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>نوع السؤال</label>
                <select
                  value={q.qType}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateQuestion(q.id, 'qType', v);
                    if (v === 'match') {
                      setQuestions(prev => prev.map(qq => qq.id === q.id ? ensureMatchState({ ...qq, qType: 'match' }) : qq));
                    }
                  }}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, marginTop: 2 }}
                >
                  {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>النقاط</label>
                <input
                  type="number"
                  min={1}
                  value={q.points}
                  onChange={(e) => updateQuestion(q.id, 'points', parseInt(e.target.value) || 1)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, marginTop: 2 }}
                />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>نص السؤال *</label>
              <input
                type="text"
                value={q.prompt}
                onChange={(e) => updateQuestion(q.id, 'prompt', e.target.value)}
                placeholder="اكتب نص السؤال هنا..."
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, marginTop: 2 }}
              />
            </div>
            {q.qType === 'mcq' && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }}>الخيارات (اضغط الدائرة للإجابة الصحيحة)</label>
                {q.options.map((opt, oi) => (
                  <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <button type="button" onClick={() => updateOption(q.id, oi, 'isCorrect', true)}
                      style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${opt.isCorrect ? '#22c55e' : '#cbd5e1'}`, backgroundColor: opt.isCorrect ? '#22c55e' : 'white', cursor: 'pointer', flexShrink: 0 }} />
                    <input type="text" value={opt.text} onChange={(e) => updateOption(q.id, oi, 'text', e.target.value)} placeholder={`خيار ${oi + 1}`}
                      style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }} />
                    {q.options.length > 2 && (
                      <button type="button" onClick={() => removeOption(q.id, oi)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14 }}>✕</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => addOption(q.id)} style={{ fontSize: 12, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>+ خيار جديد</button>
              </div>
            )}
            {q.qType === 'true_false' && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>الإجابة الصحيحة:</label>
                <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                  {[true, false].map(val => (
                    <button key={String(val)} type="button" onClick={() => updateQuestion(q.id, 'answerKeyBoolean', val)}
                      style={{ padding: '6px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: q.answerKeyBoolean === val ? '2px solid #22c55e' : '1px solid #cbd5e1', backgroundColor: q.answerKeyBoolean === val ? '#dcfce7' : 'white', color: q.answerKeyBoolean === val ? '#16a34a' : '#64748b' }}>
                      {val ? 'صحيح' : 'خطأ'}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {q.qType === 'fill' && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>الإجابة الصحيحة *</label>
                <input type="text" value={q.fillExact} onChange={(e) => updateQuestion(q.id, 'fillExact', e.target.value)} placeholder="اكتب الإجابة الصحيحة..."
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, marginTop: 2 }} />
              </div>
            )}
            {q.qType === 'match' && (() => {
              const { leftItems, rightItems, correct } = getMatchState(q);
              return (
                <div>
                  <p style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>عدد عناصر اليسار واليمين مرن: يمكن أن يكون في اليمين عناصر إضافية (غير مناسبة) كخيارات مضللة.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }}>عناصر اليسار</label>
                      {leftItems.map((val, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <input type="text" value={val} onChange={(e) => updateMatchLeft(q.id, i, e.target.value)} placeholder={`يسار ${i + 1}`} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }} />
                          {leftItems.length > 1 && <button type="button" onClick={() => removeMatchLeft(q.id, i)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14 }}>✕</button>}
                        </div>
                      ))}
                      <button type="button" onClick={() => addMatchLeft(q.id)} style={{ fontSize: 12, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>+ عنصر يسار</button>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }}>عناصر اليمين (منها الصحيح + خيارات مضللة)</label>
                      {rightItems.map((val, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <input type="text" value={val} onChange={(e) => updateMatchRight(q.id, i, e.target.value)} placeholder={`يمين ${i + 1}`} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }} />
                          {rightItems.length > 1 && <button type="button" onClick={() => removeMatchRight(q.id, i)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14 }}>✕</button>}
                        </div>
                      ))}
                      <button type="button" onClick={() => addMatchRight(q.id)} style={{ fontSize: 12, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>+ عنصر يمين</button>
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }}>التوصيل الصحيح (كل عنصر يسار → أي عنصر يمين؟)</label>
                    {leftItems.map((_, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: '#64748b', minWidth: 60 }}>يسار {i + 1}</span>
                        <span style={{ color: '#94a3b8' }}>→</span>
                        <select
                          value={correct[i] ?? 0}
                          onChange={(e) => updateMatchCorrect(q.id, i, e.target.value)}
                          style={{ flex: 1, maxWidth: 220, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        >
                          {rightItems.map((r, ri) => (
                            <option key={ri} value={ri}>
                              {r.trim() || `(يمين ${ri + 1})`}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            {q.qType === 'reorder' && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>الترتيب الصحيح (مفصول بالعلامة |):</label>
                <textarea
                  value={q.reorderInput || ''}
                  onChange={(e) => updateQuestion(q.id, 'reorderInput', e.target.value)}
                  placeholder="مثال: الأول | الثاني | الثالث"
                  rows={4}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, marginTop: 2, resize: 'vertical', minHeight: 90 }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <button type="button" onClick={addQuestion}
        style={{ width: '100%', marginTop: 12, padding: '10px', border: '2px dashed #cbd5e1', borderRadius: 8, backgroundColor: '#f8fafc', cursor: 'pointer', fontSize: 14, color: '#64748b', fontWeight: 600 }}>
        + إضافة سؤال آخر
      </button>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
        <button onClick={handleSubmit} disabled={loading}
          style={{ padding: '12px 40px', backgroundColor: loading ? '#94a3b8' : '#22c55e', color: 'white', border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 16, fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          {loading ? 'جاري الحفظ...' : questions.some(q => q.prompt.trim()) ? `حفظ ${questions.filter(q => q.prompt.trim()).length} سؤال` : 'حفظ الأسئلة'}
        </button>
      </div>

      {results && (
        <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, fontSize: 13, color: '#16a34a' }}>
          تم إنشاء {results.success} سؤال بنجاح {results.failed > 0 ? `(${results.failed} فشل)` : ''}
        </div>
      )}
    </div>
  );
}

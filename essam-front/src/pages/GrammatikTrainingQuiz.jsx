import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { getGrammatikTrainingQuizQuestions } from '../services/api';
import confetti from 'canvas-confetti';

function stripHtml(html) {
  if (!html || typeof html !== 'string') return '';
  const d = document.createElement('div');
  d.innerHTML = html;
  return (d.textContent || d.innerText || '').trim();
}

export default function GrammatikTrainingQuiz() {
  const { level, examId } = useParams();
  const [searchParams] = useSearchParams();
  const count = parseInt(searchParams.get('count') || '10', 10);
  const navigate = useNavigate();
  const isTopicMode = Boolean(examId);

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState('loading');
  const [fillInput, setFillInput] = useState('');
  const [matchSelections, setMatchSelections] = useState({});
  const [matchLeftItems, setMatchLeftItems] = useState([]);
  const [matchRightItems, setMatchRightItems] = useState([]);
  const [reorderItems, setReorderItems] = useState([]);
  const timerRef = useRef(null);

  const shuffleArray = useCallback((arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPhase('loading');
    const params = { count };
    if (examId) params.examId = examId;
    else params.level = level || 'A1';
    getGrammatikTrainingQuizQuestions(params)
      .then((data) => {
        if (!cancelled) {
          const list = Array.isArray(data) ? data : [];
          setQuestions(list);
          setPhase(list.length > 0 ? 'question' : 'finished');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQuestions([]);
          setPhase('finished');
        }
      });
    return () => { cancelled = true; };
  }, [level, examId, count]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // تهيئة Match/Reorder عند تغيير السؤال
  useEffect(() => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    const t = (currentQ.qType || '').toLowerCase();
    if (t === 'match' && Array.isArray(currentQ.answerKeyMatch) && currentQ.answerKeyMatch.length > 0) {
      const pairs = currentQ.answerKeyMatch.map((p) => [(p && p[0]) || '', (p && p[1]) || '']);
      setMatchLeftItems(shuffleArray(pairs.map((p) => p[0])));
      setMatchRightItems(shuffleArray(pairs.map((p) => p[1])));
      setMatchSelections({});
    } else if (t === 'reorder' && Array.isArray(currentQ.answerKeyReorder) && currentQ.answerKeyReorder.length > 0) {
      setReorderItems(shuffleArray([...currentQ.answerKeyReorder]));
    }
  }, [currentIndex, questions, shuffleArray]);

  const goNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (currentIndex + 1 >= questions.length) {
      setPhase('finished');
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setFillInput('');
      setMatchSelections({});
      setReorderItems([]);
      setPhase('question');
    }
  }, [currentIndex, questions.length]);

  const checkAnswer = useCallback((q, userAnswer) => {
    const t = (q.qType || '').toLowerCase();
    if (t === 'mcq' || t === 'multiple-choice') {
      const opts = q.options || [];
      const idx = typeof userAnswer === 'number' ? userAnswer : opts.findIndex((o) => o && o.text && String(o.text).trim() === String(userAnswer).trim());
      const correctIdx = opts.findIndex((o) => o && o.isCorrect);
      return correctIdx >= 0 && idx === correctIdx;
    }
    if (t === 'true_false' || t === 'true-false') {
      const correct = q.answerKeyBoolean === true || q.answerKeyBoolean === 'true';
      return (userAnswer === true || userAnswer === 'true') === correct;
    }
    if (t === 'fill' || t === 'fill_blank') {
      const raw = q.fillExact;
      const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const u = norm(userAnswer);
      if (!u) return false;
      if (Array.isArray(raw)) {
        const accepted = raw.map((a) => norm(a)).filter(Boolean);
        return accepted.length > 0 && accepted.some((c) => c === u);
      }
      const c = norm(raw);
      return c && u === c;
    }
    if (t === 'match') {
      const key = q.answerKeyMatch;
      if (!Array.isArray(key) || key.length === 0) return false;
      const { leftItems = [], rightItems = [], selections = {} } = userAnswer && typeof userAnswer === 'object' ? userAnswer : {};
      if (leftItems.length !== key.length || rightItems.length !== key.length) return false;
      const correctSet = new Set(key.map(([a, b]) => `${(a || '').toString().trim()}\t${(b || '').toString().trim()}`));
      for (let i = 0; i < leftItems.length; i++) {
        const ri = selections[i];
        if (ri === undefined || ri === null) return false;
        const uRight = (rightItems[ri] || '').toString().trim();
        const uLeft = (leftItems[i] || '').toString().trim();
        if (!correctSet.has(`${uLeft}\t${uRight}`)) return false;
      }
      return true;
    }
    if (t === 'reorder') {
      const key = q.answerKeyReorder;
      if (!Array.isArray(key) || key.length === 0) return false;
      const userOrder = Array.isArray(userAnswer) ? userAnswer : [];
      if (userOrder.length !== key.length) return false;
      return userOrder.every((val, i) => String(val).trim() === String(key[i]).trim());
    }
    return false;
  }, []);

  const getCorrectAnswerText = (q) => {
    const t = (q.qType || '').toLowerCase();
    if (t === 'mcq' || t === 'multiple-choice') {
      const opts = q.options || [];
      const o = opts.find((x) => x && x.isCorrect);
      return o && o.text ? stripHtml(o.text) : '';
    }
    if (t === 'true_false' || t === 'true-false') {
      return q.answerKeyBoolean ? 'صحيح' : 'خطأ';
    }
    if (t === 'fill' || t === 'fill_blank') {
      const raw = q.fillExact;
      if (Array.isArray(raw)) return raw.map((a) => String(a || '').trim()).filter(Boolean).join(' أو ');
      return String(raw || '').trim();
    }
    if (t === 'match') {
      const key = q.answerKeyMatch;
      if (!Array.isArray(key) || key.length === 0) return '';
      return key.map(([a, b]) => `${a} ← → ${b}`).join(' ؛ ');
    }
    if (t === 'reorder') {
      const key = q.answerKeyReorder;
      if (!Array.isArray(key) || key.length === 0) return '';
      return key.join(' ← ');
    }
    return '';
  };

  const handleAnswer = (userAnswer) => {
    if (phase !== 'question' || !questions[currentIndex]) return;
    const q = questions[currentIndex];
    const correct = checkAnswer(q, userAnswer);
    setSelectedAnswer(userAnswer);
    setIsCorrect(correct);
    setPhase('feedback');
    if (correct) {
      setScore((prev) => prev + 1);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      timerRef.current = setTimeout(goNext, 1800);
    } else {
      timerRef.current = setTimeout(goNext, 2800);
    }
  };

  const handleFillSubmit = () => {
    if (phase !== 'question' || !questions[currentIndex]) return;
    try {
      handleAnswer(fillInput);
    } catch (err) {
      console.error('تحقق أكمل الفراغ:', err);
      setSelectedAnswer(fillInput);
      setIsCorrect(false);
      setPhase('feedback');
      timerRef.current = setTimeout(goNext, 2200);
    }
  };

  const handleMatchSubmit = () => {
    handleAnswer({ leftItems: matchLeftItems, rightItems: matchRightItems, selections: matchSelections });
  };

  const handleReorderSubmit = () => {
    handleAnswer(reorderItems);
  };

  const moveReorderItem = (fromIdx, direction) => {
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= reorderItems.length) return;
    const next = [...reorderItems];
    [next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]];
    setReorderItems(next);
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setScore(0);
    setFillInput('');
    setPhase('loading');
    const params = { count };
    if (examId) params.examId = examId;
    else params.level = level || 'A1';
    getGrammatikTrainingQuizQuestions(params)
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setQuestions(list);
        setPhase(list.length > 0 ? 'question' : 'finished');
      })
      .catch(() => {
        setQuestions([]);
        setPhase('finished');
      });
  };

  const q = questions[currentIndex];
  const total = questions.length;
  const progress = total > 0 ? ((currentIndex + (phase === 'feedback' ? 1 : 0)) / total) * 100 : 0;

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-lime-200 border-t-lime-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">جاري تحميل الأسئلة...</p>
        </div>
      </div>
    );
  }

  if (phase === 'finished') {
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const colorClass = pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-500' : 'text-red-600';
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="max-w-sm w-full mx-4 bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">{pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'}</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">النتيجة</h2>
          <div className={`text-5xl font-bold mb-2 ${colorClass}`}>{score}/{total}</div>
          <p className={`text-lg font-semibold mb-6 ${colorClass}`}>{pct}%</p>
          <div className="space-y-3">
            <button onClick={handleRetry} className="w-full py-3 bg-lime-600 hover:bg-lime-700 text-white rounded-xl font-medium transition">
              إعادة الاختبار
            </button>
            <button onClick={() => navigate(isTopicMode ? `/grammatik-training/topic/${examId}` : '/grammatik-training')} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition">
              {isTopicMode ? 'العودة للموضوع' : 'العودة للمستويات'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const qType = (q?.qType || '').toLowerCase();
  const isMcq = qType === 'mcq' || qType === 'multiple-choice';
  const isTrueFalse = qType === 'true_false' || qType === 'true-false';
  const isFill = qType === 'fill' || qType === 'fill_blank';
  const isMatch = qType === 'match';
  const isReorder = qType === 'reorder';
  const options = q?.options || [];
  const matchComplete = isMatch && matchLeftItems.length > 0 && matchLeftItems.every((_, i) => matchSelections[i] !== undefined && matchSelections[i] !== null);
  const reorderComplete = isReorder && reorderItems.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => navigate(isTopicMode ? `/grammatik-training/topic/${examId}` : '/grammatik-training')} className="text-base text-slate-500 hover:text-slate-700">✕ إنهاء</button>
            <span className="text-base font-medium text-slate-600">سؤال {currentIndex + 1}/{total}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div className="bg-lime-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
          <p className="text-slate-700 font-medium mb-4 text-xl md:text-2xl leading-relaxed" dangerouslySetInnerHTML={{ __html: q?.prompt || '—' }} />
        </div>

        {isMcq && options.length > 0 && (
          <div className="grid gap-3 mb-8">
            {options.map((opt, idx) => {
              const text = (opt && opt.text) ? stripHtml(opt.text) : '';
              if (!text) return null;
              const isSelected = selectedAnswer !== null && (selectedAnswer === idx || selectedAnswer === text);
              const correctOptIdx = options.findIndex((o) => o && o.isCorrect);
              let btnClass = 'py-4 px-5 rounded-xl border-2 text-left font-medium text-lg md:text-xl transition ';
              if (phase === 'feedback') {
                if (idx === correctOptIdx) btnClass += 'bg-green-100 border-green-500 text-green-800';
                else if (isSelected && !isCorrect) btnClass += 'bg-red-100 border-red-500 text-red-800';
                else btnClass += 'bg-slate-50 border-slate-200 text-slate-400';
              } else {
                btnClass += 'bg-white border-lime-200 text-lime-800 hover:bg-lime-50 hover:border-lime-400 cursor-pointer';
              }
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => phase === 'question' && handleAnswer(idx)}
                  disabled={phase === 'feedback'}
                  className={btnClass}
                >
                  {text}
                </button>
              );
            })}
          </div>
        )}

        {isTrueFalse && (
          <div className="grid grid-cols-2 gap-4 mb-8">
            {[true, false].map((val) => {
              const label = val ? 'صحيح' : 'خطأ';
              const isSelected = selectedAnswer === val;
              let btnClass = 'py-5 px-6 rounded-xl border-2 text-xl font-bold transition ';
              if (phase === 'feedback') {
                const correct = q.answerKeyBoolean === true || q.answerKeyBoolean === 'true';
                if (val === correct) btnClass += 'bg-green-100 border-green-500 text-green-700';
                else if (isSelected) btnClass += 'bg-red-100 border-red-500 text-red-700';
                else btnClass += 'bg-slate-50 border-slate-200 text-slate-400';
              } else {
                btnClass += 'bg-white border-lime-200 text-lime-700 hover:bg-lime-50 hover:border-lime-400 cursor-pointer';
              }
              return (
                <button
                  key={String(val)}
                  type="button"
                  onClick={() => phase === 'question' && handleAnswer(val)}
                  disabled={phase === 'feedback'}
                  className={btnClass}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {isFill && (
          <div className="mb-8">
            <input
              type="text"
              value={fillInput}
              onChange={(e) => setFillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (phase === 'question') handleFillSubmit();
                }
              }}
              placeholder="اكتب إجابتك..."
              disabled={phase === 'feedback'}
              className="w-full py-4 px-5 rounded-xl border-2 border-lime-200 text-slate-800 placeholder-slate-400 focus:border-lime-500 focus:ring-2 focus:ring-lime-200 text-lg md:text-xl"
            />
            {phase === 'question' && (
              <button
                type="button"
                className="mt-4 w-full py-3 bg-lime-600 hover:bg-lime-700 active:scale-[0.98] text-white rounded-xl font-medium cursor-pointer select-none touch-manipulation"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleFillSubmit();
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                تحقق
              </button>
            )}
          </div>
        )}

        {isMatch && matchLeftItems.length > 0 && matchRightItems.length > 0 && (
          <div className="mb-8">
            <div className="space-y-3 mb-6">
              {matchLeftItems.map((leftText, leftIdx) => (
                <div key={leftIdx} className="flex items-center gap-3 flex-wrap">
                  <span className="min-w-[120px] py-2 px-3 rounded-lg bg-slate-100 text-slate-800 font-medium text-right">
                    {leftText}
                  </span>
                  <span className="text-slate-400">← →</span>
                  <select
                    value={matchSelections[leftIdx] !== undefined && matchSelections[leftIdx] !== null ? String(matchSelections[leftIdx]) : ''}
                    onChange={(e) => setMatchSelections((prev) => ({ ...prev, [leftIdx]: e.target.value === '' ? null : parseInt(e.target.value, 10) }))}
                    disabled={phase === 'feedback'}
                    className="flex-1 min-w-[140px] py-2 px-3 rounded-xl border-2 border-lime-200 text-slate-800 focus:border-lime-500"
                  >
                    <option value="">اختر...</option>
                    {matchRightItems.map((rightText, rightIdx) => (
                      <option key={rightIdx} value={String(rightIdx)}>{rightText}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {phase === 'question' && (
              <button
                type="button"
                onClick={handleMatchSubmit}
                disabled={!matchComplete}
                className="w-full py-3 bg-lime-600 hover:bg-lime-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium"
              >
                تحقق
              </button>
            )}
          </div>
        )}

        {isReorder && reorderItems.length > 0 && (
          <div className="mb-8">
            <div className="space-y-2 mb-6">
              {reorderItems.map((text, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-slate-500 font-mono w-8">{idx + 1}.</span>
                  <span className="flex-1 py-2 px-4 rounded-xl border-2 border-slate-200 bg-white text-right text-slate-800">
                    {text}
                  </span>
                  {phase === 'question' && (
                    <>
                      <button type="button" onClick={() => moveReorderItem(idx, 'up')} disabled={idx === 0} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-600">
                        ↑
                      </button>
                      <button type="button" onClick={() => moveReorderItem(idx, 'down')} disabled={idx === reorderItems.length - 1} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-600">
                        ↓
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
            {phase === 'question' && (
              <button type="button" onClick={handleReorderSubmit} className="w-full py-3 bg-lime-600 hover:bg-lime-700 text-white rounded-xl font-medium">
                تحقق
              </button>
            )}
          </div>
        )}

        {!isMcq && !isTrueFalse && !isFill && !isMatch && !isReorder && (
          <p className="text-slate-500 text-sm mb-8">نوع السؤال غير مدعوم في وضع التدريب السريع.</p>
        )}

        {phase === 'feedback' && (
          <div className="text-center">
            <p className={`text-xl font-bold mb-3 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
              {isCorrect ? 'صحيح! 🎉' : `خطأ — الإجابة الصحيحة: ${getCorrectAnswerText(q)}`}
            </p>
            <button type="button" onClick={goNext} className="px-6 py-2 bg-lime-600 hover:bg-lime-700 text-white rounded-lg font-medium transition">
              التالي →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

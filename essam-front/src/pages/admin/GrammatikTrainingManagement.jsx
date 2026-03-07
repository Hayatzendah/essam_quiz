import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLevels } from '../../hooks/useLevels';
import { examsAPI } from '../../services/examsAPI';
import InlineAddQuestionsForm from '../../components/InlineAddQuestionsForm';

const QUESTION_TYPE_LABELS = {
  'multiple-choice': 'اختيار متعدد',
  'mcq': 'اختيار متعدد',
  'true-false': 'صح/خطأ',
  'fill-blank': 'ملء الفراغ',
  'matching': 'مطابقة',
  'ordering': 'ترتيب',
  'short-answer': 'إجابة قصيرة',
};

function stripHtml(html) {
  if (!html || typeof html !== 'string') return '—';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').trim().slice(0, 80) || '—';
}

export default function GrammatikTrainingManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const { levelNames } = useLevels('grammatik_training');
  const [activeLevel, setActiveLevel] = useState('');
  const [exams, setExams] = useState([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [sectionKey, setSectionKey] = useState('');
  const [sectionQuestions, setSectionQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteTopicConfirm, setDeleteTopicConfirm] = useState(null);
  const [publishingId, setPublishingId] = useState(null);
  const pendingSelectExamIdRef = useRef(null);
  const pendingCreatedLevelRef = useRef(null);

  useEffect(() => {
    if (levelNames.length > 0 && !activeLevel) {
      setActiveLevel(levelNames[0]);
    }
  }, [levelNames, activeLevel]);

  // عند القدوم من إنشاء امتحان: حفظ المستوى ومعرف الامتحان ثم مسح state
  useEffect(() => {
    const state = location.state || {};
    if (state.createdExamId) pendingSelectExamIdRef.current = state.createdExamId;
    if (state.createdLevel) pendingCreatedLevelRef.current = state.createdLevel;
    if (state.createdExamId || state.createdLevel) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, []);

  // ضبط المستوى المحفوظ عندما تتوفر قائمة المستويات
  useEffect(() => {
    const level = pendingCreatedLevelRef.current;
    if (level && levelNames.length > 0 && levelNames.includes(level)) {
      setActiveLevel(level);
      pendingCreatedLevelRef.current = null;
    }
  }, [levelNames]);

  // بعد تحميل الامتحانات: اختيار الامتحان المُنشأ تلقائياً
  useEffect(() => {
    if (loadingExams || !pendingSelectExamIdRef.current || exams.length === 0) return;
    const id = pendingSelectExamIdRef.current;
    const found = exams.find((e) => (e._id || e.id) === id);
    if (found) {
      setSelectedExam(found);
    }
    pendingSelectExamIdRef.current = null;
  }, [loadingExams, exams]);

  const loadExams = useCallback(async () => {
    if (!activeLevel) return;
    setLoadingExams(true);
    try {
      const res = await examsAPI.getAll({
        examCategory: 'grammatik_training_exam',
        level: activeLevel,
        limit: 100,
      });
      const list = res.items || res || [];
      setExams(Array.isArray(list) ? list : []);
      if (selectedExam && !list.some((e) => (e._id || e.id) === (selectedExam._id || selectedExam.id))) {
        setSelectedExam(null);
        setSectionKey('');
        setSectionQuestions([]);
      }
    } catch {
      setExams([]);
    } finally {
      setLoadingExams(false);
    }
  }, [activeLevel, selectedExam]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  const loadQuestions = useCallback(async () => {
    if (!selectedExam) {
      setSectionQuestions([]);
      return;
    }
    const examId = selectedExam._id || selectedExam.id;
    setLoadingQuestions(true);
    try {
      const data = await examsAPI.getSections(examId);
      const sections = data.sections || data || [];
      const firstWithQuestions = sections.find(
        (s) => (s.questions && s.questions.length > 0) || (s.items && s.items.length > 0)
      );
      const key = firstWithQuestions?.key ?? (sections[0]?.key) ?? '_default';
      setSectionKey(key);
      const questions = firstWithQuestions?.questions || firstWithQuestions?.items || [];
      setSectionQuestions(Array.isArray(questions) ? questions : []);
    } catch {
      setSectionQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  }, [selectedExam]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleDeleteTopic = async (exam) => {
    const examId = exam._id || exam.id;
    const title = exam.title || 'هذا الموضوع';
    if (!window.confirm(`حذف الموضوع «${title}»؟ سيتم حذف الامتحان وجميع أسئلته.`)) return;
    setDeleteTopicConfirm(examId);
    try {
      await examsAPI.delete(examId);
      if (selectedExam && (selectedExam._id || selectedExam.id) === examId) {
        setSelectedExam(null);
        setSectionKey('');
        setSectionQuestions([]);
      }
      loadExams();
    } catch (err) {
      alert('فشل حذف الموضوع: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeleteTopicConfirm(null);
    }
  };

  const handlePublishExam = async () => {
    if (!selectedExam) return;
    const examId = selectedExam._id || selectedExam.id;
    setPublishingId(examId);
    try {
      await examsAPI.update(examId, { status: 'published' });
      setSelectedExam((prev) => (prev ? { ...prev, status: 'published' } : null));
      loadExams();
    } catch (err) {
      console.error('Failed to publish exam:', err);
    } finally {
      setPublishingId(null);
    }
  };

  const handleRemoveQuestion = async (questionId) => {
    if (!selectedExam) return;
    const key = sectionKey || '_default';
    const examId = selectedExam._id || selectedExam.id;
    try {
      await examsAPI.removeQuestionFromSection(examId, key, questionId);
      setDeleteConfirm(null);
      loadQuestions();
      loadExams();
    } catch (err) {
      alert('فشل حذف السؤال: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/welcome')}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← العودة للوحة التحكم
          </button>
          <h1 className="text-2xl font-bold text-slate-900">إدارة Grammatik-Training</h1>
        </div>

        {/* Level Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {levelNames.map((level) => (
            <button
              key={level}
              onClick={() => setActiveLevel(level)}
              className={`px-4 py-2 text-sm rounded-full border transition ${
                activeLevel === level
                  ? 'bg-lime-600 text-white border-lime-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-lime-400'
              }`}
            >
              {level}
              {exams.length >= 0 && activeLevel === level && (
                <span className="mr-1 text-xs opacity-75">({exams.length})</span>
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* المواضيع (الامتحانات) */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">المواضيع</h2>
              <button
                onClick={() =>
                  navigate('/admin/questions/new-with-exam', {
                    state: { presetExamType: 'grammatik_training_exam', presetLevel: activeLevel },
                  })
                }
                className="px-3 py-1.5 bg-lime-600 hover:bg-lime-700 text-white rounded-lg text-sm font-medium"
              >
                + إضافة موضوع
              </button>
            </div>
            {loadingExams ? (
              <div className="text-center py-8 text-slate-400 text-sm">جاري التحميل...</div>
            ) : exams.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm bg-white rounded-xl border border-slate-200">
                لا توجد مواضيع لهذا المستوى. أضف موضوعاً (امتحان Grammatik-Training).
              </div>
            ) : (
              <div className="space-y-2">
                {exams.map((exam) => {
                  const id = exam._id || exam.id;
                  const isSelected = selectedExam && (selectedExam._id || selectedExam.id) === id;
                  const isDeleting = deleteTopicConfirm === id;
                  return (
                    <div
                      key={id}
                      className={`flex items-stretch gap-1 rounded-xl border transition ${
                        isSelected
                          ? 'bg-lime-50 border-lime-500 ring-2 ring-lime-200'
                          : 'bg-white border-slate-200 hover:border-lime-300 hover:bg-slate-50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedExam(exam)}
                        className="flex-1 text-right px-4 py-3 min-w-0"
                      >
                        <span className="font-medium text-slate-900 block truncate">{exam.title || 'بدون عنوان'}</span>
                        <span className="text-xs text-slate-500">{exam.level}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteTopic(exam); }}
                        disabled={isDeleting}
                        title="حذف الموضوع"
                        className="flex-shrink-0 px-2 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-r-xl disabled:opacity-50 transition"
                      >
                        {isDeleting ? (
                          <span className="text-xs">...</span>
                        ) : (
                          <span className="text-lg leading-none" aria-hidden>×</span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* جدول الأسئلة */}
          <div className="lg:col-span-2">
            {!selectedExam ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
                اختر موضوعاً من القائمة لعرض أسئلته وإدارتها.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-800">
                    أسئلة: {selectedExam.title}
                    {selectedExam.status === 'draft' && (
                      <span className="mr-2 text-xs font-normal text-amber-600">(مسودة)</span>
                    )}
                  </h2>
                  {selectedExam.status === 'draft' && (
                    <button
                      onClick={handlePublishExam}
                      disabled={!!publishingId}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                    >
                      {publishingId ? 'جاري النشر...' : 'نشر الامتحان'}
                    </button>
                  )}
                </div>

                {/* فورم إضافة أسئلة فقط (نفس فورم القواعد) — بدون زر إضافة سؤال ولا أسئلة متعددة */}
                <InlineAddQuestionsForm
                  examId={selectedExam._id || selectedExam.id}
                  sectionKey={sectionKey || '_default'}
                  hasSections={false}
                  onSuccess={() => { loadQuestions(); loadExams(); }}
                />

                {loadingQuestions ? (
                  <div className="text-center py-10 text-slate-400 text-sm">جاري تحميل الأسئلة...</div>
                ) : sectionQuestions.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-500 text-sm">
                    لا توجد أسئلة في هذا الموضوع بعد. استخدم الفورم أعلاه لإضافة أسئلة.
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" dir="rtl">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="text-right px-4 py-3 font-medium text-slate-600 w-[50%]">
                            نص السؤال
                          </th>
                          <th className="text-right px-4 py-3 font-medium text-slate-600 w-[15%]">
                            النوع
                          </th>
                          <th className="text-right px-4 py-3 font-medium text-slate-600 w-[10%]">
                            النقاط
                          </th>
                          <th className="text-right px-4 py-3 font-medium text-slate-600 w-[25%]">
                            إجراءات
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionQuestions.map((q, idx) => {
                          const qId = q.questionId || q._id || q.id;
                          const prompt = q.prompt || q.question?.prompt || q.questionData?.prompt || '';
                          const type = q.type || q.question?.type || q.questionData?.type || '';
                          const points = q.points ?? q.question?.points ?? 1;
                          return (
                            <tr
                              key={qId || idx}
                              className="border-b border-slate-100 hover:bg-slate-50"
                            >
                              <td className="text-right px-4 py-3 text-slate-900">
                                {stripHtml(prompt)}
                              </td>
                              <td className="text-right px-4 py-3 text-slate-600">
                                {QUESTION_TYPE_LABELS[type] || type}
                              </td>
                              <td className="text-right px-4 py-3">{points}</td>
                              <td className="text-right px-4 py-3">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() =>
                                      navigate(
                                        `/admin/questions/${qId}/edit?returnTo=${encodeURIComponent(
                                          `/admin/grammatik-training`
                                        )}`
                                      )
                                    }
                                    className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
                                  >
                                    تعديل
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(qId)}
                                    className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                                  >
                                    حذف
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {deleteConfirm && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                      className="fixed inset-0 bg-black/40"
                      onClick={() => setDeleteConfirm(null)}
                    />
                    <div className="relative bg-white rounded-xl shadow-lg p-6 max-w-sm mx-4">
                      <p className="text-slate-800 mb-4">هل أنت متأكد من إزالة هذا السؤال من الموضوع؟</p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleRemoveQuestion(deleteConfirm)}
                          className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                        >
                          نعم، إزالة
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-sm"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

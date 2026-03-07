import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLevels } from '../hooks/useLevels';
import { getPublicExams } from '../services/api';
import UserProfileDropdown from '../components/UserProfileDropdown';

export default function GrammatikTrainingPage() {
  const navigate = useNavigate();
  const { levelNames, loading: levelsLoading } = useLevels('grammatik_training');
  const [activeLevel, setActiveLevel] = useState('');
  const [topics, setTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);

  useEffect(() => {
    if (levelNames.length > 0 && !activeLevel) {
      setActiveLevel(levelNames[0]);
    }
  }, [levelNames, activeLevel]);

  useEffect(() => {
    if (!activeLevel) {
      setTopics([]);
      return;
    }
    setTopicsLoading(true);
    getPublicExams({
      level: activeLevel,
      examCategory: 'grammatik_training_exam',
      limit: 50,
    })
      .then((res) => {
        const list = res?.items ?? res?.exams ?? res?.data ?? (Array.isArray(res) ? res : []);
        setTopics(Array.isArray(list) ? list : []);
      })
      .catch(() => setTopics([]))
      .finally(() => setTopicsLoading(false));
  }, [activeLevel]);

  const handleLevelClick = (level) => {
    setActiveLevel(level);
  };

  const handleTopicClick = (exam) => {
    const id = exam?._id ?? exam?.id;
    if (id) navigate(`/grammatik-training/topic/${id}`);
  };

  if (!levelsLoading && levelNames.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-lime-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-4xl">
            ✏️
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Grammatik-Training</h1>
          <p className="text-slate-600 mb-6">
            تدرب على القواعد: تمارين تفاعلية للمستويات A1 – C1. لم يتم تفعيل أي مستوى لهذا القسم بعد — من إدارة المستويات يمكنك إضافة قسم &quot;Grammatik-Training&quot; للمستوى المطلوب.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← العودة للرئيسية
          </button>
          {localStorage.getItem('accessToken') ? (
            <UserProfileDropdown />
          ) : (
            <span className="text-xs font-semibold text-slate-600">Deutsch Learning App</span>
          )}
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            Grammatik-Training
          </h1>
          <p className="text-slate-600 text-sm md:text-base max-w-2xl mx-auto">
            اختر المستوى وعدد الأسئلة، ثم ابدأ التدريب على القواعد. كل سؤال يظهر صح/خطأ وينتقل للتالي تلقائياً.
          </p>
        </div>

        {levelsLoading ? (
          <div className="text-center text-slate-500 text-sm py-6">جاري تحميل المستويات…</div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {levelNames.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => handleLevelClick(level)}
                className={`px-4 py-2 text-sm rounded-full border transition ${
                  activeLevel === level
                    ? 'bg-lime-600 text-white border-lime-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-lime-500 hover:text-lime-600'
                }`}
              >
                مستوى {level}
              </button>
            ))}
          </div>
        )}

        {activeLevel && (
          <div className="max-w-4xl mx-auto">
            {topicsLoading ? (
              <div className="text-center text-slate-500 text-sm py-6">جاري تحميل المواضيع…</div>
            ) : topics.length > 0 ? (
              <>
                <div className="mb-5 text-center text-slate-600 text-sm">
                  اختر موضوعاً للتدرب عليه (مستوى {activeLevel})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {topics.map((exam) => {
                    const id = exam?._id ?? exam?.id;
                    const title = exam?.title ?? exam?.name ?? 'موضوع';
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleTopicClick(exam)}
                        className="group text-right w-full rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-lime-400 transition-all duration-200 overflow-hidden flex flex-col"
                      >
                        <div className="flex items-start gap-3 p-4">
                          <span className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-2xl group-hover:bg-red-100 transition-colors">
                            ✏️
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-slate-800 block text-base">{title}</span>
                            <span className="text-xs text-slate-500 block mt-0.5">
                              {activeLevel} موضوع قواعد لمستوى
                            </span>
                          </div>
                        </div>
                        <div className="px-4 pb-4 pt-0">
                          <span className="inline-flex items-center gap-1 text-sm font-medium text-lime-600 group-hover:text-lime-700">
                            التدرب على الموضوع
                            <span className="text-slate-400 group-hover:text-lime-600">←</span>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center text-slate-400 text-sm py-10">
                لا توجد مواضيع منشورة لهذا المستوى بعد. اختر مستوىً آخر أو أضف مواضيع من الإدارة.
              </div>
            )}
          </div>
        )}

        {!activeLevel && (
          <div className="text-center text-slate-400 text-sm mt-10">
            اختر مستوى لعرض المواضيع
          </div>
        )}
      </div>
    </div>
  );
}

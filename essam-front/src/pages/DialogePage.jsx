import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPublicExams } from '../services/api';
import { useLevels } from '../hooks/useLevels';
import UserProfileDropdown from '../components/UserProfileDropdown';

export default function DialogePage() {
  const navigate = useNavigate();
  const { levels, levelNames, loading: levelsLoading } = useLevels('dialoge');
  const [activeLevel, setActiveLevel] = useState('');
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (levelNames.length > 0 && !activeLevel) {
      setActiveLevel(levelNames[0]);
    }
  }, [levelNames, activeLevel]);

  useEffect(() => {
    if (!activeLevel) return;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getPublicExams({
          level: activeLevel,
          examCategory: 'dialoge_exam',
          limit: 50,
        });
        const rawExams = data.items || data || [];
        rawExams.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        setExams(Array.isArray(rawExams) ? rawExams : []);
      } catch (err) {
        console.error('Error loading Dialoge exams:', err);
        setError('حدث خطأ أثناء تحميل الامتحانات.');
        setExams([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeLevel]);

  const handleExamClick = (examId) => {
    navigate(`/pruefungen/exam/${examId}`);
  };

  if (!levelsLoading && levels.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-pink-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-4xl">
            💭
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Dialoge</h1>
          <p className="text-slate-600 mb-6">
            حوارات ومواقف يومية للتدرب على المحادثة. لم يتم تفعيل أي مستوى لهذا القسم بعد — من إدارة المستويات يمكنك إضافة قسم &quot;Dialoge&quot; للمستوى المطلوب.
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
            Dialoge
          </h1>
          <p className="text-slate-600 text-sm md:text-base max-w-2xl mx-auto">
            حوارات ومواقف يومية للتدرب على المحادثة. اختر المستوى ثم اختر الامتحان.
          </p>
        </div>

        {levelsLoading ? (
          <div className="text-center text-slate-500 text-sm py-6">جاري تحميل المستويات…</div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {levelNames.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setActiveLevel(level)}
                className={`px-4 py-2 text-sm rounded-full border transition ${
                  activeLevel === level
                    ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-pink-500 hover:text-pink-600'
                }`}
              >
                مستوى {level}
              </button>
            ))}
          </div>
        )}

        {activeLevel && (
          <>
            {loading && (
              <div className="text-center text-slate-500 text-sm mt-10">جاري تحميل الامتحانات…</div>
            )}
            {error && !loading && (
              <div className="text-center text-red-600 text-sm mt-10 bg-red-50 border border-red-100 rounded-xl py-4">
                {error}
              </div>
            )}
            {!loading && !error && exams.length === 0 && (
              <div className="text-center text-slate-600 text-sm mt-10 bg-slate-50 border border-slate-200 rounded-xl py-8 max-w-lg mx-auto">
                <p className="font-medium text-slate-700 mb-2">لا توجد امتحانات منشورة لهذا المستوى حالياً.</p>
                <p className="text-slate-500 text-xs">
                  تظهر هنا فقط الامتحانات ذات الحالة &quot;منشور (Published)&quot;. إذا أنشأت امتحاناً واخترت &quot;مسودة (Draft)&quot; فغيّر الحالة إلى &quot;منشور&quot; من تعديل الامتحان في لوحة الإدارة.
                </p>
              </div>
            )}
            {!loading && !error && exams.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" dir="ltr">
                {exams.map((exam) => (
                  <button
                    key={exam.id || exam._id}
                    type="button"
                    onClick={() => handleExamClick(exam.id || exam._id)}
                    className="group text-left bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-xl bg-pink-50 flex items-center justify-center text-xl">
                        💭
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">{exam.title}</h3>
                        <p className="text-[11px] text-slate-400">{exam.level}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                      {exam.description || 'امتحان حوارات'}
                    </p>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        {exam.timeLimitMin ? `${exam.timeLimitMin} دقيقة` : 'بدون وقت محدد'}
                      </span>
                      <span className="text-pink-600 font-semibold group-hover:underline">
                        ابدأ الامتحان ↗
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

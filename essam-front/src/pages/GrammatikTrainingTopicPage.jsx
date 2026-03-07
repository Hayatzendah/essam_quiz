import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExamDetails } from '../services/api';
import UserProfileDropdown from '../components/UserProfileDropdown';

export default function GrammatikTrainingTopicPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!examId) {
      setLoading(false);
      setError('معرف الموضوع غير صالح');
      return;
    }
    getExamDetails(examId)
      .then((data) => {
        setExam(data);
        setError(null);
      })
      .catch(() => {
        setExam(null);
        setError('لم يتم العثور على الموضوع');
      })
      .finally(() => setLoading(false));
  }, [examId]);

  const handleStartQuiz = (count) => {
    navigate(`/grammatik-training/quiz/topic/${examId}?count=${count}`);
  };

  const title = exam?.title || exam?.name || 'موضوع القواعد';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center text-slate-500 text-sm">جاري تحميل الموضوع…</div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md w-full text-center">
          <p className="text-slate-600 mb-6">{error || 'الموضوع غير متوفر'}</p>
          <button
            onClick={() => navigate('/grammatik-training')}
            className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium"
          >
            العودة لتدريب القواعد
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
            onClick={() => navigate('/grammatik-training')}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← العودة لتدريب القواعد
          </button>
          {localStorage.getItem('accessToken') ? (
            <UserProfileDropdown />
          ) : (
            <span className="text-xs font-semibold text-slate-600">Deutsch Learning App</span>
          )}
        </div>

        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center">
          <h2 className="text-lg font-bold text-slate-900 mb-2">{title}</h2>
          <p className="text-sm text-slate-500 mb-6">كم سؤال تريد التدرب عليها؟</p>
          <div className="grid grid-cols-2 gap-3">
            {[5, 10, 20, 30].map((count) => (
              <button
                key={count}
                onClick={() => handleStartQuiz(count)}
                className="py-3 px-4 rounded-xl border-2 border-lime-200 text-lime-700 font-bold text-lg hover:bg-lime-50 hover:border-lime-400 transition"
              >
                {count} سؤال
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

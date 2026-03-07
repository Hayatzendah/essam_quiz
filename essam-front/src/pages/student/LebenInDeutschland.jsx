import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersAPI } from '../../services/usersAPI';
import { examsAPI } from '../../services/examsAPI';

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

function LebenInDeutschland() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState('');
  const [availableExams, setAvailableExams] = useState([]);
  const [error, setError] = useState('');
  const [loadingExams, setLoadingExams] = useState(false);

  useEffect(() => {
    loadUserState();
  }, []);

  useEffect(() => {
    if (selectedState) {
      loadAvailableExams(selectedState);
    }
  }, [selectedState]);

  const loadUserState = async () => {
    try {
      setLoading(true);
      const userData = await usersAPI.getMe();

      // إذا كان المستخدم لديه ولاية محفوظة، نستخدمها
      if (userData.state) {
        setSelectedState(userData.state);
      }
    } catch (err) {
      console.error('Error loading user data:', err);

      if (err.response?.status === 401) {
        navigate('/login');
      } else if (err.response?.status === 502) {
        setError('❌ لا يمكن الوصول إلى الـ Backend. تأكد من أن السيرفر يعمل على http://localhost:4000');
      } else {
        setError(err.response?.data?.message || 'حدث خطأ أثناء تحميل البيانات');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStateChange = async (newState) => {
    try {
      setSelectedState(newState);

      // حفظ الولاية في قاعدة البيانات
      await usersAPI.updateState(newState);

      // تحديث localStorage
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...currentUser, state: newState }));
    } catch (err) {
      console.error('Error updating state:', err);
      setError(err.response?.data?.message || 'حدث خطأ أثناء حفظ الولاية');
    }
  };

  const loadAvailableExams = async (state) => {
    try {
      setLoadingExams(true);
      setError('');

      const response = await examsAPI.getLebenAvailable({
          provider: 'Deutschland-in-Leben',
          state: state,
        });

      const exams = response.items || response || [];

      const examsWithId = exams.map(exam => ({
        ...exam,
        id: exam.id || exam._id,
      }));

      console.log('Available exams loaded:', examsWithId);
      setAvailableExams(examsWithId);
    } catch (err) {
      console.error('Error loading available exams:', err);
      setError(err.response?.data?.message || 'حدث خطأ أثناء تحميل الامتحانات المتاحة');
    } finally {
      setLoadingExams(false);
    }
  };

  const handleStartExam = async (examId) => {
    try {
      setError('');

      if (!examId) {
        throw new Error('معرف الامتحان غير موجود');
      }

      if (!selectedState) {
        setError('يجب اختيار الولاية أولاً');
        return;
      }

      console.log('🚀 Starting Leben exam with:', { examId, state: selectedState });

      // بدء امتحان Leben in Deutschland مع الولاية - استخدام /exams/leben/start
      const response = await examsAPI.startLebenExam(examId, selectedState);

      console.log('✅ Leben exam response:', response);

      // Response format: { attemptId, exam, questions }
      const { attemptId, exam, questions } = response;

      if (!attemptId) {
        console.error('❌ No attemptId in response:', response);
        throw new Error('لم يتم إرجاع attemptId من السيرفر');
      }

      if (!Array.isArray(questions) || questions.length === 0) {
        console.warn('⚠️ لا توجد questions في الـ response');
        setError('لا توجد أسئلة في هذا الامتحان. تأكد من أن الامتحان يحتوي على أسئلة.');
        return;
      }

      console.log('✅ Exam has', questions.length, 'questions. Navigating to exam page...');

      // ✅ الانتقال إلى صفحة الامتحان مع تمرير البيانات وإضافة examId في query string
      navigate(`/student/exam/${attemptId}?examId=${examId}`, {
        state: {
          attemptId,
          exam,
          questions,
          examType: 'leben_test',
        },
      });
    } catch (err) {
      console.error('Error starting Leben exam:', err);

      let errorMessage = 'حدث خطأ أثناء بدء الامتحان';

      if (err.response?.status === 400) {
        const errorData = err.response?.data;
        errorMessage = errorData?.message || errorData?.error || 'خطأ في البيانات المرسلة';
      } else if (err.response?.status === 404) {
        errorMessage = 'الامتحان غير موجود';
      } else if (err.response?.status === 403) {
        errorMessage = 'ليس لديك صلاحية لبدء هذا الامتحان';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-red-600 mb-4"></div>
          <p className="text-slate-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* شريط أعلى بسيط */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/welcome')}
            className="text-sm text-slate-500 hover:text-slate-700 transition"
          >
            ← العودة للرئيسية
          </button>
          <span className="text-xs font-semibold text-red-600">
            Deutsch Learning App
          </span>
        </div>

        {/* العنوان الرئيسي */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            🏠 <span className="text-red-600">Leben in Deutschland</span> Test
          </h1>
          <p className="text-slate-600 text-sm md:text-base max-w-2xl mx-auto">
            اختبار الحياة في ألمانيا - 33 سؤال عشوائي: 30 من الأسئلة العامة و3 من أسئلة الولاية المختارة
          </p>
        </div>

        {/* اختيار الولاية */}
        <div className="max-w-md mx-auto mb-10">
          <label htmlFor="state" className="block text-sm font-medium text-slate-700 mb-2 text-center">
            اختر ولايتك (Bundesland) 🇩🇪
          </label>
          <select
            id="state"
            value={selectedState}
            onChange={(e) => handleStateChange(e.target.value)}
            className="w-full px-4 py-3 text-center border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 bg-white text-slate-900"
          >
            <option value="">-- اختر الولاية --</option>
            {GERMAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 text-center mt-2">
            ملاحظة: سيتم حفظ اختيارك تلقائياً
          </p>
        </div>

        {/* رسالة خطأ */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* البطاقات الثلاث كلهم بنفس الصف */}
        <div className="max-w-6xl mx-auto mb-10">
          <div className="grid gap-4 md:grid-cols-3">
            {/* البطاقة الزرقاء: تعلم الأسئلة العامة */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition">
              <div className="flex items-start gap-4 mb-4">
                <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl flex-shrink-0">
                  📚
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    تعلم الأسئلة العامة
                  </h3>
                  <p className="text-sm text-slate-600">300 سؤال</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/student/leben/learn', {
                  state: { learningType: 'general' }
                })}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg transition font-medium text-sm"
              >
                ابدأ التعلم
              </button>
            </div>

            {/* البطاقة الخضراء: تعلم أسئلة الولاية */}
            <div className={`bg-white border rounded-xl p-6 shadow-sm transition ${
              selectedState 
                ? 'border-slate-200 hover:shadow-md' 
                : 'border-slate-300 opacity-60'
            }`}>
              <div className="flex items-start gap-4 mb-4">
                <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center text-2xl flex-shrink-0">
                  🏠
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    تعلم أسئلة الولاية
                  </h3>
                  <p className="text-sm text-slate-600">160 سؤال</p>
                  {!selectedState && (
                    <p className="text-xs text-amber-600 mt-2">
                      ⚠️ اختاري ولاية أولاً
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  if (selectedState) {
                    navigate('/student/leben/learn', {
                      state: { learningType: 'state', state: selectedState }
                    });
                  }
                }}
                disabled={!selectedState}
                className={`w-full py-2.5 rounded-lg transition font-medium text-sm ${
                  selectedState
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                ابدأ التعلم
              </button>
            </div>

            {/* البطاقة/البطاقات الحمراء: امتحانات الولاية — نفس الصف */}
            <div className="min-h-[200px] flex flex-col">
              {selectedState && (
                <p className="text-sm text-slate-600 mb-2">
                  الامتحانات لولاية {selectedState}
                </p>
              )}
              {loadingExams && (
                <div className="flex-1 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-slate-500 text-sm">جاري التحميل…</p>
                </div>
              )}
              {!selectedState && !loadingExams && (
                <div className="flex-1 flex items-center justify-center text-center text-slate-500 text-sm rounded-xl bg-slate-100 border border-slate-200 p-4">
                  اختر ولاية أولاً
                </div>
              )}
              {selectedState && !loadingExams && availableExams.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-center text-slate-500 text-sm rounded-xl bg-amber-50 border border-amber-100 p-4">
                  <span className="text-amber-800 text-xs">لا توجد امتحانات متاحة</span>
                </div>
              )}
              {!loadingExams && availableExams.length > 0 && (
                <div className="space-y-3">
                  {availableExams.map((exam) => {
                    if (!exam.id) return null;
                    return (
                      <div
                        key={exam.id}
                        className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition text-left"
                      >
                        <h3 className="text-sm font-semibold text-slate-900 mb-2 line-clamp-2">
                          {exam.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                          {exam.timeLimitMin > 0 && <span>⏱️ {exam.timeLimitMin} د</span>}
                          {exam.attemptLimit > 0 && <span>🔄 {exam.attemptLimit}</span>}
                        </div>
                        <button
                          onClick={() => handleStartExam(exam.id)}
                          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium"
                        >
                          ابدأ الامتحان
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LebenInDeutschland;


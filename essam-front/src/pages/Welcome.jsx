import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { examsAPI } from '../services/examsAPI';
import { questionsAPI } from '../services/questionsAPI';
import { studentsAPI } from '../services/studentsAPI';

function Welcome() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalExams: '--',
    totalQuestions: '--',
    totalStudents: '--',
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // إذا كان المستخدم طالب، أعد توجيهه إلى الصفحة الرئيسية
  useEffect(() => {
    if (user.role === 'student') {
      navigate('/');
    }
  }, [user.role, navigate]);

  // جلب الإحصائيات
  useEffect(() => {
    const loadStats = async () => {
      if (user.role !== 'admin' && user.role !== 'teacher') {
        return;
      }

      try {
        setLoadingStats(true);
        
        // جلب عدد الامتحانات
        try {
          const examsResponse = await examsAPI.getAll({ limit: 1, page: 1 });
          let totalExams = 0;
          if (examsResponse.total !== undefined && examsResponse.total !== null) {
            totalExams = examsResponse.total;
          } else if (Array.isArray(examsResponse)) {
            totalExams = examsResponse.length;
          } else if (examsResponse.items && Array.isArray(examsResponse.items)) {
            // إذا كان هناك items، نحاول جلب total من response
            totalExams = examsResponse.total || examsResponse.items.length;
          } else if (examsResponse.data && Array.isArray(examsResponse.data)) {
            totalExams = examsResponse.data.length;
          }
          setStats(prev => ({ ...prev, totalExams }));
        } catch (err) {
          console.error('Error loading exams count:', err);
          setStats(prev => ({ ...prev, totalExams: 0 }));
        }

        // جلب عدد الأسئلة
        try {
          const questionsResponse = await questionsAPI.getAll({ limit: 1, page: 1 });
          let totalQuestions = 0;
          if (questionsResponse.total !== undefined && questionsResponse.total !== null) {
            totalQuestions = questionsResponse.total;
          } else if (Array.isArray(questionsResponse)) {
            totalQuestions = questionsResponse.length;
          } else if (questionsResponse.items && Array.isArray(questionsResponse.items)) {
            totalQuestions = questionsResponse.total || questionsResponse.items.length;
          } else if (questionsResponse.data && Array.isArray(questionsResponse.data)) {
            totalQuestions = questionsResponse.data.length;
          }
          setStats(prev => ({ ...prev, totalQuestions }));
        } catch (err) {
          console.error('Error loading questions count:', err);
          setStats(prev => ({ ...prev, totalQuestions: 0 }));
        }

        // جلب عدد الطلاب
        try {
          const studentsResponse = await studentsAPI.getAll({ limit: 1, page: 1 });
          let totalStudents = 0;
          if (studentsResponse.total !== undefined && studentsResponse.total !== null) {
            totalStudents = studentsResponse.total;
          } else if (Array.isArray(studentsResponse)) {
            totalStudents = studentsResponse.length;
          } else if (studentsResponse.items && Array.isArray(studentsResponse.items)) {
            totalStudents = studentsResponse.total || studentsResponse.items.length;
          } else if (studentsResponse.data && Array.isArray(studentsResponse.data)) {
            totalStudents = studentsResponse.data.length;
          }
          setStats(prev => ({ ...prev, totalStudents }));
        } catch (err) {
          console.error('Error loading students count:', err);
          setStats(prev => ({ ...prev, totalStudents: 0 }));
        }
      } catch (err) {
        console.error('Error loading stats:', err);
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
  }, [user.role]);

  const handleLogout = async () => {
    await authAPI.logout();
    navigate('/login');
  };

  const isAdmin = user.role === 'admin' || user.role === 'teacher';
  const isStudent = user.role === 'student';

  // صفحة المعلم/الأدمن
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex">
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 right-0 z-50
          w-64 bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-800 flex flex-col shadow-2xl border-l border-slate-200
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}>
          {/* Logo */}
          <div className="p-6 border-b border-slate-200">
            <img
              src="/src/images/logo.png"
              alt="الأستاذ عصام"
              className="h-32 w-auto object-contain mx-auto"
            />
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {/* Dashboard */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#ED0D0B] text-white font-medium cursor-pointer shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span>لوحة التحكم</span>
            </div>

            {/* إنشاء امتحان */}
            <button
              onClick={() => navigate('/admin/questions/new-with-exam')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-200 transition-colors text-right text-slate-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>إنشاء امتحان</span>
            </button>

            {/* قسم الأسئلة والمحتوى (أسئلة متعددة + مهام كتابة + بطاقات) */}
            <p className="px-4 pt-4 pb-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">الأسئلة والمحتوى</p>
            <button
              onClick={() => navigate('/admin/questions/new')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-200 transition-colors text-right text-slate-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>إنشاء سؤال</span>
            </button>

            {/* أسئلة متعددة */}
            <button
              onClick={() => navigate('/admin/questions/bulk-create')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-200 transition-colors text-right text-slate-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>أسئلة متعددة</span>
            </button>

            {/* عرض الأسئلة */}
            <button
              onClick={() => navigate('/admin/questions')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-200 transition-colors text-right text-slate-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>عرض الأسئلة</span>
            </button>

            {/* إدارة مهام الكتابة (نموذج، بطاقات، محتوى) — ضمن قسم الأسئلة والمحتوى */}
            <button
              onClick={() => navigate('/admin/schreiben')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-200 transition-colors text-right text-slate-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>مهام الكتابة (Schreiben)</span>
            </button>

            {/* عرض الامتحانات */}
            <button
              onClick={() => navigate('/admin/exams')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-200 transition-colors text-right text-slate-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>عرض الامتحانات</span>
            </button>

            {/* الإحصائيات */}
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-200 transition-colors text-right text-slate-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>الإحصائيات</span>
            </button>

            {/* إدارة الطلاب */}
            <button
              onClick={() => navigate('/admin/students')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-200 transition-colors text-right text-slate-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>إدارة الطلاب</span>
            </button>

            {/* مواضيع القواعد (شرح) */}
            <button
              onClick={() => navigate('/admin/grammar-topics')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-200 transition-colors text-right text-slate-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>مواضيع القواعد (شرح)</span>
            </button>

            {/* إدارة مواضيع المفردات */}
            <button
              onClick={() => navigate('/admin/vocabulary/topics')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-200 transition-colors text-right text-slate-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>إدارة مواضيع المفردات</span>
            </button>

            {/* إدارة Der/Die/Das */}
            <button
              onClick={() => navigate('/admin/derdiedas')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-200 transition-colors text-right text-slate-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <span>Der / Die / Das</span>
            </button>

            {/* إدارة Grammatik-Training (مواضيع + أسئلة) */}
            <button
              onClick={() => navigate('/admin/grammatik-training')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-200 transition-colors text-right text-slate-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>Grammatik-Training</span>
            </button>

            {/* إدارة المستويات */}
            <button
              onClick={() => navigate('/admin/levels')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-200 transition-colors text-right text-slate-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              <span>إدارة المستويات</span>
            </button>
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-slate-200">
            <div className="mb-3 px-2">
              <p className="text-sm font-medium text-slate-800 truncate">{user.email}</p>
              <p className="text-xs text-slate-500">
                {user.role === 'admin' ? 'مدير النظام' : 'معلم'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-sm font-medium">تسجيل الخروج</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Mobile Header */}
          <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <img src="/src/images/logo.png" alt="الأستاذ عصام" className="h-10 w-auto" />
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-4 lg:p-8">
            {/* Welcome Section */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                مرحباً بك في لوحة التحكم 👋
              </h2>
              <p className="text-slate-600">
                إدارة الامتحانات والأسئلة والطلاب من مكان واحد
              </p>
            </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-1">
                {loadingStats ? '...' : stats.totalExams}
              </h3>
              <p className="text-sm text-slate-600">إجمالي الامتحانات</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-1">
                {loadingStats ? '...' : stats.totalQuestions}
              </h3>
              <p className="text-sm text-slate-600">إجمالي الأسئلة</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-1">
                {loadingStats ? '...' : stats.totalStudents}
              </h3>
              <p className="text-sm text-slate-600">إجمالي الطلاب</p>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">النشاط الأخير</h3>
            </div>
            <div className="p-6">
              <div className="text-center py-12 text-slate-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <p>لا يوجد نشاط حديث</p>
              </div>
            </div>
          </div>
          </div>
        </main>
      </div>
    );
  }

  // صفحة الطالب - تبقى كما هي
  if (isStudent) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              أهلاً بك في موقع الأستاذ عصام
            </h1>
            {user.email && (
              <p className="text-slate-600 mb-6">مرحباً، {user.email}</p>
            )}

            <div className="space-y-3">
              <button
                onClick={() => navigate('/student/liden')}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-lg transition font-medium"
              >
                🇩🇪 Leben in Deutschland
              </button>

              <button
                onClick={handleLogout}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 px-6 rounded-lg transition font-medium"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // إذا لم يكن أدمن ولا طالب
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">غير مصرح</h1>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded-lg transition"
        >
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}

export default Welcome;


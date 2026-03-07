import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import loginImage from '../images/41658.jpg';

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // إذا المستخدم مسجل دخول بالفعل، وجهه للصفحة المناسبة
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const dest = user.role === 'student' ? '/' : '/welcome';
      navigate(dest, { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authAPI.login(email, password);

      // التحقق من الدور - هذه الصفحة مخصصة للمعلمين والمديرين فقط
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.role === 'student') {
        await authAPI.logout();
        setError('هذه الصفحة مخصصة للمعلمين والمديرين فقط.');
        setLoading(false);
        return;
      }

      navigate('/welcome', { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      if (err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
        setError('لا يمكن الاتصال بالخادم. تأكد من أن API يعمل');
      } else if (err.response?.status === 400) {
        const errorData = err.response?.data;
        let errorMessage = 'بيانات غير صحيحة';

        if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (errorData?.error) {
          errorMessage = errorData.error;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData?.errors) {
          errorMessage = Object.values(errorData.errors).flat().join(', ');
        }

        setError(errorMessage);
      } else if (err.response?.status === 401) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      } else {
        setError(
          err.response?.data?.message || err.response?.data?.error || 'حدث خطأ أثناء تسجيل الدخول'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        {/* العمود اليسار: فورم الدخول */}
        <div className="w-full lg:max-w-md flex items-center justify-center px-4 py-8 lg:ml-8">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-md border border-slate-100 px-6 py-7">
            <div className="flex flex-col items-center mb-6">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                <span className="text-2xl">🔐</span>
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                دخول المعلم / المدير
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                ادخل بياناتك للوصول إلى لوحة التحكم.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1 text-sm">
                <label className="block font-medium text-slate-700">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  required
                  dir="ltr"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1 text-sm">
                <label className="block font-medium text-slate-700">
                  كلمة المرور
                </label>
                <input
                  type="password"
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-blue-600 text-white text-sm font-semibold py-2.5 mt-2 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "جارٍ تسجيل الدخول..." : "دخول المعلم / المدير"}
              </button>
            </form>
          </div>
        </div>

        {/* العمود اليمين: صورة + نص */}
        <div className="hidden lg:flex flex-1 items-center justify-center bg-white">
          <div className="max-w-lg px-8 pl-8">
            <div className="mb-6 text-sm font-semibold text-blue-600">
              Deutsch Learning App - Admin
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4 leading-snug">
              لوحة تحكم المعلم
            </h1>
            <p className="text-slate-600 text-sm mb-8">
              إدارة الاختبارات والأسئلة والطلاب ومتابعة الأداء والتحليلات.
            </p>
            <div className="relative rounded-2xl overflow-hidden">
              <img
                src={loginImage}
                alt="لوحة التحكم"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;

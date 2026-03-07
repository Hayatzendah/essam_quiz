import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';
import registerImage from '../images/47163.jpg';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }

    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setLoading(true);

    try {
      // التحقق من البريد الإلكتروني أولاً (اختياري)
      try {
        const emailCheck = await authAPI.checkEmail(email);
        if (emailCheck.exists) {
          setError('البريد الإلكتروني مستخدم بالفعل. جرب بريداً آخر أو سجل الدخول');
          setLoading(false);
          return;
        }
      } catch (checkError) {
        // إذا فشل التحقق، نتابع التسجيل (قد لا يكون endpoint متاح)
        console.log('Email check failed, continuing with registration:', checkError);
      }

      const registerResult = await authAPI.register(email, password, 'student');
      console.log('Registration successful:', registerResult);

      // بعد التسجيل الناجح، انتظر قليلاً ثم سجل الدخول تلقائياً
      // (لإعطاء الوقت لقاعدة البيانات لحفظ البيانات)
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        await authAPI.login(email, password);

        // إذا في redirect parameter، روح عليه
        // وإلا حسب دور المستخدم: طالب -> /، أدمن/معلم -> /welcome
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const defaultRedirect = (user.role === 'student') ? '/' : '/welcome';
        const redirectTo = searchParams.get('redirect') || defaultRedirect;
        navigate(redirectTo);
      } catch (loginError) {
        console.error('Auto-login failed after registration:', loginError);
        // إذا فشل تسجيل الدخول التلقائي، اعرض رسالة نجاح واطلب من المستخدم تسجيل الدخول يدوياً
        setSuccess('تم إنشاء الحساب بنجاح! يرجى تسجيل الدخول الآن.');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      console.error('=== Registration Error Details ===');
      console.error('Full error object:', err);
      console.error('Error response data:', err.response?.data);
      console.error('Error status code:', err.response?.status);
      console.error('Original email:', email);
      console.error('Email (normalized):', email.trim().toLowerCase());
      console.error('Request URL:', err.config?.url);
      console.error('Request data:', err.config?.data);
      console.error('===================================');

      if (err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
        setError('لا يمكن الاتصال بالخادم. تأكد من أن API يعمل على https://api.deutsch-tests.com');
      } else if (err.response?.status === 400) {
        // خطأ 400 - Bad Request
        const errorData = err.response?.data;
        let errorMessage = 'بيانات غير صحيحة';

        if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (errorData?.error) {
          errorMessage = errorData.error;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData?.errors) {
          // إذا كان هناك أخطاء متعددة
          errorMessage = Object.values(errorData.errors).flat().join(', ');
        }

        // ترجمة رسائل الخطأ الشائعة
        if (errorMessage.toLowerCase().includes('email already') ||
            errorMessage.toLowerCase().includes('already in use') ||
            errorMessage.toLowerCase().includes('email exists')) {
          errorMessage = 'البريد الإلكتروني مستخدم بالفعل. جرب بريداً آخر أو سجل الدخول';
        }

        setError(errorMessage);
      } else if (err.response?.status === 409) {
        // Conflict - Email already exists
        const errorData = err.response?.data;
        let errorMessage = 'البريد الإلكتروني مستخدم بالفعل';

        if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (errorData?.error) {
          errorMessage = errorData.error;
        }

        // إضافة نص توضيحي
        errorMessage += `. البريد "${email.trim().toLowerCase()}" موجود في النظام. جرب بريداً آخر أو سجل الدخول`;

        setError(errorMessage);
      } else if (err.response?.status === 500) {
        setError('حدث خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقاً');
      } else {
        setError(
          err.response?.data?.message || err.response?.data?.error || 'حدث خطأ أثناء التسجيل'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* زر الرجوع للرئيسية */}
      <div className="w-full px-6 py-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-red-600 transition-colors group"
        >
          <svg
            className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">الرئيسية</span>
        </Link>
      </div>

      <div className="flex-1 flex items-stretch">
        {/* العمود اليسار: صورة + نص تعريفي */}
        <div className="hidden lg:flex flex-1 items-center justify-center bg-white">
        <div className="max-w-lg px-8 pr-8">
          <div className="mb-6 text-sm font-semibold text-red-600">
            Deutsch Learning App
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4 leading-snug">
            حساب واحد، كل اختبارات الألمانية في مكان واحد 🤍
          </h1>
          <p className="text-slate-600 text-sm mb-8">
            بعد إنشاء الحساب يمكنك حلّ اختبارات &quot;Leben in Deutschland&quot;،
            امتحانات Goethe و TELC، ومتابعة نتائجك وتقدّمك بسهولة.
          </p>
          <div className="relative rounded-2xl overflow-hidden">
            <img
              src={registerImage}
              alt="تعلم الألمانية"
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
      </div>

      {/* العمود اليمين: فورم التسجيل */}
      <div className="w-full lg:max-w-md flex items-center justify-center px-4 py-8 lg:mr-8">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-md border border-slate-100 px-6 py-7">
          <div className="flex flex-col items-center mb-6">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
              <span className="text-2xl">📝</span>
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              إنشاء حساب جديد
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              سجّل كطالب لبدء حل اختبارات الألمانية.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* الإيميل */}
            <div className="space-y-1 text-sm">
              <label className="block font-medium text-slate-700">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                required
                dir="ltr"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-slate-50"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* كلمة المرور */}
            <div className="space-y-1 text-sm">
              <label className="block font-medium text-slate-700">
                كلمة المرور
              </label>
              <input
                type="password"
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-slate-50"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-[11px] text-slate-400">
                يفضّل أن تحتوي على حروف كبيرة وصغيرة وأرقام.
              </p>
            </div>

            {/* تأكيد كلمة المرور */}
            <div className="space-y-1 text-sm">
              <label className="block font-medium text-slate-700">
                تأكيد كلمة المرور
              </label>
              <input
                type="password"
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-slate-50"
                placeholder="أعد كتابة كلمة المرور"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            {success && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-red-600 text-white text-sm font-semibold py-2.5 mt-2 hover:bg-red-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "جارٍ إنشاء الحساب..." : "إنشاء حساب كطالب"}
            </button>

            <p className="text-xs text-center text-slate-500 mt-3">
              لديك حساب بالفعل؟{" "}
              <Link
                to={searchParams.get('redirect') ? `/login?redirect=${searchParams.get('redirect')}` : '/login'}
                className="text-red-600 font-medium hover:text-red-700"
              >
                سجّل الدخول
              </Link>
            </p>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
}

export default Register;


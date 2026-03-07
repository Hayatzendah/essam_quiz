import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { usersAPI } from '../services/usersAPI';

const ROLE_LABELS = {
  student: 'طالب',
  teacher: 'معلم',
  admin: 'مدير',
};

function UserProfileDropdown() {
  const [open, setOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // إغلاق القائمة عند الضغط خارجها
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // تحديث بيانات المستخدم من localStorage عند تغييرها
  useEffect(() => {
    const handleStorageChange = () => {
      setUser(JSON.parse(localStorage.getItem('user') || '{}'));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogout = async () => {
    const isAdminOrTeacher = user.role === 'admin' || user.role === 'teacher';
    await authAPI.logout();
    navigate(isAdminOrTeacher ? '/adminessam-login' : '/login', { replace: true });
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('كلمة المرور الجديدة وتأكيدها غير متطابقين');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setPasswordLoading(true);
    try {
      const result = await authAPI.changePassword(oldPassword, newPassword);
      setPasswordSuccess(result.message || 'تم تغيير كلمة المرور بنجاح');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (err) {
      setPasswordError(
        err.response?.data?.message || 'فشل تغيير كلمة المرور'
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPicture(true);
    try {
      const result = await usersAPI.uploadProfilePicture(file);
      const updatedUser = { ...user, profilePicture: result.profilePicture };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (err) {
      console.error('Failed to upload profile picture:', err);
    } finally {
      setUploadingPicture(false);
      // إعادة تعيين input الملف
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const firstLetter = (user.email || user.name || '?')[0].toUpperCase();

  return (
    <>
      <div ref={dropdownRef} className="relative">
        {/* زر البروفايل */}
        <button
          onClick={() => setOpen(!open)}
          className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border-2 border-slate-300 hover:border-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {user.profilePicture ? (
            <img
              src={user.profilePicture}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm font-bold text-slate-600">{firstLetter}</span>
          )}
        </button>

        {/* القائمة المنسدلة */}
        {open && (
          <div className="absolute right-0 top-12 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-3 z-50">
            {/* معلومات المستخدم */}
            <div className="px-4 pb-3 border-b border-slate-100 flex items-center gap-3">
              <button
                onClick={handleProfilePictureClick}
                className="relative w-12 h-12 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden border-2 border-slate-300 hover:border-blue-400 transition-colors group"
                title="تغيير الصورة"
              >
                {user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-bold text-slate-600">{firstLetter}</span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                {uploadingPicture && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate" dir="ltr">
                  {user.email || ''}
                </p>
                <p className="text-xs text-slate-500">
                  {ROLE_LABELS[user.role] || user.role}
                </p>
              </div>
            </div>

            {/* الأزرار */}
            <div className="py-1">
              <button
                onClick={() => {
                  setOpen(false);
                  setShowPasswordModal(true);
                }}
                className="w-full text-right px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                تغيير كلمة المرور
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        )}
      </div>

      {/* مودال تغيير كلمة المرور */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">تغيير كلمة المرور</h3>

            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  كلمة المرور الحالية
                </label>
                <input
                  type="password"
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  كلمة المرور الجديدة
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  تأكيد كلمة المرور الجديدة
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              {passwordError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                  {passwordError}
                </p>
              )}

              {passwordSuccess && (
                <p className="text-xs text-green-600 bg-green-50 border border-green-100 rounded-md px-3 py-2">
                  {passwordSuccess}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex-1 rounded-md bg-blue-600 text-white text-sm font-semibold py-2 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                >
                  {passwordLoading ? 'جارٍ التغيير...' : 'تغيير'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordError('');
                    setPasswordSuccess('');
                    setOldPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="flex-1 rounded-md bg-slate-100 text-slate-700 text-sm font-semibold py-2 hover:bg-slate-200 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default UserProfileDropdown;

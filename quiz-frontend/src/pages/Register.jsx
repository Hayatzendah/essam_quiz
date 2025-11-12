import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authAPI } from '../services/api'

export default function Register({ onLogin }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'student',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await authAPI.register(formData)
      setSuccess('تم التسجيل بنجاح! جاري تسجيل الدخول...')
      
      // تسجيل الدخول تلقائياً بعد التسجيل
      setTimeout(async () => {
        try {
          const loginResponse = await authAPI.login({
            email: formData.email,
            password: formData.password,
          })
          const { user, accessToken, refreshToken } = loginResponse.data
          onLogin(user, { accessToken, refreshToken })
        } catch (err) {
          setError('تم التسجيل لكن فشل تسجيل الدخول. يرجى تسجيل الدخول يدوياً.')
        }
      }, 1000)
    } catch (err) {
      setError(err.response?.data?.message || 'فشل التسجيل')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: '400px', marginTop: '100px' }}>
      <div className="card">
        <h1 style={{ marginBottom: '20px', textAlign: 'center' }}>إنشاء حساب جديد</h1>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>البريد الإلكتروني</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>كلمة المرور</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={8}
            />
          </div>
          <div className="form-group">
            <label>الدور</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="student">طالب</option>
              <option value="teacher">معلم</option>
              <option value="admin">أدمن</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'جاري التسجيل...' : 'إنشاء حساب'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '20px' }}>
          لديك حساب بالفعل؟ <Link to="/login">سجل الدخول</Link>
        </p>
      </div>
    </div>
  )
}


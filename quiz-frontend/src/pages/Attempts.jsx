import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { attemptsAPI } from '../services/api'

export default function Attempts({ user }) {
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Note: لا يوجد endpoint للحصول على جميع المحاولات
    // يمكن إضافته لاحقاً أو استخدام endpoint آخر
    setLoading(false)
  }, [])

  if (loading) {
    return <div className="loading">جاري التحميل...</div>
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '30px' }}>محاولاتي</h1>

      {error && <div className="alert alert-error">{error}</div>}

      {attempts.length === 0 ? (
        <div className="card">
          <p>لا توجد محاولات بعد. ابدأ امتحاناً لرؤية محاولاتك هنا.</p>
          <Link to="/exams" className="btn btn-primary" style={{ marginTop: '15px' }}>
            عرض الامتحانات
          </Link>
        </div>
      ) : (
        <div>
          {attempts.map((attempt) => (
            <div key={attempt.id} className="card">
              <h3>{attempt.exam?.title}</h3>
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <Link to={`/attempts/${attempt.id}`} className="btn btn-primary">
                  عرض التفاصيل
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


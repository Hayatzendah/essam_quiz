import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { examsAPI } from '../services/api'

export default function Exams({ user }) {
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadExams()
  }, [])

  const loadExams = async () => {
    try {
      const response = await examsAPI.getAll()
      setExams(response.data?.data || response.data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'فشل تحميل الامتحانات')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">جاري التحميل...</div>
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>الامتحانات</h1>
        {(user.role === 'teacher' || user.role === 'admin') && (
          <Link to="/exams/create" className="btn btn-primary">
            + إنشاء امتحان جديد
          </Link>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {exams.length === 0 ? (
        <div className="card">
          <p>لا توجد امتحانات</p>
        </div>
      ) : (
        <div className="grid">
          {exams.map((exam) => (
            <div key={exam.id} className="card">
              <h3>{exam.title}</h3>
              <p style={{ color: 'var(--text-light)', marginBottom: '15px' }}>
                {exam.description}
              </p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', flexWrap: 'wrap' }}>
                {exam.timeLimitMin && (
                  <span className="badge badge-info">⏱️ {exam.timeLimitMin} دقيقة</span>
                )}
                {exam.attemptLimit && (
                  <span className="badge badge-warning">🔄 {exam.attemptLimit} محاولات</span>
                )}
                {exam.isPublished ? (
                  <span className="badge badge-success">منشور</span>
                ) : (
                  <span className="badge badge-danger">مسودة</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                {user.role === 'student' ? (
                  <Link to={`/exams/${exam.id}/take`} className="btn btn-primary">
                    بدء الامتحان
                  </Link>
                ) : (
                  <Link to={`/exams/${exam.id}`} className="btn btn-primary">
                    عرض التفاصيل
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


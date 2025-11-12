import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { examsAPI } from '../services/api'

export default function ExamDetail({ user }) {
  const { id } = useParams()
  const [exam, setExam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadExam()
  }, [id])

  const loadExam = async () => {
    try {
      const response = await examsAPI.getById(id)
      setExam(response.data)
    } catch (err) {
      setError(err.response?.data?.message || 'فشل تحميل الامتحان')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">جاري التحميل...</div>
  }

  if (error || !exam) {
    return (
      <div className="container">
        <div className="alert alert-error">{error || 'الامتحان غير موجود'}</div>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: '900px' }}>
      <div className="card">
        <h1>{exam.title}</h1>
        <p style={{ color: 'var(--text-light)', marginBottom: '20px' }}>{exam.description}</p>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {exam.timeLimitMin > 0 && (
            <span className="badge badge-info">⏱️ {exam.timeLimitMin} دقيقة</span>
          )}
          {exam.attemptLimit > 0 && (
            <span className="badge badge-warning">🔄 {exam.attemptLimit} محاولات</span>
          )}
          {exam.isPublished ? (
            <span className="badge badge-success">منشور</span>
          ) : (
            <span className="badge badge-danger">مسودة</span>
          )}
        </div>

        <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>الأسئلة ({exam.questions?.length || 0})</h3>
        {exam.questions && exam.questions.length > 0 ? (
          <div>
            {exam.questions.map((question, index) => (
              <div key={question.id} className="card" style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: '500', marginBottom: '10px' }}>
                      {index + 1}. {question.text}
                    </p>
                    <span className="badge badge-info">{question.type}</span>
                    <span className="badge badge-success" style={{ marginRight: '8px' }}>
                      {question.points} نقطة
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>لا توجد أسئلة في هذا الامتحان</p>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
          {user.role === 'student' && exam.isPublished && (
            <Link to={`/exams/${id}/take`} className="btn btn-primary">
              بدء الامتحان
            </Link>
          )}
          <Link to="/exams" className="btn btn-outline">
            العودة للقائمة
          </Link>
        </div>
      </div>
    </div>
  )
}


import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { attemptsAPI } from '../services/api'

export default function AttemptDetail({ user }) {
  const { id } = useParams()
  const [attempt, setAttempt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadAttempt()
  }, [id])

  const loadAttempt = async () => {
    try {
      const response = await attemptsAPI.getById(id)
      setAttempt(response.data)
    } catch (err) {
      setError(err.response?.data?.message || 'فشل تحميل المحاولة')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">جاري التحميل...</div>
  }

  if (error || !attempt) {
    return (
      <div className="container">
        <div className="alert alert-error">{error || 'المحاولة غير موجودة'}</div>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: '900px' }}>
      <div className="card" style={{ marginBottom: '20px' }}>
        <h1>{attempt.exam?.title}</h1>
        <div style={{ display: 'flex', gap: '15px', marginTop: '15px', flexWrap: 'wrap' }}>
          <span className="badge badge-info">
            الحالة: {attempt.status === 'submitted' ? 'تم التسليم' : attempt.status}
          </span>
          {attempt.score !== undefined && (
            <span className="badge badge-success">
              النتيجة: {attempt.score} / {attempt.totalPoints}
            </span>
          )}
        </div>
      </div>

      {attempt.items && attempt.items.length > 0 && (
        <div>
          {attempt.items.map((item, index) => (
            <div key={index} className="card" style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '15px' }}>
                {index + 1}. {item.question?.text}
              </h3>

              <div style={{ marginBottom: '15px' }}>
                <strong>إجابتك:</strong>
                <div style={{ padding: '10px', background: 'var(--bg)', borderRadius: '8px', marginTop: '8px' }}>
                  {JSON.stringify(item.studentAnswer, null, 2)}
                </div>
              </div>

              {item.status === 'submitted' && (
                <>
                  <div style={{ marginBottom: '15px' }}>
                    <strong>الإجابة الصحيحة:</strong>
                    <div style={{ padding: '10px', background: 'var(--bg)', borderRadius: '8px', marginTop: '8px' }}>
                      {JSON.stringify(item.correctAnswer, null, 2)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {item.isCorrect ? (
                      <span className="badge badge-success">✓ صحيح</span>
                    ) : (
                      <span className="badge badge-danger">✗ خاطئ</span>
                    )}
                    <span className="badge badge-info">
                      {item.points} / {item.maxPoints} نقطة
                    </span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <Link to="/attempts" className="btn btn-outline">
          العودة للقائمة
        </Link>
      </div>
    </div>
  )
}


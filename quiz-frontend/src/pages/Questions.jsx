import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { questionsAPI } from '../services/api'

export default function Questions({ user }) {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadQuestions()
  }, [])

  const loadQuestions = async () => {
    try {
      const response = await questionsAPI.getAll()
      setQuestions(response.data?.data || response.data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'فشل تحميل الأسئلة')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return

    try {
      await questionsAPI.delete(id)
      loadQuestions()
    } catch (err) {
      alert(err.response?.data?.message || 'فشل حذف السؤال')
    }
  }

  if (loading) {
    return <div className="loading">جاري التحميل...</div>
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>الأسئلة</h1>
        <Link to="/questions/create" className="btn btn-primary">
          + إنشاء سؤال جديد
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {questions.length === 0 ? (
        <div className="card">
          <p>لا توجد أسئلة</p>
        </div>
      ) : (
        <div>
          {questions.map((question) => (
            <div key={question.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ marginBottom: '10px' }}>{question.text}</h3>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', flexWrap: 'wrap' }}>
                    <span className="badge badge-info">{question.type}</span>
                    <span className="badge badge-success">{question.points} نقطة</span>
                  </div>
                  {question.options && question.options.length > 0 && (
                    <div style={{ marginTop: '15px' }}>
                      <strong>الخيارات:</strong>
                      <ul style={{ marginTop: '8px', paddingRight: '20px' }}>
                        {question.options.map((opt, idx) => (
                          <li key={idx} style={{ color: opt.isCorrect ? 'var(--success)' : 'var(--text)' }}>
                            {opt.text} {opt.isCorrect && '✓'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleDelete(question.id)}
                    className="btn btn-danger"
                    style={{ fontSize: '14px', padding: '8px 16px' }}
                  >
                    حذف
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


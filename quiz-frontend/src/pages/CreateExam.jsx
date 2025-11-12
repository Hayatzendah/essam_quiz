import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { examsAPI, questionsAPI } from '../services/api'

export default function CreateExam({ user }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    questions: [],
    attemptLimit: 0,
    timeLimitMin: 0,
    isPublished: false,
  })
  const [availableQuestions, setAvailableQuestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadQuestions()
  }, [])

  const loadQuestions = async () => {
    try {
      const response = await questionsAPI.getAll({ limit: 100 })
      setAvailableQuestions(response.data?.data || response.data || [])
    } catch (err) {
      console.error('Error loading questions:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const examData = {
        ...formData,
        attemptLimit: formData.attemptLimit || 0,
        timeLimitMin: formData.timeLimitMin || 0,
      }
      const response = await examsAPI.create(examData)
      navigate(`/exams/${response.data.id}`)
    } catch (err) {
      setError(err.response?.data?.message || 'فشل إنشاء الامتحان')
    } finally {
      setLoading(false)
    }
  }

  const toggleQuestion = (questionId) => {
    setFormData({
      ...formData,
      questions: formData.questions.includes(questionId)
        ? formData.questions.filter((id) => id !== questionId)
        : [...formData.questions, questionId],
    })
  }

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <h1 style={{ marginBottom: '30px' }}>إنشاء امتحان جديد</h1>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="form-group">
            <label>عنوان الامتحان *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>الوصف</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="4"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="form-group">
              <label>عدد المحاولات المسموحة (0 = غير محدود)</label>
              <input
                type="number"
                min="0"
                value={formData.attemptLimit}
                onChange={(e) => setFormData({ ...formData, attemptLimit: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="form-group">
              <label>الوقت بالدقائق (0 = غير محدود)</label>
              <input
                type="number"
                min="0"
                value={formData.timeLimitMin}
                onChange={(e) => setFormData({ ...formData, timeLimitMin: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.isPublished}
                onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
              />
              {' '}نشر الامتحان (متاح للطلاب)
            </label>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>اختر الأسئلة</h3>
          {availableQuestions.length === 0 ? (
            <p>لا توجد أسئلة متاحة. <a href="/questions/create">أنشئ سؤالاً جديداً</a></p>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {availableQuestions.map((question) => (
                <div
                  key={question.id}
                  style={{
                    padding: '15px',
                    border: '2px solid',
                    borderColor: formData.questions.includes(question.id) ? 'var(--primary)' : 'var(--border)',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleQuestion(question.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: '500', marginBottom: '5px' }}>{question.text}</p>
                      <span className="badge badge-info">{question.type}</span>
                      <span className="badge badge-success" style={{ marginRight: '8px' }}>
                        {question.points} نقطة
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.questions.includes(question.id)}
                      onChange={() => toggleQuestion(question.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <p style={{ marginTop: '15px', color: 'var(--text-light)' }}>
            تم اختيار {formData.questions.length} سؤال
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button type="submit" className="btn btn-primary" disabled={loading || formData.questions.length === 0}>
            {loading ? 'جاري الإنشاء...' : 'إنشاء الامتحان'}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('/exams')}
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  )
}


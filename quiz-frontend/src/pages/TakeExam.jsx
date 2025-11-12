import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { attemptsAPI, examsAPI } from '../services/api'

export default function TakeExam({ user }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [exam, setExam] = useState(null)
  const [attempt, setAttempt] = useState(null)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    startAttempt()
  }, [id])

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSubmit()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [timeLeft])

  const startAttempt = async () => {
    try {
      const response = await attemptsAPI.start(id)
      const attemptData = response.data
      setAttempt(attemptData)
      setExam(attemptData.exam)

      if (attemptData.exam.timeLimitMin > 0) {
        const expiresAt = new Date(attemptData.expiresAt)
        const now = new Date()
        const secondsLeft = Math.floor((expiresAt - now) / 1000)
        setTimeLeft(Math.max(0, secondsLeft))
      }

      // تحميل الإجابات المحفوظة
      if (attemptData.answers) {
        const savedAnswers = {}
        attemptData.answers.forEach((ans) => {
          savedAnswers[ans.itemIndex] = ans
        })
        setAnswers(savedAnswers)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'فشل بدء المحاولة')
    } finally {
      setLoading(false)
    }
  }

  const saveAnswer = async (itemIndex, questionId, answerData) => {
    const newAnswers = { ...answers, [itemIndex]: answerData }
    setAnswers(newAnswers)

    try {
      await attemptsAPI.saveAnswer(attempt.id, {
        itemIndex,
        questionId,
        ...answerData,
      })
    } catch (err) {
      console.error('Error saving answer:', err)
    }
  }

  const handleAnswerChange = (itemIndex, question, value) => {
    const questionId = question.id
    let answerData = {}

    if (question.type === 'multiple-choice') {
      answerData = { studentAnswerIndexes: Array.isArray(value) ? value : [value] }
    } else if (question.type === 'true-false') {
      answerData = { studentAnswerBoolean: value }
    } else if (question.type === 'fill-blank') {
      answerData = { studentAnswerText: value }
    }

    saveAnswer(itemIndex, questionId, answerData)
  }

  const handleSubmit = async () => {
    if (submitting) return
    if (!confirm('هل أنت متأكد من تسليم الامتحان؟')) return

    setSubmitting(true)
    try {
      const response = await attemptsAPI.submit(attempt.id)
      navigate(`/attempts/${attempt.id}`)
    } catch (err) {
      setError(err.response?.data?.message || 'فشل تسليم الامتحان')
      setSubmitting(false)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return <div className="loading">جاري تحميل الامتحان...</div>
  }

  if (error || !exam || !attempt) {
    return (
      <div className="container">
        <div className="alert alert-error">{error || 'فشل تحميل الامتحان'}</div>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: '900px' }}>
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>{exam.title}</h1>
          {timeLeft !== null && (
            <div
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: timeLeft < 300 ? 'var(--danger)' : 'var(--primary)',
              }}
            >
              ⏱️ {formatTime(timeLeft)}
            </div>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form>
        {exam.questions?.map((question, index) => (
          <div key={question.id} className="card" style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '15px' }}>
              {index + 1}. {question.text}
            </h3>
            <p style={{ color: 'var(--text-light)', marginBottom: '15px' }}>
              {question.points} نقطة
            </p>

            {question.type === 'multiple-choice' && (
              <div>
                {question.options?.map((option, optIndex) => {
                  const currentAnswer = answers[index]?.studentAnswerIndexes || []
                  const isChecked = currentAnswer.includes(optIndex)
                  return (
                    <label
                      key={optIndex}
                      style={{
                        display: 'block',
                        padding: '12px',
                        marginBottom: '10px',
                        border: '2px solid',
                        borderColor: isChecked ? 'var(--primary)' : 'var(--border)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const current = currentAnswer
                          if (e.target.checked) {
                            handleAnswerChange(index, question, [...current, optIndex])
                          } else {
                            handleAnswerChange(
                              index,
                              question,
                              current.filter((i) => i !== optIndex)
                            )
                          }
                        }}
                        style={{ marginLeft: '10px' }}
                      />
                      {option.text}
                    </label>
                  )
                })}
              </div>
            )}

            {question.type === 'true-false' && (
              <div>
                {[
                  { value: true, label: 'صحيح' },
                  { value: false, label: 'خطأ' },
                ].map((option) => {
                  const currentAnswer = answers[index]?.studentAnswerBoolean
                  return (
                    <label
                      key={option.value}
                      style={{
                        display: 'block',
                        padding: '12px',
                        marginBottom: '10px',
                        border: '2px solid',
                        borderColor: currentAnswer === option.value ? 'var(--primary)' : 'var(--border)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name={`question-${index}`}
                        checked={currentAnswer === option.value}
                        onChange={() => handleAnswerChange(index, question, option.value)}
                        style={{ marginLeft: '10px' }}
                      />
                      {option.label}
                    </label>
                  )
                })}
              </div>
            )}

            {question.type === 'fill-blank' && (
              <textarea
                value={answers[index]?.studentAnswerText || ''}
                onChange={(e) => handleAnswerChange(index, question, e.target.value)}
                rows="4"
                style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px' }}
                placeholder="اكتب إجابتك هنا..."
              />
            )}
          </div>
        ))}

        <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
          <button
            type="button"
            onClick={handleSubmit}
            className="btn btn-success"
            disabled={submitting}
            style={{ fontSize: '18px', padding: '15px 30px' }}
          >
            {submitting ? 'جاري التسليم...' : '✅ تسليم الامتحان'}
          </button>
        </div>
      </form>
    </div>
  )
}


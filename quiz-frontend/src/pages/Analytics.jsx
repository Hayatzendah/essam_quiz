import { useEffect, useState } from 'react'
import { analyticsAPI } from '../services/api'

export default function Analytics({ user }) {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      const response = await analyticsAPI.getOverview()
      setAnalytics(response.data)
    } catch (err) {
      setError(err.response?.data?.message || 'فشل تحميل التحليلات')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">جاري التحميل...</div>
  }

  if (error) {
    return (
      <div className="container">
        <div className="alert alert-error">{error}</div>
      </div>
    )
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '30px' }}>التحليلات</h1>

      {analytics && (
        <div className="grid">
          <div className="card">
            <h3>إجمالي الامتحانات</h3>
            <p style={{ fontSize: '48px', fontWeight: 'bold', color: 'var(--primary)', marginTop: '15px' }}>
              {analytics.totalExams || 0}
            </p>
          </div>

          <div className="card">
            <h3>إجمالي الأسئلة</h3>
            <p style={{ fontSize: '48px', fontWeight: 'bold', color: 'var(--secondary)', marginTop: '15px' }}>
              {analytics.totalQuestions || 0}
            </p>
          </div>

          <div className="card">
            <h3>إجمالي المحاولات</h3>
            <p style={{ fontSize: '48px', fontWeight: 'bold', color: 'var(--success)', marginTop: '15px' }}>
              {analytics.totalAttempts || 0}
            </p>
          </div>

          <div className="card">
            <h3>متوسط الدرجات</h3>
            <p style={{ fontSize: '48px', fontWeight: 'bold', color: 'var(--warning)', marginTop: '15px' }}>
              {analytics.averageScore?.toFixed(1) || 0}%
            </p>
          </div>
        </div>
      )}
    </div>
  )
}


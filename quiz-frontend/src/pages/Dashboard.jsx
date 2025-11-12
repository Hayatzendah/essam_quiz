import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usersAPI, analyticsAPI, examsAPI } from '../services/api'

export default function Dashboard({ user }) {
  const [userInfo, setUserInfo] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [recentExams, setRecentExams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [userRes, examsRes] = await Promise.all([
        usersAPI.getMe(),
        examsAPI.getAll({ limit: 5 }),
      ])
      setUserInfo(userRes.data)

      if (user.role === 'student') {
        setRecentExams(examsRes.data?.data || [])
      } else {
        const analyticsRes = await analyticsAPI.getOverview()
        setAnalytics(analyticsRes.data)
        setRecentExams(examsRes.data?.data || [])
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">جاري التحميل...</div>
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '30px' }}>مرحباً، {userInfo?.email}</h1>

      {user.role === 'student' ? (
        <div>
          <div className="card">
            <h2 style={{ marginBottom: '20px' }}>الامتحانات المتاحة</h2>
            {recentExams.length === 0 ? (
              <p>لا توجد امتحانات متاحة حالياً</p>
            ) : (
              <div className="grid">
                {recentExams.map((exam) => (
                  <div key={exam.id} className="card">
                    <h3>{exam.title}</h3>
                    <p style={{ color: 'var(--text-light)', marginBottom: '15px' }}>
                      {exam.description}
                    </p>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                      <Link to={`/exams/${exam.id}/take`} className="btn btn-primary">
                        بدء الامتحان
                      </Link>
                      <Link to={`/exams/${exam.id}`} className="btn btn-outline">
                        التفاصيل
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          {analytics && (
            <div className="grid" style={{ marginBottom: '30px' }}>
              <div className="card">
                <h3>إجمالي الامتحانات</h3>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--primary)' }}>
                  {analytics.totalExams || 0}
                </p>
              </div>
              <div className="card">
                <h3>إجمالي الأسئلة</h3>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--secondary)' }}>
                  {analytics.totalQuestions || 0}
                </p>
              </div>
              <div className="card">
                <h3>إجمالي المحاولات</h3>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--success)' }}>
                  {analytics.totalAttempts || 0}
                </p>
              </div>
              <div className="card">
                <h3>متوسط الدرجات</h3>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--warning)' }}>
                  {analytics.averageScore?.toFixed(1) || 0}%
                </p>
              </div>
            </div>
          )}

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>آخر الامتحانات</h2>
              <Link to="/exams/create" className="btn btn-primary">
                + إنشاء امتحان جديد
              </Link>
            </div>
            {recentExams.length === 0 ? (
              <p>لا توجد امتحانات بعد</p>
            ) : (
              <div className="grid">
                {recentExams.map((exam) => (
                  <div key={exam.id} className="card">
                    <h3>{exam.title}</h3>
                    <p style={{ color: 'var(--text-light)', marginBottom: '15px' }}>
                      {exam.description}
                    </p>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                      <Link to={`/exams/${exam.id}`} className="btn btn-primary">
                        عرض التفاصيل
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


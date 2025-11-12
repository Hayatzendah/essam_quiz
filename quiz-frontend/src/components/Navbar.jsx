import { Link } from 'react-router-dom'

export default function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to="/dashboard" className="navbar-brand">
          📚 Quiz App
        </Link>
        <div className="navbar-menu">
          <Link to="/dashboard" className="navbar-link">
            الرئيسية
          </Link>
          {user?.role === 'student' && (
            <>
              <Link to="/exams" className="navbar-link">
                الامتحانات
              </Link>
              <Link to="/attempts" className="navbar-link">
                محاولاتي
              </Link>
            </>
          )}
          {(user?.role === 'teacher' || user?.role === 'admin') && (
            <>
              <Link to="/exams" className="navbar-link">
                الامتحانات
              </Link>
              <Link to="/questions" className="navbar-link">
                الأسئلة
              </Link>
              <Link to="/analytics" className="navbar-link">
                التحليلات
              </Link>
            </>
          )}
          <span className="navbar-link" style={{ color: 'var(--primary)' }}>
            {user?.email} ({user?.role})
          </span>
          <button onClick={onLogout} className="btn btn-outline">
            تسجيل الخروج
          </button>
        </div>
      </div>
    </nav>
  )
}


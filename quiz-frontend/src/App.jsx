import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Exams from './pages/Exams'
import ExamDetail from './pages/ExamDetail'
import CreateExam from './pages/CreateExam'
import Questions from './pages/Questions'
import CreateQuestion from './pages/CreateQuestion'
import Attempts from './pages/Attempts'
import AttemptDetail from './pages/AttemptDetail'
import TakeExam from './pages/TakeExam'
import Analytics from './pages/Analytics'
import Navbar from './components/Navbar'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const handleLogin = (userData, tokens) => {
    localStorage.setItem('accessToken', tokens.accessToken)
    localStorage.setItem('refreshToken', tokens.refreshToken)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const handleLogout = async () => {
    try {
      const { authAPI } = await import('./services/api')
      await authAPI.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      setUser(null)
    }
  }

  if (loading) {
    return <div className="loading">جاري التحميل...</div>
  }

  return (
    <BrowserRouter>
      {user && <Navbar user={user} onLogout={handleLogout} />}
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to="/dashboard" /> : <Register onLogin={handleLogin} />}
        />
        <Route
          path="/dashboard"
          element={user ? <Dashboard user={user} /> : <Navigate to="/login" />}
        />
        <Route
          path="/exams"
          element={user ? <Exams user={user} /> : <Navigate to="/login" />}
        />
        <Route
          path="/exams/create"
          element={user ? <CreateExam user={user} /> : <Navigate to="/login" />}
        />
        <Route
          path="/exams/:id"
          element={user ? <ExamDetail user={user} /> : <Navigate to="/login" />}
        />
        <Route
          path="/questions"
          element={user ? <Questions user={user} /> : <Navigate to="/login" />}
        />
        <Route
          path="/questions/create"
          element={user ? <CreateQuestion user={user} /> : <Navigate to="/login" />}
        />
        <Route
          path="/attempts"
          element={user ? <Attempts user={user} /> : <Navigate to="/login" />}
        />
        <Route
          path="/attempts/:id"
          element={user ? <AttemptDetail user={user} /> : <Navigate to="/login" />}
        />
        <Route
          path="/exams/:id/take"
          element={user ? <TakeExam user={user} /> : <Navigate to="/login" />}
        />
        <Route
          path="/analytics"
          element={user ? <Analytics user={user} /> : <Navigate to="/login" />}
        />
        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App


import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.deutsch-tests.com'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// إضافة token تلقائياً للطلبات
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// معالجة الأخطاء وتجديد token تلقائياً
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          })

          const { accessToken } = response.data
          localStorage.setItem('accessToken', accessToken)
          originalRequest.headers.Authorization = `Bearer ${accessToken}`

          return api(originalRequest)
        }
      } catch (refreshError) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  check: (email) => api.get(`/auth/check/${email}`),
}

// Users API
export const usersAPI = {
  getMe: () => api.get('/users/me'),
  updateRole: (id, role) => api.patch(`/users/role/${id}`, { role }),
}

// Exams API
export const examsAPI = {
  getAll: (params) => api.get('/exams', { params }),
  getById: (id) => api.get(`/exams/${id}`),
  create: (data) => api.post('/exams', data),
  update: (id, data) => api.patch(`/exams/${id}`, data),
  assign: (id, data) => api.post(`/exams/${id}/assign`, data),
}

// Questions API
export const questionsAPI = {
  getAll: (params) => api.get('/questions', { params }),
  getById: (id) => api.get(`/questions/${id}`),
  create: (data) => api.post('/questions', data),
  update: (id, data) => api.patch(`/questions/${id}`, data),
  delete: (id, hard = false) => api.delete(`/questions/${id}?hard=${hard}`),
}

// Attempts API
export const attemptsAPI = {
  start: (examId) => api.post('/attempts', { examId }),
  getById: (attemptId) => api.get(`/attempts/${attemptId}`),
  saveAnswer: (attemptId, data) => api.patch(`/attempts/${attemptId}/answer`, data),
  submit: (attemptId) => api.post(`/attempts/${attemptId}/submit`, {}),
  grade: (attemptId, items) => api.post(`/attempts/${attemptId}/grade`, { items }),
}

// Analytics API
export const analyticsAPI = {
  getOverview: () => api.get('/analytics/overview'),
  getExamAnalytics: (examId) => api.get(`/analytics/exam/${examId}`),
  getQuestionAnalytics: (questionId) => api.get(`/analytics/question/${questionId}`),
}

// Media API
export const mediaAPI = {
  upload: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
}

export default api


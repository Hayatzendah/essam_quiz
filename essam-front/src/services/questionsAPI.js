import api from './api';

export const questionsAPI = {
  create: async (questionData) => {
    const response = await api.post('/questions', questionData);
    return response.data;
  },

  getAll: async (params = {}) => {
    const response = await api.get('/questions', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/questions/${id}`);
    return response.data;
  },

  update: async (id, questionData) => {
    const response = await api.patch(`/questions/${id}`, questionData);
    return response.data;
  },

  delete: async (id, hard = false) => {
    const response = await api.delete(`/questions/${id}`, {
      params: { hard },
    });
    return response.data;
  },

  uploadMedia: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // جلب الأسئلة لـ Leben in Deutschland مع فلترة حسب الولاية
  // للطلاب: يتم فرض status: 'published' تلقائياً من الـ Backend
  getLiDQuestions: async (state = null, page = 1, limit = 20) => {
    const params = {
      provider: 'Deutschland-in-Leben',
      status: 'published', // للطلاب: الـ backend يفرضها تلقائياً، لكن نضيفها للتأكيد
      page,
      limit,
    };
    
    if (state) {
      params.state = state; // فلترة حسب الولاية
    }
    
    // استخدام params في Axios لتجنب مشاكل URL breaking
    const response = await api.get('/questions', { params });
    return response.data;
  },

  // إنشاء سؤال مع exam مباشرة
  createWithExam: async (questionData) => {
    const response = await api.post('/questions/with-exam', questionData);
    return response.data;
  },

  // إنشاء ListeningClip
  createListeningClip: async (file, provider, level, teil) => {
    const formData = new FormData();
    formData.append('file', file);
    // provider يجب أن يكون lowercase حسب enum
    formData.append('provider', provider.toLowerCase());
    formData.append('level', level);
    formData.append('teil', teil.toString());
    
    const response = await api.post('/listening-clips', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};


import api from './api';

export const studentsAPI = {
  // الحصول على جميع الطلاب
  getAll: async (params = {}) => {
    const response = await api.get('/admin/students', { params });
    return response.data;
  },

  // الحصول على طالب محدد
  getById: async (id) => {
    const response = await api.get(`/admin/students/${id}`);
    return response.data;
  },

  // الحصول على أداء الطالب
  getStudentPerformance: async (id) => {
    const response = await api.get(`/admin/students/${id}/performance`);
    return response.data;
  },

  // الحصول على محاولات الطالب
  getStudentAttempts: async (id, params = {}) => {
    const response = await api.get(`/admin/students/${id}/attempts`, { params });
    return response.data;
  },

  // الحصول على مهارات الطالب
  getStudentSkills: async (id) => {
    const response = await api.get(`/admin/students/${id}/skills`);
    return response.data;
  },

  // تحديث معلومات الطالب
  update: async (id, studentData) => {
    const response = await api.patch(`/admin/students/${id}`, studentData);
    return response.data;
  },

  // حذف طالب
  delete: async (id) => {
    const response = await api.delete(`/admin/students/${id}`);
    return response.data;
  },
};

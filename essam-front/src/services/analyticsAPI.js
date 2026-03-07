import api from './api';

export const analyticsAPI = {
  // نظرة عامة على الإحصائيات
  getOverview: async () => {
    const response = await api.get('/analytics/overview');
    return response.data;
  },

  // تحليلات امتحان محدد
  getExamAnalytics: async (examId) => {
    const response = await api.get(`/analytics/exam/${examId}`);
    return response.data;
  },

  // تحليلات سؤال محدد
  getQuestionAnalytics: async (questionId) => {
    const response = await api.get(`/analytics/question/${questionId}`);
    return response.data;
  },

  // نشاط الطلاب (آخر 7 أو 30 يوم)
  getStudentActivity: async (days = 7) => {
    const response = await api.get('/analytics/activity', { params: { days } });
    return response.data;
  },

  // نسبة النجاح
  getPassRate: async () => {
    const response = await api.get('/analytics/pass-rate');
    return response.data;
  },

  // أفضل/أسوأ الامتحانات أداءً
  getExamPerformance: async (type = 'best') => {
    const response = await api.get('/analytics/exam-performance', { params: { type } });
    return response.data;
  },

  // إحصائيات تفصيلية لكل Skill
  getSkillStats: async () => {
    const response = await api.get('/analytics/skills');
    return response.data;
  },

  // إحصائيات على مستوى الأسئلة
  getQuestionStats: async () => {
    const response = await api.get('/analytics/questions');
    return response.data;
  },
};























import api from './api';

export const usersAPI = {
  // الحصول على معلومات المستخدم الحالي
  getMe: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },

  // تحديث ولاية المستخدم
  updateState: async (state) => {
    const response = await api.patch('/users/me/state', { state });
    return response.data;
  },

  // رفع صورة البروفايل
  uploadProfilePicture: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.patch('/users/me/profile-picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};




















import api from './api';

export const levelsAPI = {
  getAll: async () => {
    const response = await api.get('/levels');
    return response.data;
  },

  getAllAdmin: async () => {
    const response = await api.get('/levels/all');
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/levels', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.patch(`/levels/${id}`, data);
    return response.data;
  },

  reorder: async (levelIds) => {
    const response = await api.patch('/levels/reorder', { levelIds });
    return response.data;
  },

  delete: async (id, reassignTo) => {
    const response = await api.delete(`/levels/${id}`, {
      data: { reassignTo },
    });
    return response.data;
  },

  getItemCount: async (id) => {
    const response = await api.get(`/levels/${id}/count`);
    return response.data;
  },

  getSections: async () => {
    const response = await api.get('/levels/sections');
    return response.data;
  },
};

import axios from 'axios';
import DOMPurify from 'dompurify';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const sanitize = (input: string): string => DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });

export const apiService = {
  // Authentication
  register: async (data: any) => (await api.post('/auth/register', data)).data,
  login: async (data: any) => {
    const response = (await api.post('/auth/login', data)).data;
    if (response.access_token) {
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user || {}));
    }
    return response;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  getCurrentUser: async () => (await api.get('/auth/me')).data,
  
  // Predictions
  createPrediction: async (data: any) => (await api.post('/predictions', data)).data,
  batchPredictions: async (data: any) => (await api.post('/predictions/batch', data)).data,
  getPredictions: async (params?: any) => (await api.get('/predictions', { params })).data,
  getPrediction: async (id: number) => (await api.get(`/predictions/${id}`)).data,
  
  // Alerts
  getActiveAlerts: async (params?: any) => (await api.get('/alerts', { params })).data,
  
  // GIS
  getDykeRecommendations: async (data: any) => (await api.post('/recommendations/dyke-placement', data)).data,
  
  // Feedback
  submitFeedback: async (data: any) => (await api.post('/feedback', { ...data, comments: data.comments ? sanitize(data.comments) : undefined })).data,
  getFeedback: async (params?: any) => (await api.get('/feedback', { params })).data,
  
  // Users
  getUsers: async (params?: any) => (await api.get('/users', { params })).data,
  getUser: async (id: number) => (await api.get(`/users/${id}`)).data,
  updateUser: async (id: number, data: any) => (await api.put(`/users/${id}`, data)).data,
  deleteUser: async (id: number) => (await api.delete(`/users/${id}`)).data,
  
  // Flood Events
  createFloodEvent: async (data: any) => (await api.post('/flood-events', data)).data,
  getFloodEvents: async (params?: any) => (await api.get('/flood-events', { params })).data,
  getFloodEvent: async (id: number) => (await api.get(`/flood-events/${id}`)).data,
  
  // Statistics
  getSystemStats: async () => (await api.get('/stats/system')).data,
  
  // Health
  healthCheck: async () => (await api.get('/health')).data
};

export default api;

import axios from 'axios';
import DOMPurify from 'dompurify';

// Use environment variable or fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000, // 5 seconds - aggressive timeout for faster failures
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor for authentication
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

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
    localStorage.removeItem('userRole');
  },
  getCurrentUser: async () => (await api.get('/auth/me')).data,

  // Predictions - Enhanced with real-time data
  createPrediction: async (lat: number, lng: number, modelType: string = 'ensemble', leadTime: number = 48) => {
    const response = await api.post('/predictions', {
      latitude: lat,
      longitude: lng,
      model_type: modelType,
      lead_time_hours: leadTime,
      timestamp: new Date().toISOString()
    });
    return response.data;
  },
  batchPredictions: async (data: any) => (await api.post('/predictions/batch', data)).data,
  getPredictions: async (params?: any) => (await api.get('/predictions', { params })).data,
  getPrediction: async (id: number) => (await api.get(`/predictions/${id}`)).data,
  updatePrediction: async (id: number, data: any) => (await api.put(`/predictions/${id}`, data)).data,
  deletePrediction: async (id: number) => (await api.delete(`/predictions/${id}`)).data,

  // Alerts - Enhanced with real-time updates
  getActiveAlerts: async (params?: any) => (await api.get('/alerts', { params })).data,
  createAlert: async (data: any) => (await api.post('/alerts', data)).data,
  updateAlert: async (id: number, data: any) => (await api.put(`/alerts/${id}`, data)).data,
  deleteAlert: async (id: number) => (await api.delete(`/alerts/${id}`)).data,
  getAlertHistory: async (params?: any) => (await api.get('/alerts/history', { params })).data,

  // Real-time flood monitoring
  getFloodStatus: async () => (await api.get('/flood/status')).data,
  getFloodRiskLevels: async (bounds?: any) => (await api.get('/flood/risk-levels', { params: bounds })).data,
  getFloodPredictions: async (bounds?: any) => (await api.get('/flood/predictions', { params: bounds })).data,

  // GIS and Mapping
  analyzeLocation: async (lat: number, lng: number) => (await api.post('/gis/analyze', { latitude: lat, longitude: lng })).data,
  getDykeRecommendations: async (data: any) => (await api.post('/recommendations/dyke-placement', data)).data,
  getFloodZones: async (bounds?: any) => (await api.get('/gis/flood-zones', { params: bounds })).data,
  getElevationData: async (lat: number, lng: number) => (await api.get(`/gis/elevation?lat=${lat}&lng=${lng}`)).data,
  getWaterBodies: async (bounds?: any) => (await api.get('/gis/water-bodies', { params: bounds })).data,

  // Verification
  verifyPrediction: async (id: number, verification: any) => (await api.post(`/predictions/${id}/verify`, verification)).data,

  // Feedback and Reports
  submitFeedback: async (data: any) => (await api.post('/feedback', { ...data, comments: data.comments ? sanitize(data.comments) : undefined })).data,
  getFeedback: async (params?: any) => (await api.get('/feedback', { params })).data,
  submitReport: async (data: any) => (await api.post('/reports', data)).data,
  getReports: async (params?: any) => (await api.get('/reports', { params })).data,

  // Users Management
  getUsers: async (params?: any) => (await api.get('/users', { params })).data,
  getUser: async (id: number) => (await api.get(`/users/${id}`)).data,
  updateUser: async (id: number, data: any) => (await api.put(`/users/${id}`, data)).data,
  deleteUser: async (id: number) => (await api.delete(`/users/${id}`)).data,
  updateUserProfile: async (data: any) => (await api.put('/users/profile', data)).data,

  // Flood Events - Enhanced
  createFloodEvent: async (data: any) => (await api.post('/flood-events', data)).data,
  getFloodEvents: async (params?: any) => (await api.get('/flood-events', { params })).data,
  getFloodEvent: async (id: number) => (await api.get(`/flood-events/${id}`)).data,
  updateFloodEvent: async (id: number, data: any) => (await api.put(`/flood-events/${id}`, data)).data,
  deleteFloodEvent: async (id: number) => (await api.delete(`/flood-events/${id}`)).data,

  // Statistics - Enhanced with real-time data
  getSystemStats: async () => (await api.get('/stats/system')).data,
  getFloodStats: async (params?: any) => (await api.get('/stats/flood', { params })).data,
  getPredictionStats: async (params?: any) => (await api.get('/stats/predictions', { params })).data,
  getStateStats: async (state?: string) => state ? (await api.get('/stats/state', { params: { state } })).data : (await api.get('/stats/state')).data,
  getModelStats: async (n: number = 500) => {
    const timestamp = Date.now();
    return (await api.get('/stats/models', { params: { n, _t: timestamp } })).data;
  },
  getValidatedModelStats: async () => (await api.get('/stats/models/validated')).data,
  getAlertStats: async (params?: any) => (await api.get('/stats/alerts', { params })).data,
  getTimeSeriesStats: async (days: number = 7) => (await api.get('/stats/time-series', { params: { days } })).data,

  // Web Push
  pushSubscribe: async (subscription: any) => (await api.post('/push/subscribe', subscription)).data,
  pushUnsubscribe: async (endpoint: string) => (await api.post('/push/unsubscribe', { endpoint })).data,
  pushTest: async () => (await api.post('/push/test')).data,

  // Notifications
  getNotifications: async (params?: any) => (await api.get('/notifications', { params })).data,
  markNotificationRead: async (id: number) => (await api.put(`/notifications/${id}/read`)).data,
  markAllNotificationsRead: async () => (await api.put('/notifications/read-all')).data,
  createNotification: async (data: any) => (await api.post('/notifications', data)).data,

  // Settings and Configuration
  getSettings: async () => (await api.get('/settings')).data,
  updateSettings: async (data: any) => (await api.put('/settings', data)).data,
  getSystemSettings: async () => (await api.get('/system/settings')).data,
  updateSystemSettings: async (data: any) => (await api.post('/system/settings', data)).data,
  getAppConfig: async () => (await api.get('/config')).data,

  // Health and Status
  healthCheck: async () => (await api.get('/health')).data,
  getSystemStatus: async () => (await api.get('/status')).data,

  // Data Export
  exportData: async (type: string, params?: any) => {
    const response = await api.get(`/export/${type}`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  // Offline Support
  getOfflineData: async () => (await api.get('/offline/data')).data,
  syncOfflineData: async (data: any) => (await api.post('/offline/sync', data)).data,

  // Weather and Environmental Data
  getWeatherData: async (lat: number, lng: number) => (await api.get(`/weather?lat=${lat}&lng=${lng}`)).data,
  getRainfallData: async (params?: any) => (await api.get('/weather/rainfall', { params })).data,
  getEnvironmentalData: async (bounds?: any) => (await api.get('/environmental', { params: bounds })).data
};

export default api;
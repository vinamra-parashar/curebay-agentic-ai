import axios from 'axios';
import { baseUrl } from '../url';

const api = axios.create({
  baseURL: baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Patient APIs
export const patientAPI = {
  getAllPatients: () => api.get('/patients'),
  getPatientById: (id) => api.get(`/patients/${id}`),
  createPatient: (data) => api.post('/patients', data),
};

// Order APIs
export const orderAPI = {
  getAllOrders: () => api.get('/orders'),
  getOrderById: (id) => api.get(`/orders/${id}`),
  createOrder: (data) => api.post('/orders', data),
  updateOrder: (id, data) => api.put(`/orders/${id}`, data),
  addTestToOrder: (id, testName) => api.post(`/orders/${id}/add-test`, { testName }),
};

// Test APIs
export const testAPI = {
  getAllTests: () => api.get('/tests'),
  getTestById: (id) => api.get(`/tests/${id}`),
  createTest: (data) => api.post('/tests', data),
};

// Medical History APIs
export const medicalHistoryAPI = {
  getMedicalHistoryByPatientId: (id) => api.get(`/medical-history/${id}`),
  createMedicalHistory: (data) => api.post('/medical-history', data),
  updateMedicalHistory: (id, data) => api.put(`/medical-history/${id}`, data),
};

// Gap Analysis APIs
export const gapAnalysisAPI = {
  analyzeOrderGaps: (orderId) => api.get(`/gap-analysis/order/${orderId}`),
  analyzePatientGaps: (patientId) => api.get(`/gap-analysis/patient/${patientId}`),
  getRecommendationRules: () => api.get('/gap-analysis/rules'),
};

// Agent APIs
export const agentAPI = {
  analyzeOrderWithAgent: (orderId) => api.post(`/agent/analyze/${orderId}`),
  initiateConfirmation: (orderId) => api.post(`/agent/confirm/initiate/${orderId}`),
  processPatientConfirmation: (sessionId, data) => api.post(`/agent/confirm/${sessionId}`, data),
  getSessionStatus: (sessionId) => api.get(`/agent/confirm/${sessionId}/status`),
  getAgentStatus: () => api.get('/agent/status'),
};

// Agent Logs APIs
export const agentLogsAPI = {
  getLogsBySession: (sessionId) => api.get(`/agent-logs/session/${sessionId}`),
  getLogsByOrder: (orderId) => api.get(`/agent-logs/order/${orderId}`),
  getLogsByPatient: (patientId, limit = 50) => api.get(`/agent-logs/patient/${patientId}?limit=${limit}`),
  getSessionSummary: (sessionId) => api.get(`/agent-logs/session/${sessionId}/summary`),
  getRecentLogs: (limit = 20) => api.get(`/agent-logs/recent?limit=${limit}`),
  getLogsByEventType: (eventType, limit = 100) => api.get(`/agent-logs/event/${eventType}?limit=${limit}`),
  getLogsByDateRange: (startDate, endDate) => api.get(`/agent-logs/date-range?startDate=${startDate}&endDate=${endDate}`),
  getStatistics: (startDate, endDate) => api.get(`/agent-logs/statistics${startDate ? `?startDate=${startDate}&endDate=${endDate}` : ''}`),
};

export default api;

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Assignments API
export const getAssignments = () => api.get('/assignments');
export const getAssignment = (id) => api.get(`/assignments/${id}`);
export const getAssignmentProgress = (id, userId = 'anonymous') => 
  api.get(`/assignments/${id}/progress`, { params: { userId } });
export const saveAssignmentProgress = (id, data, userId = 'anonymous') => 
  api.post(`/assignments/${id}/progress`, { ...data, userId });

// Query API
export const executeQuery = (assignmentId, query) => 
  api.post('/query/execute', { assignmentId, query });

// Hints API
export const getHint = (assignmentId, query = '') => 
  api.post('/hints', { assignmentId, query });

// Submit API
export const submitQuery = (assignmentId, query, userId = 'anonymous') => 
  api.post('/submit', { assignmentId, query, userId });

export default api;



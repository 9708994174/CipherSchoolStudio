import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000, // 30 second timeout
  withCredentials: false
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add request interceptor for debugging (after token interceptor)
api.interceptors.request.use(
  (config) => {
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401) {
      // Clear invalid token
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login if not already there
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login';
      }
    }
    
    // Handle network errors
    if (!error.response) {
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        error.userMessage = 'Cannot connect to server. Please ensure the backend server is running on port 5000.';
      } else if (error.code === 'ETIMEDOUT') {
        error.userMessage = 'Request timed out. The server is taking too long to respond.';
      } else {
        error.userMessage = 'Network error. Please check your internet connection and ensure the server is running.';
      }
      console.error('[API Network Error]', error);
    } else {
      // Handle HTTP errors
      error.userMessage = error.response?.data?.error || 
                         error.response?.data?.message || 
                         `Server error: ${error.response.status} ${error.response.statusText}`;
      console.error('[API HTTP Error]', error.response?.status, error.response?.data);
    }
    return Promise.reject(error);
  }
);

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

// Health check API
export const checkServerHealth = () => 
  api.get('/health');

// Auth API
export const signup = (username, email, password) => 
  api.post('/auth/signup', { username, email, password });

export const login = (email, password) => 
  api.post('/auth/login', { email, password });

export const getCurrentUser = (token) => {
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  return api.get('/auth/me', config);
};

export default api;



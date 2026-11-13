import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000
});

// Request interceptor: attach token from localStorage if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('busgo_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: unwrap data and normalize error payloads
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // If token is invalid or expired, clear it
    if (error.response?.status === 401) {
      localStorage.removeItem('busgo_token');
      localStorage.removeItem('busgo_user');
    }

    const errorPayload = {
      status: error.response?.status || 500,
      code: error.response?.data?.code || null,
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        'An unexpected network error occurred. Please check your connection.',
      errors: error.response?.data?.errors || null
    };

    return Promise.reject(errorPayload);
  }
);

// Health check service helper
export const checkApiHealth = async () => {
  return await api.get('/health');
};

export default api;

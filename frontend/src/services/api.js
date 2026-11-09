import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Response interceptor for standard error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorPayload = {
      status: error.response?.status || 500,
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


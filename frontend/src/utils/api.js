import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 15000,
});

// ─── Request interceptor: attach token ───────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('gathalok_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

// ─── Response interceptor: handle 401 ────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('gathalok_token');
      localStorage.removeItem('gathalok_user');
      // Dispatch logout if needed — handled in components
    }
    return Promise.reject(err);
  }
);

export default api;

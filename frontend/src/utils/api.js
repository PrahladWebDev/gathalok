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

// Lets the store register what should happen when the session expires,
// without api.js importing the store (that would be a circular import).
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

// 401s from these endpoints are normal failures (wrong password etc.), not an expired session.
const NON_SESSION_401 = ['/auth/login', '/auth/register', '/auth/password'];

// ─── Response interceptor: handle 401 ────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    const hadToken = !!err.config?.headers?.Authorization;
    if (
      err.response?.status === 401 &&
      hadToken &&
      !NON_SESSION_401.some((u) => url.includes(u))
    ) {
      localStorage.removeItem('gathalok_token');
      localStorage.removeItem('gathalok_user');
      if (onUnauthorized) onUnauthorized();
    }
    return Promise.reject(err);
  }
);

export default api;

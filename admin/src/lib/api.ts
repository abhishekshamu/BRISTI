import axios from 'axios';

export const FRONTEND_URL: string = (import.meta as any).env?.VITE_FRONTEND_URL ?? 'http://localhost:3000';

// Origin of the backend API. In production set VITE_API_URL (e.g.
// https://bristi-backend.onrender.com); when empty the same-origin /api path is
// used, which the Vite dev server proxies to the local backend (localhost:5000).
const API_ORIGIN: string = String((import.meta as any).env?.VITE_API_URL || '').replace(/\/+$/, '');

// Resolves to `${VITE_API_URL}/api` in production, or '/api' in development.
// A trailing /api in VITE_API_URL is tolerated — never produces /api/api.
function resolveApiBaseUrl(): string {
  if (!API_ORIGIN) return '/api';
  return `${API_ORIGIN.replace(/\/api$/i, '')}/api`;
}

export const API_BASE_URL = resolveApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  // Admin session lives in httpOnly cookies; CSRF token double-submitted from
  // the bistr_xsrf cookie on every state-changing request.
  xsrfCookieName: 'bristi_xsrf',
  xsrfHeaderName: 'X-XSRF-TOKEN',
});

api.interceptors.request.use((config) => {
  // Never force a JSON Content-Type by default. Axios auto-serializes objects
  // to JSON and adds application/json itself; for FormData (multipart uploads)
  // the browser must set the multipart/form-data + boundary header instead.
  // A global application/json header previously destroyed FormData uploads by
  // JSON-serializing File objects into empty objects ("A file is required").
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config;
    if (error.response?.status === 401) {
      const bootRequest = (config?.url ?? '').includes('/admin/me');
      if (!bootRequest && window.location.pathname !== '/login') {
        localStorage.removeItem('admin_user');
        window.location.href = '/login';
      }
    }
    // Diagnostics for network/CORS failures (login "Network Error" etc.).
    // Logs the request target and outcome — never cookies, tokens or bodies.
    if (!error.response) {
      console.error(
        '[API] request failed before receiving a response',
        {
          method: config?.method?.toUpperCase(),
          url: `${config?.baseURL ?? ''}${config?.url ?? ''}`,
          withCredentials: config?.withCredentials,
          code: error.code,
          message: error.message,
        },
      );
    }
    return Promise.reject(error);
  }
);

export function getApiError(error: unknown, fallback = 'Something went wrong'): string {
  const err = error as any;
  const data = err?.response?.data;
  if (typeof data === 'string' && data) return data;
  if (typeof data?.message === 'string' && data.message) return data.message;
  if (typeof data?.error === 'string' && data.error) return data.error;
  if (Array.isArray(data?.errors) && data.errors.length && typeof data.errors[0]?.msg === 'string') {
    return data.errors[0].msg;
  }
  if (err?.response) {
    const status = err.response.status;
    if (status === 401) return 'Invalid email or password';
    if (status === 403) return 'Access denied for this account';
    if (status === 404) return 'API route not found — check the backend API URL';
    if (status >= 500) return 'Backend error — please try again later';
  }
  // No HTTP response: the request never reached the backend (offline, wrong
  // API URL, CORS preflight rejected, or the backend is unreachable).
  if (typeof err?.message === 'string' && err.message) return `Cannot reach the backend server (${err.message})`;
  return fallback;
}

export default api;
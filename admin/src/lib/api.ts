import axios from 'axios';

export const FRONTEND_URL: string = (import.meta as any).env?.VITE_FRONTEND_URL ?? 'http://localhost:3000';

export const API_BASE_URL = '/api';

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
    if (error.response?.status === 401) {
      const bootRequest = (error.config?.url ?? '').includes('/admin/me');
      if (!bootRequest && window.location.pathname !== '/login') {
        localStorage.removeItem('admin_user');
        window.location.href = '/login';
      }
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
  if (typeof err?.message === 'string' && err.message) return err.message;
  return fallback;
}

export default api;
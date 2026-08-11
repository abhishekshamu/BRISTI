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

// Cross-site (admin on vercel.app, API on onrender.com): the bistr_xsrf cookie
// is host-only on the API, so document.cookie never exposes it to this app.
// The backend echoes the same value in the X-Bristi-Csrf-Token response header
// (CORS-exposed); capture it here and double-submit it on every request. In
// same-origin development the axios cookie reader still works and both paths
// carry the identical value.
let csrfToken: string | null = null;
let csrfBootstrap: Promise<string | null> | null = null;

function captureCsrfToken(response?: { headers?: Record<string, unknown> }): void {
  const echoed = response?.headers?.['x-bristi-csrf-token'];
  if (typeof echoed === 'string' && echoed.length > 0) {
    csrfToken = echoed;
  }
}

// Obtains the CSRF token before the first state-changing request if it has not
// been captured yet (e.g. upload fired before any API response was received).
// Uses the authenticated boot endpoint — a safe GET whose response always
// echoes X-Bristi-Csrf-Token. The X-Skip-Csrf-Bootstrap header prevents
// recursion and is stripped before the request leaves the app.
async function ensureCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  if (!csrfBootstrap) {
    csrfBootstrap = (async () => {
      try {
        await api.get('/admin/me', { headers: { 'X-Skip-Csrf-Bootstrap': '1' } });
      } catch {
        // A 401 on the boot check still echoes X-Bristi-Csrf-Token; ignore errors.
      }
      return csrfToken;
    })().finally(() => {
      csrfBootstrap = null;
    });
  }
  return csrfBootstrap;
}

api.interceptors.request.use(async (config) => {
  // Never force a JSON Content-Type by default. Axios auto-serializes objects
  // to JSON and adds application/json itself; for FormData (multipart uploads)
  // the browser must set the multipart/form-data + boundary header instead.
  // A global application/json header previously destroyed FormData uploads by
  // JSON-serializing File objects into empty objects ("A file is required").
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  if (config.headers['X-Skip-Csrf-Bootstrap']) {
    delete config.headers['X-Skip-Csrf-Bootstrap'];
    return config;
  }
  const token = csrfToken ?? (await ensureCsrfToken());
  if (token) {
    config.headers['X-XSRF-TOKEN'] = token;
  } else {
    // Safe diagnostics: presence only — never the token value.
    console.log(`[api] csrf-present=false method=${(config.method ?? 'GET').toUpperCase()} url=${config.url ?? ''}`);
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    captureCsrfToken(response as { headers?: Record<string, unknown> });
    return response;
  },
  (error) => {
    captureCsrfToken(error.response);
    const config = error.config;
    const data = error.response?.data;
    // The backend's express-validator rejects return { success, errors: [...] }
    // without a message field; normalize so every consumer showing
    // data.message / data.error surfaces the real validation reason instead of
    // a generic fallback.
    if (
      data &&
      typeof data === 'object' &&
      !data.message &&
      !data.error &&
      Array.isArray(data.errors) &&
      data.errors.length > 0
    ) {
      const firstError = typeof data.errors[0]?.msg === 'string' ? data.errors[0].msg : 'Request validation failed';
      data.message = firstError;
      data.error = firstError;
    }
    // Self-heal a CSRF 403: the echoed token may be stale (session cookie outlives
    // the session-scoped xsrf cookie across browser restarts, tab restores, cookie
    // eviction). Re-capture via the boot endpoint and retry once with the fresh token.
    const method = String(config?.method ?? 'get').toLowerCase();
    const isStateChange = config && !['get', 'head', 'options'].includes(method);
    const csrfFailure = error.response?.status === 403 && /csrf/i.test(String(data?.message ?? ''));
    if (isStateChange && csrfFailure && config && !(config as any).__csrfRetried) {
      (config as any).__csrfRetried = true;
      csrfToken = null;
      return ensureCsrfToken().then(() => api(config));
    }
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
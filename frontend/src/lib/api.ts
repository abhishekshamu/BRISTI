import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

export const AUTH_EXPIRED_EVENT = 'bristi:auth-expired';

export function notifyAuthExpired(): void {
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

// Origin of the backend API. In production / when the API is hosted separately,
// set VITE_API_BASE_URL (e.g. https://bristi-backend.onrender.com); otherwise the
// same-origin /api path is used (dev: proxied by Vite).
const API_ORIGIN: string = String((import.meta as any).env?.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export const api: AxiosInstance = axios.create({
  baseURL: API_ORIGIN ? `${API_ORIGIN}/api` : '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 30000,
  // Tokens live in httpOnly cookies; the CSRF token is double-submitted from
  // the bristi_xsrf cookie on every state-changing request.
  xsrfCookieName: 'bristi_xsrf',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  // Arrays serialize as repeated params (categories=a&categories=b) —
  // no [] brackets, so the backend sees a plain repeated-param array.
  paramsSerializer: { indexes: null },
});

let refreshPromise: Promise<boolean> | null = null;

// Cross-site (frontend on Vercel, API on Render): the bistr_xsrf cookie is
// host-only on the API host, so document.cookie never exposes it to this app.
// The backend echoes the same value in the X-Bristi-Csrf-Token response header
// (CORS-exposed); capture it here and double-submit it on every request.
let csrfToken: string | null = null;
let csrfBootstrap: Promise<string | null> | null = null;

function captureCsrfToken(response?: { headers?: Record<string, unknown> }): void {
  const echoed = response?.headers?.['x-bristi-csrf-token'];
  if (typeof echoed === 'string' && echoed.length > 0) {
    csrfToken = echoed;
  }
}

// Obtains the CSRF token before the first state-changing request if it has not
// been captured yet. Uses a safe GET whose response always echoes
// X-Bristi-Csrf-Token. The X-Skip-Csrf-Bootstrap header prevents recursion and
// is stripped before the request leaves the app.
async function ensureCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  if (!csrfBootstrap) {
    csrfBootstrap = (async () => {
      try {
        await api.get('/auth/me', { headers: { 'X-Skip-Csrf-Bootstrap': '1' } });
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
  if (config.headers['X-Skip-Csrf-Bootstrap']) {
    delete config.headers['X-Skip-Csrf-Bootstrap'];
    return config;
  }
  const token = csrfToken ?? (await ensureCsrfToken());
  if (token) {
    config.headers['X-XSRF-TOKEN'] = token;
  }
  return config;
});

async function refreshAccessToken(): Promise<boolean> {
  try {
    // The refresh token is an httpOnly cookie; the server rotates both cookies.
    const response = await api.post('/auth/refresh-token', {});
    return Boolean(response.data?.data?.accessToken);
  } catch {
    notifyAuthExpired();
    return false;
  }
}

api.interceptors.response.use(
  (response) => {
    captureCsrfToken(response as { headers?: Record<string, unknown> });
    return response;
  },
  async (error: AxiosError) => {
    captureCsrfToken(error.response);
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const url = original?.url ?? '';
    // The backend's express-validator rejects return { success, errors: [...] }
    // without a message field; normalize so consumers showing data.message
    // surface the real validation reason instead of a generic fallback.
    const data = error.response?.data as any;
    if (
      data &&
      typeof data === 'object' &&
      !data.message &&
      !data.error &&
      Array.isArray(data.errors) &&
      data.errors.length > 0
    ) {
      data.message = typeof data.errors[0]?.msg === 'string' ? data.errors[0].msg : 'Request validation failed';
    }
    // Self-heal a CSRF 403: the echoed token may be stale (session cookies
    // outlive the session-scoped xsrf cookie across browser restarts).
    // Re-capture via the boot endpoint and retry once with the fresh token.
    const method = String(original?.method ?? 'get').toLowerCase();
    const isStateChange = original && !['get', 'head', 'options'].includes(method);
    const csrfFailure = error.response?.status === 403 && /csrf/i.test(String(data?.message ?? ''));
    if (isStateChange && csrfFailure && original && !(original as any).__csrfRetried) {
      (original as any).__csrfRetried = true;
      csrfToken = null;
      return ensureCsrfToken().then(() => api(original));
    }
    const anonymousProbe = /\/auth\/me$|\/users\/profile$/.test(url);
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !anonymousProbe &&
      !url.includes('/auth/login') &&
      !url.includes('/auth/register') &&
      !url.includes('/auth/refresh-token')
    ) {
      original._retry = true;
      refreshPromise = refreshPromise ?? refreshAccessToken();
      const ok = await refreshPromise;
      refreshPromise = null;
      if (ok) {
        return api(original);
      }
    }
    // Diagnostics: surface failed requests so API integration issues are easy to spot.
    console.error(
      `[API ${original?.method?.toUpperCase() ?? 'REQ'} ${original?.baseURL ?? ''}${url}]`,
      error.response ? `HTTP ${error.response.status}` : error.message,
      error.response?.data ?? '',
    );
    return Promise.reject(error);
  },
);

export async function apiRequest<T>(request: Promise<{ data: T }>): Promise<T> {
  const { data } = await request;
  return data;
}

export function apiData<T>(data: { success: boolean; data: T }): T {
  return data.data;
}

import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

export const AUTH_EXPIRED_EVENT = 'bristi:auth-expired';

export function notifyAuthExpired(): void {
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

export const api: AxiosInstance = axios.create({
  baseURL: '/api',
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
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const url = original?.url ?? '';
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

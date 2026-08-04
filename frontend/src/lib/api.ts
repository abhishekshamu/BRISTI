import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

const ACCESS_TOKEN_KEY = 'bristi_access_token';
const REFRESH_TOKEN_KEY = 'bristi_refresh_token';

export const AUTH_EXPIRED_EVENT = 'bristi:auth-expired';

export function notifyAuthExpired(): void {
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

export const tokenStorage = {
  getAccessToken: (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (accessToken: string, refreshToken?: string): void => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  setAccessToken: (accessToken: string): void => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  },
  clear: (): void => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

export const api: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
  timeout: 30000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return null;
  try {
    const response = await axios.post('/api/auth/refresh', { refreshToken });
    const accessToken = response.data?.data?.accessToken;
    if (accessToken) {
      tokenStorage.setAccessToken(accessToken);
      return accessToken;
    }
    notifyAuthExpired();
    return null;
  } catch {
    tokenStorage.clear();
    notifyAuthExpired();
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retry && !original.url?.includes('/auth/login')) {
      original._retry = true;
      if (!tokenStorage.getRefreshToken()) {
        notifyAuthExpired();
        return Promise.reject(error);
      }
      refreshPromise = refreshPromise ?? refreshAccessToken();
      const newToken = await refreshPromise;
      refreshPromise = null;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
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

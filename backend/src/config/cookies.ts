import { Response } from 'express';
import { CookieOptions } from 'express';

export const ACCESS_TOKEN_COOKIE = 'bristi_access_token';
export const REFRESH_TOKEN_COOKIE = 'bristi_refresh_token';
export const CSRF_COOKIE = 'bristi_xsrf';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const secureOptions = (httpOnly: boolean, maxAge: number): CookieOptions => ({
  httpOnly,
  secure: IS_PRODUCTION,
  sameSite: 'lax',
  path: '/',
  maxAge,
});

const daysFromEnv = (value: string | undefined, fallback: number): number => {
  const days = Number.parseInt(value || '', 10);
  return Number.isFinite(days) && days > 0 ? days : fallback;
};

const accessMaxAge = (): number =>
  daysFromEnv(process.env.JWT_EXPIRE, 30) * 24 * 60 * 60 * 1000;

const refreshMaxAge = (): number =>
  daysFromEnv(process.env.JWT_REFRESH_TOKEN_DAYS || process.env.JWT_REFRESH_EXPIRE, 60) * 24 * 60 * 60 * 1000;

export const csrfCookieOptions = (): CookieOptions => ({
  httpOnly: false,
  secure: IS_PRODUCTION,
  sameSite: 'lax',
  path: '/',
});

export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string): void => {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, secureOptions(true, accessMaxAge()));
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, secureOptions(true, refreshMaxAge()));
};

export const clearAuthCookies = (res: Response): void => {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });
};

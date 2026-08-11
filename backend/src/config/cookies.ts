import { Response } from 'express';
import { CookieOptions } from 'express';

export const ACCESS_TOKEN_COOKIE = 'bristi_access_token';
export const REFRESH_TOKEN_COOKIE = 'bristi_refresh_token';
export const CSRF_COOKIE = 'bristi_xsrf';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Cross-site deployments (storefront/admin on Vercel, API on Render) require
// SameSite=None cookies. Production defaults to 'none' so authentication works
// cross-site out of the box; set COOKIE_SAME_SITE=lax|strict to override.
const sameSite = (): CookieOptions['sameSite'] => {
  const configured = (process.env.COOKIE_SAME_SITE || '').toLowerCase();
  if (configured === 'none' || configured === 'strict' || configured === 'lax') {
    return configured;
  }
  return IS_PRODUCTION ? 'none' : 'lax';
};

// Modern browsers block third-party cookies by default (Chrome, Safari ITP,
// Firefox ETP). For cross-site SameSite=None cookies that is fatal: the
// browser silently drops the Set-Cookie and the session never persists.
// The `Partitioned` (CHIPS) attribute fixes this — the cookie is stored and
// sent per top-level site, so an admin session set while the top-level site
// is the admin panel survives third-party cookie blocking. Browsers that do
// not support Partitioned (pre-2023) ignore the attribute and treat it as a
// regular SameSite=None cookie, which they still accept.
const isCrossSite = (): boolean => sameSite() === 'none';

const partitioned = (): boolean | undefined => (isCrossSite() ? true : undefined);

export const getCookieConfig = () => ({
  sameSite: sameSite(),
  secure: IS_PRODUCTION,
  httpOnly: true,
  partitioned: partitioned(),
});

const secureOptions = (httpOnly: boolean, maxAge: number): CookieOptions => ({
  httpOnly,
  secure: IS_PRODUCTION,
  sameSite: sameSite(),
  partitioned: partitioned(),
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
  sameSite: sameSite(),
  partitioned: partitioned(),
  path: '/',
});

export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string): void => {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, secureOptions(true, accessMaxAge()));
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, secureOptions(true, refreshMaxAge()));
};

export const clearAuthCookies = (res: Response): void => {
  // Deleting a cookie requires the exact same attributes it was set with —
  // including Partitioned — or the browser cannot match and remove it.
  const opts: CookieOptions = { path: '/', partitioned: partitioned() };
  res.clearCookie(ACCESS_TOKEN_COOKIE, opts);
  res.clearCookie(REFRESH_TOKEN_COOKIE, opts);
};

import { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';
import {
  ACCESS_TOKEN_COOKIE,
  CSRF_COOKIE,
  REFRESH_TOKEN_COOKIE,
  csrfCookieOptions,
} from '../config/cookies';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_HEADER = 'x-xsrf-token';

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length || ab.length === 0 || bb.length === 0) {
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * Double-submit CSRF protection.
 *
 * A non-httpOnly `bristi_xsrf` cookie is issued on every API response so the
 * browser's JavaScript can read it and send it back as `X-XSRF-TOKEN` (axios
 * does this automatically when `xsrfCookieName`/`xsrfHeaderName` are set).
 *
 * Only state-changing requests carrying an authentication cookie are checked —
 * anonymous mutations (login, register, contact, newsletter) are skipped so
 * first-visit flows never get blocked; SameSite=Lax already stops cookie
 * transmission on cross-site POSTs, this header check is defense-in-depth.
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  const existing = req.cookies?.[CSRF_COOKIE];
  const token =
    typeof existing === 'string' && existing.length > 0
      ? existing
      : crypto.randomBytes(32).toString('hex');

  res.cookie(CSRF_COOKIE, token, csrfCookieOptions());

  // The double-submit cookie is host-only on the API (e.g. onrender.com), so
  // JavaScript on a cross-site frontend (e.g. vercel.app) can never read it
  // via document.cookie. Echo the same value in a CORS-exposed response
  // header — the client sends it back as X-XSRF-TOKEN and the check below
  // still verifies it against the cookie. No security is weakened: the cookie
  // still must arrive, and only the allowed CORS origins can read the header.
  res.setHeader('X-Bristi-Csrf-Token', token);

  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const hasSessionCookie = Boolean(
    req.cookies?.[ACCESS_TOKEN_COOKIE] || req.cookies?.[REFRESH_TOKEN_COOKIE]
  );
  if (!hasSessionCookie) {
    return next();
  }

  const headerToken = req.headers[CSRF_HEADER];
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  if (
    typeof headerToken !== 'string' ||
    typeof cookieToken !== 'string' ||
    !safeEqual(headerToken, cookieToken)
  ) {
    return res.status(403).json({ success: false, message: 'Invalid or missing CSRF token' });
  }

  next();
};

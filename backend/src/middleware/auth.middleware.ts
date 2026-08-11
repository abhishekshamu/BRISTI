import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../services/jwt.service';
import { UserRepository } from '../repositories/user.repository';
import { AdminRepository } from '../repositories/admin.repository';
import { AppError } from '../utils/exceptions';
import { ACCESS_TOKEN_COOKIE } from '../config/cookies';

const userRepo = new UserRepository();
const adminRepo = new AdminRepository();
const jwtService = new JwtService();

const ADMIN_ROLE_NAMES = new Set(['admin', 'super_admin', 'moderator', 'content_editor', 'support']);

/** A principal is active when: User docs have status === 'active', Admin docs have isActive === true. */
const isActivePrincipal = (principal: any): boolean => {
  if (!principal) return false;
  if (principal.isActive === false) return false;
  if (principal.status !== undefined && principal.status !== 'active') return false;
  return true;
};

/** Accepts the session from an httpOnly cookie first, then a Bearer header (API clients). */
const extractAccessToken = (req: Request): string | null => {
  const cookieToken = (req.cookies as Record<string, unknown> | undefined)?.[ACCESS_TOKEN_COOKIE];
  if (typeof cookieToken === 'string' && cookieToken.length > 0) return cookieToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    const bearer = req.headers.authorization.split(' ')[1];
    if (bearer) return bearer;
  }
  return null;
};

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = extractAccessToken(req);

  if (token) {
    try {
      // Verify token
      const decoded = jwtService.verifyAccessToken(token);
      if (!decoded?.id) {
        throw new AppError('Invalid access token', 401);
      }

      // Resolve principal from token (customer first, then admin)
      const user = await userRepo.findById(decoded.id);

      if (!user) {
        const admin = await adminRepo.findById(decoded.id);
        if (!admin) {
          console.log(
            `[auth] 401 ${req.method} ${req.originalUrl} reason=principal-not-found origin=${req.headers.origin || 'none'}`
          );
          return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
          });
        }
        if (!isActivePrincipal(admin)) {
          console.log(
            `[auth] 403 ${req.method} ${req.originalUrl} reason=admin-inactive origin=${req.headers.origin || 'none'}`
          );
          return res.status(403).json({
            success: false,
            message: 'Account is not active'
          });
        }
        req.user = admin;
        req.authType = 'admin';
        return next();
      }

      if (!isActivePrincipal(user)) {
        console.log(
          `[auth] 403 ${req.method} ${req.originalUrl} reason=user-inactive origin=${req.headers.origin || 'none'}`
        );
        return res.status(403).json({
          success: false,
          message: 'Account is not active'
        });
      }

      req.user = user;
      req.authType = 'user';
      next();
    } catch (_err) {
      console.log(
        `[auth] 401 ${req.method} ${req.originalUrl} reason=invalid-token origin=${req.headers.origin || 'none'}`
      );
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
  }

  if (!token) {
    console.log(
      `[auth] 401 ${req.method} ${req.originalUrl} reason=missing-token origin=${req.headers.origin || 'none'}`
    );
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = extractAccessToken(req);
  if (!token) {
    return next();
  }
  try {
    const decoded = jwtService.verifyAccessToken(token);
    if (decoded?.id) {
      const user = await userRepo.findById(decoded.id);
      if (user) {
        if (!isActivePrincipal(user)) req.user = undefined;
        else {
          req.user = user;
          req.authType = 'user';
        }
      } else {
        const admin = await adminRepo.findById(decoded.id);
        if (admin && isActivePrincipal(admin)) {
          req.user = admin;
          req.authType = 'admin';
        }
      }
    }
  } catch {
    // ignore invalid tokens on public routes
  }
  next();
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    // Admin-gated routes may only be reached by Admin-document principals,
    // never by User documents (even one with a role string of 'admin').
    const wantsAdmin = roles.some((r) => ADMIN_ROLE_NAMES.has(r));
    if (wantsAdmin && req.authType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    if (!roles.includes(req.user.role) && !(roles.includes('admin') && req.user.role === 'super_admin')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    next();
  };
};

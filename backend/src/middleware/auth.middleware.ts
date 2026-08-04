import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../services/jwt.service';
import { UserRepository } from '../repositories/user.repository';
import { AdminRepository } from '../repositories/admin.repository';
import { AppError } from '../utils/exceptions';

const userRepo = new UserRepository();
const adminRepo = new AdminRepository();
const jwtService = new JwtService();

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwtService.verifyAccessToken(token);
      if (!decoded?.id) {
        throw new AppError('Invalid access token', 401);
      }

      // Get user from token (customer first, then admin)
      req.user = await userRepo.findById(decoded.id);

      if (!req.user) {
        const admin = await adminRepo.findById(decoded.id);
        if (!admin) {
          return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
          });
        }
        if (admin.isActive === false) {
          return res.status(403).json({
            success: false,
            message: 'Account is not active'
          });
        }
        req.user = admin;
        return next();
      }

      if (req.user.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Account is not active'
        });
      }

      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
  }

  if (!token) {
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
  const token = req.headers.authorization?.startsWith('Bearer')
    ? req.headers.authorization.split(' ')[1]
    : null;
  if (!token) {
    return next();
  }
  try {
    const decoded = jwtService.verifyAccessToken(token);
    if (decoded?.id) {
      req.user = (await userRepo.findById(decoded.id)) || (await adminRepo.findById(decoded.id)) || undefined;
      if (req.user && req.user.status === 'inactive') req.user = undefined;
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

    if (!roles.includes(req.user.role) && !(roles.includes('admin') && req.user.role === 'super_admin')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    next();
  };
};

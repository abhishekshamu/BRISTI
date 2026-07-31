import jwt, { SignOptions } from 'jsonwebtoken';
import { IUser } from 'shared/types';
import dotenv from 'dotenv';

dotenv.config();

class JwtService {
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private jwtExpiry: string;
  private jwtRefreshExpiry: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'development-only-access-secret-change-me');
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'development-only-refresh-secret-change-me');
    this.jwtExpiry = process.env.JWT_EXPIRE || '30d';
    this.jwtRefreshExpiry = process.env.JWT_REFRESH_EXPIRE || '60d';
    if (!this.jwtSecret || !this.jwtRefreshSecret) {
      throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be configured in production');
    }
  }

  generateAccessToken(user: IUser): string {
    return jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      this.jwtSecret,
      { expiresIn: this.jwtExpiry as SignOptions['expiresIn'] }
    );
  }

  generateRefreshToken(user: IUser): string {
    return jwt.sign(
      { id: user._id },
      this.jwtRefreshSecret,
      { expiresIn: this.jwtRefreshExpiry as SignOptions['expiresIn'] }
    );
  }

  verifyAccessToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      return null;
    }
  }

  verifyRefreshToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtRefreshSecret);
    } catch (error) {
      return null;
    }
  }
}

export { JwtService };
export default JwtService;

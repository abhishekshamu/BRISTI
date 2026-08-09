import jwt, { SignOptions } from 'jsonwebtoken';
import { randomUUID, randomBytes } from 'crypto';
import { IUser } from '../../shared/types';
import dotenv from 'dotenv';

dotenv.config();

const devEphemeralSecret = (label: string): string => {
  const secret = randomBytes(48).toString('hex');
  console.warn(`[jwt] ${label} not configured: using an ephemeral random secret. Sessions will be invalidated on restart (development only).`);
  return secret;
};

class JwtService {
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private jwtExpiry: string;
  private jwtRefreshExpiry: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : devEphemeralSecret('JWT_SECRET'));
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || (process.env.NODE_ENV === 'production' ? '' : devEphemeralSecret('JWT_REFRESH_SECRET'));
    this.jwtExpiry = process.env.JWT_EXPIRE || '15m';
    this.jwtRefreshExpiry = process.env.JWT_REFRESH_EXPIRE || '30d';
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
      { id: user._id, jti: randomUUID() },
      this.jwtRefreshSecret,
      { expiresIn: this.jwtRefreshExpiry as SignOptions['expiresIn'] }
    );
  }

  verifyAccessToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
} catch (_error) {
      return null;
    }
  }

  verifyRefreshToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtRefreshSecret);
    } catch (_error) {
      return null;
    }
  }
}

export { JwtService };
export default JwtService;

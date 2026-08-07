import { AuthTokenModel } from '../models/AuthToken';
import { BaseRepository } from './base.repository';
import crypto from 'crypto';

export class AuthRepository extends BaseRepository<any> {
  constructor() {
    super(AuthTokenModel);
  }

  async createRefreshToken(userId: string, token: string, expiresAt: Date, ownerType: 'user' | 'admin' = 'user'): Promise<any> {
    return this.create({
      userId,
      ownerType,
      tokenHash: this.hashToken(token),
      type: 'refresh',
      expiresAt
    });
  }

  async findRefreshToken(token: string): Promise<any | null> {
    return this.findOne({ tokenHash: this.hashToken(token), type: 'refresh', expiresAt: { $gt: new Date() } });
  }

  async deleteRefreshToken(token: string): Promise<boolean> {
    const result = await this.model.deleteOne({ tokenHash: this.hashToken(token), type: 'refresh' });
    return result.deletedCount > 0;
  }

  async deleteUserTokens(userId: string): Promise<void> {
    await this.model.deleteMany({ userId });
  }

  async deleteOwnerTokens(userId: string, ownerType: 'user' | 'admin' = 'user'): Promise<void> {
    await this.model.deleteMany({ userId, ownerType });
  }

  async deleteExpiredTokens(): Promise<void> {
    await this.model.deleteMany({ expiresAt: { $lt: new Date() } });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

import { SessionModel } from '../models/Session';
import { BaseRepository } from './base.repository';
import crypto from 'crypto';

export class SessionRepository extends BaseRepository<any> {
  constructor() {
    super(SessionModel);
  }

  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async createSession(data: {
    userId: string;
    tokenHash: string;
    device?: string;
    ip?: string;
    userAgent?: string;
  }): Promise<any> {
    return this.create({ ...data, lastActiveAt: new Date() });
  }

  async touchByHash(tokenHash: string): Promise<void> {
    await this.model.updateOne({ tokenHash, revokedAt: { $exists: false } }, { $set: { lastActiveAt: new Date() } });
  }

  async revokeByHash(tokenHash: string): Promise<void> {
    await this.model.updateOne({ tokenHash, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.model.updateMany(
      { userId, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } }
    );
  }

  async countActiveForUser(userId: string): Promise<number> {
    return this.count({ userId, revokedAt: { $exists: false } });
  }

  async countActive(): Promise<number> {
    return this.count({ revokedAt: { $exists: false } });
  }
}

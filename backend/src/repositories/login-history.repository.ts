import { LoginHistoryModel } from '../models/LoginHistory';
import { BaseRepository } from './base.repository';

export class LoginHistoryRepository extends BaseRepository<any> {
  constructor() {
    super(LoginHistoryModel);
  }

  async record(entry: {
    userId?: string;
    method: 'email' | 'google' | 'phone' | 'refresh';
    success: boolean;
    ip?: string;
    userAgent?: string;
    identifier?: string;
    failedReason?: string;
  }): Promise<void> {
    await this.create({
      userId: entry.userId || null,
      method: entry.method,
      success: entry.success,
      ip: entry.ip ? String(entry.ip).slice(0, 64) : undefined,
      userAgent: entry.userAgent ? String(entry.userAgent).slice(0, 300) : undefined,
      identifier: entry.identifier ? String(entry.identifier).slice(0, 128) : undefined,
      failedReason: entry.failedReason ? String(entry.failedReason).slice(0, 200) : undefined,
    });
  }

  async countFailuresSince(since: Date): Promise<number> {
    return this.count({ success: false, createdAt: { $gte: since } });
  }

  async recent(limit: number, filter: Record<string, unknown> = {}): Promise<any[]> {
    return this.model.find(filter).sort({ createdAt: -1 }).limit(limit).lean().exec();
  }
}

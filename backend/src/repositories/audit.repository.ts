// @ts-nocheck
import { AuditLogModel } from '../models/AuditLog';
import { BaseRepository } from './base.repository';
import { IAuditLog } from 'shared/types';

export class AuditLogRepository extends BaseRepository<IAuditLog> {
  constructor() {
    super(AuditLogModel);
  }

  async findByEntity(entityType: string, entityId: string) {
    return this.findMany({ entityType, entityId }, { sort: { createdAt: -1 } });
  }

  async findByUser(userId: string, options: any = {}) {
    return this.findMany({ userId }, options);
  }

  async findByAction(action: string, options: any = {}) {
    return this.findMany({ action }, options);
  }

  async getRecent(limit: number = 100) {
    return this.findMany({}, { limit, sort: { createdAt: -1 } });
  }
}
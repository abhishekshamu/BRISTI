import { AuditLogRepository } from '../repositories/audit.repository';
import { IAuditLog } from 'shared/types';

export class AuditService {
  constructor(private auditRepo: AuditLogRepository) {}

  async log(data: Partial<IAuditLog>) {
    return this.auditRepo.create(data);
  }

  async getLogs(options: any = {}) {
    return this.auditRepo.paginate({}, options);
  }

  async getLogsByEntity(entityType: string, entityId: string) {
    return this.auditRepo.findByEntity(entityType, entityId);
  }

  async getLogsByUser(userId: string, options: any = {}) {
    return this.auditRepo.findByUser(userId, options);
  }

  async getLogsByAction(action: string, options: any = {}) {
    return this.auditRepo.findByAction(action, options);
  }
}
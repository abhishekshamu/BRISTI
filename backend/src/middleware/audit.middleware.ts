import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/audit.service';
import { AuditLogRepository } from '../repositories/audit.repository';

const auditService = new AuditService(new AuditLogRepository());

type AuditAction = 'create' | 'update' | 'delete' | 'reorder' | 'duplicate' | 'transfer';

/**
 * Logs admin mutations to the audit trail. Placed on admin-only write routes,
 * it captures the acting admin, target entity and request context. Recording
 * is fire-and-forget so a slow audit write never blocks the request.
 */
export const auditLog = (entityType: string, action: AuditAction) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode < 400) {
        const entityId = req.params?.id ?? body?.data?._id ?? body?.data?.id;
        const user = req.user as any;
        void auditService
          .log({
            action,
            entityType,
            entityId: entityId ? String(entityId) : 'unknown',
            userId: user?._id ? String(user._id) : 'system',
            userName: user
              ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email || 'Admin'
              : 'System',
            userEmail: user?.email,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          })
          .catch(() => undefined);
      }
      return originalJson(body);
    };
    next();
  };
};

import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';
import { AuditService } from '../services/audit.service';
import { AuditLogRepository } from '../repositories/audit.repository';
import { protect, authorize } from '../middleware/auth.middleware';

const auditRepo = new AuditLogRepository();
const auditService = new AuditService(auditRepo);
const auditController = new AuditController(auditService);

const router = Router();

router.get('/', protect, authorize('admin'), auditController.getLogs);
router.get('/entity/:entityType/:entityId', protect, authorize('admin'), auditController.getLogsByEntity);
router.get('/user/:userId', protect, authorize('admin'), auditController.getLogsByUser);

export default router;
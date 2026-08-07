import { Request, Response } from 'express';
import { AuditService } from '../services/audit.service';
import { asyncHandler } from '../middleware/async';

export class AuditController {
  constructor(private auditService: AuditService) {}

  getLogs = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 50, action, entityType, userId } = req.query;
    const options: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sort: { createdAt: -1 }
    };

    const filter: any = {};
    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;
    if (userId) filter.userId = userId;

    const result = await this.auditService.getLogs({ ...options, filter });
    res.status(200).json({
      success: true,
      data: result.data,
      pagination: { page: result.page, limit: result.limit, total: result.total, pages: result.pages }
    });
  });

  getLogsByEntity = asyncHandler(async (req: Request, res: Response) => {
    const { entityType, entityId } = req.params;
    const logs = await this.auditService.getLogsByEntity(entityType, entityId);
    res.status(200).json({ success: true, data: logs });
  });

  getLogsByUser = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const logs = await this.auditService.getLogsByUser(userId);
    res.status(200).json({ success: true, data: logs });
  });
}
import { Request, Response } from 'express';
import { HeroService } from '../services/hero.service';
import { asyncHandler } from '../middleware/async';
import { ValidationError } from '../utils/exceptions';
import { Types } from 'mongoose';

export class HeroController {
  constructor(private heroService: HeroService) {}

  getActiveBlocks = asyncHandler(async (_req: Request, res: Response) => {
    const blocks = await this.heroService.getActiveBlocks();
    res.status(200).json({ success: true, data: blocks });
  });

  getAllBlocks = asyncHandler(async (req: Request, res: Response) => {
    const { status, isActive, search } = req.query;
    const filter: Record<string, unknown> = {};
    if (status === 'draft' || status === 'published') filter.status = status;
    if (isActive === 'true' || isActive === 'false') filter.isActive = isActive === 'true';
    if (search && typeof search === 'string') {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subtitle: { $regex: search, $options: 'i' } },
        { seoLabel: { $regex: search, $options: 'i' } },
      ];
    }
    const blocks = await this.heroService.getAllBlocks(filter);
    res.status(200).json({ success: true, data: blocks });
  });

  getBlockById = asyncHandler(async (req: Request, res: Response) => {
    const block = await this.heroService.getBlockById(req.params.id);
    res.status(200).json({ success: true, data: block });
  });

  createBlock = asyncHandler(async (req: Request, res: Response) => {
    const block = await this.heroService.createBlock(req.body);
    res.status(201).json({ success: true, data: block });
  });

  updateBlock = asyncHandler(async (req: Request, res: Response) => {
    const block = await this.heroService.updateBlock(req.params.id, req.body);
    res.status(200).json({ success: true, data: block });
  });

  deleteBlock = asyncHandler(async (req: Request, res: Response) => {
    await this.heroService.deleteBlock(req.params.id);
    res.status(200).json({ success: true, message: 'Hero block deleted' });
  });

  duplicateBlock = asyncHandler(async (req: Request, res: Response) => {
    const block = await this.heroService.duplicateBlock(req.params.id);
    res.status(201).json({ success: true, data: block });
  });

  reorderBlocks = asyncHandler(async (req: Request, res: Response) => {
    const { orderedIds } = req.body ?? {};
    if (!Array.isArray(orderedIds) || orderedIds.some((id) => !Types.ObjectId.isValid(id))) {
      throw new ValidationError('orderedIds must be an array of valid IDs');
    }
    await this.heroService.reorderBlocks(orderedIds);
    res.status(200).json({ success: true, message: 'Order updated' });
  });
}

import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/async';
import { MediaService } from '../services/media.service';

export class MediaController {
  constructor(private readonly mediaService: MediaService) {}
  upload = asyncHandler(async (req: Request, res: Response) => {
    const media = await this.mediaService.upload(req.file!, req.user!.id, req.body);
    res.status(201).json({ success: true, data: media });
  });
  list = asyncHandler(async (req: Request, res: Response) => {
    const { folder, page = 1, limit = 50 } = req.query;
    const result = await this.mediaService.list(folder as string || '', {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });
    res.status(200).json({ success: true, data: result.data, pagination: result });
  });
  get = asyncHandler(async (req: Request, res: Response) => {
    const media = await this.mediaService.get(req.params.id, req.user?.id);
    res.json({ success: true, data: media });
  });
  remove = asyncHandler(async (req: Request, res: Response) => {
    await this.mediaService.remove(req.params.id, req.user!.id, req.user!.role === 'admin');
    res.status(204).send();
  });
}

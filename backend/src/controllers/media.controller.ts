import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/async';
import { MediaService } from '../services/media.service';
import { BadRequestError } from '../utils/exceptions';

type MulterFile = NonNullable<Express.Request['file']>;

export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  upload = asyncHandler(async (req: Request, res: Response) => {
    const files = req.files as MulterFile[] | undefined;
    if (files && files.length > 1) {
      const results = await this.mediaService.uploadMany(files, req.user!.id, req.body);
      res.status(201).json({ success: true, data: results });
      return;
    }
    const file = files?.[0] ?? (req as any).file as MulterFile | undefined;
    const media = await this.mediaService.upload(file, req.user!.id, req.body);
    res.status(201).json({ success: true, data: media });
  });

  list = asyncHandler(async (req: Request, res: Response) => {
    const { folder, page = 1, limit = 50, search, tag, type, sort, favorite, unused, usage } = req.query;
    const { result, usageMap } = await this.mediaService.list(String(folder || ''), {
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 50,
      search: search as string,
      tag: tag as string,
      type: type as string,
      sort: sort as string,
      favorite: favorite as string,
      unused: unused as string,
      usage: usage as string,
    });
    res.status(200).json({ success: true, data: result.data, pagination: result, usage: usageMap });
  });

  listFolders = asyncHandler(async (_req: Request, res: Response) => {
    const folders = await this.mediaService.listFolders();
    res.json({ success: true, data: folders });
  });

  verifyUrl = asyncHandler(async (req: Request, res: Response) => {
    const url = req.body?.url as string | undefined;
    if (!url) throw new BadRequestError('url is required');
    const result = await this.mediaService.verifyUrl(url);
    res.json({ success: true, data: result });
  });

  get = asyncHandler(async (req: Request, res: Response) => {
    const media = await this.mediaService.get(req.params.id, req.user?.id);
    res.json({ success: true, data: media });
  });

  usage = asyncHandler(async (req: Request, res: Response) => {
    const media: any = await this.mediaService.get(req.params.id, req.user?.id);
    const usage = await this.mediaService.computeUsage(this.mediaService.urlsOf(media));
    res.json({ success: true, data: usage });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const media = await this.mediaService.update(req.params.id, req.user!.id, req.body);
    res.json({ success: true, data: media });
  });

  fit = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.mediaService.fit(req.params.id, req.body.ratio || {}, req.user!.id);
    res.json({ success: true, data: result });
  });

  crop = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.mediaService.crop(req.params.id, req.body, req.user!.id);
    res.json({ success: true, data: result });
  });

  replace = asyncHandler(async (req: Request, res: Response) => {
    const files = req.files as MulterFile[] | undefined;
    const file = files?.[0] ?? (req as any).file as MulterFile | undefined;
    const media = await this.mediaService.replace(req.params.id, file, req.user!.id, req.body);
    res.json({ success: true, data: media });
  });

  restoreVersion = asyncHandler(async (req: Request, res: Response) => {
    const media = await this.mediaService.restoreVersion(req.params.id, req.body.versionId, req.user!.id);
    res.json({ success: true, data: media });
  });

  replaceEverywhere = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.mediaService.replaceEverywhere(req.params.id, req.body.newUrl, req.user!.id);
    res.json({ success: true, data: result });
  });

  bulkDelete = asyncHandler(async (req: Request, res: Response) => {
    const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (ids.length === 0) throw new BadRequestError('ids array is required');
    const result = await this.mediaService.bulkDelete(ids, req.user!.id, req.user!.role === 'admin', Boolean(req.body?.force));
    res.json({ success: true, data: result });
  });

  bulkMove = asyncHandler(async (req: Request, res: Response) => {
    const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (ids.length === 0) throw new BadRequestError('ids array is required');
    if (!req.body?.folder) throw new BadRequestError('folder is required');
    const result = await this.mediaService.bulkMove(ids, String(req.body.folder), req.user!.id, req.user!.role === 'admin');
    res.json({ success: true, data: result });
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    await this.mediaService.remove(req.params.id, req.user!.id, req.user!.role === 'admin', req.query.force === 'true');
    res.status(204).send();
  });
}

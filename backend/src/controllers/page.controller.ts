import { Request, Response } from 'express';
import { PageService } from '../services/page.service';
import { asyncHandler } from '../middleware/async';

export class PageController {
  constructor(private pageService: PageService) {}

  createPage = asyncHandler(async (req: Request, res: Response) => {
    const page = await this.pageService.createPage({
      ...req.body,
      createdBy: (req.user as any)?._id ?? (req.user as any)?.id,
    });
    res.status(201).json({
      success: true,
      data: page
    });
  });

  getPages = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, status } = req.query;
    const options: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sort: { createdAt: -1 }
    };

    const filter: any = {};
    // Public listing only exposes published pages; an explicit `status=all`
    // (admin) opts into every status.
    if (status && status !== 'all') filter.status = status;
    else if (!status) filter.status = 'published';

    const result = await this.pageService.getAllPages(filter, options);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages
      }
    });
  });

  getPageById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const page = await this.pageService.getPageById(id);
    // Unpublished pages are only visible to authenticated admins; everyone
    // else gets a 404 so drafts are never leaked.
    if (page.status !== 'published' && req.authType !== 'admin') {
      return res.status(404).json({ success: false, message: 'Page not found' });
    }
    res.status(200).json({
      success: true,
      data: page
    });
  });

  getPageBySlug = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const page = await this.pageService.getPageBySlug(slug);
    res.status(200).json({
      success: true,
      data: page
    });
  });

  getPublishedPageBySlug = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const page = await this.pageService.getPageBySlugAndStatus(slug, 'published');
    res.status(200).json({
      success: true,
      data: page
    });
  });

  updatePage = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const page = await this.pageService.updatePage(id, {
      ...req.body,
      updatedBy: (req.user as any)?._id ?? (req.user as any)?.id,
    });
    res.status(200).json({
      success: true,
      data: page
    });
  });

  deletePage = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.pageService.deletePage(id);
    res.status(200).json({
      success: true,
      message: 'Page deleted successfully'
    });
  });

  getMenuPages = asyncHandler(async (req: Request, res: Response) => {
    const pages = await this.pageService.getMenuPages();
    res.status(200).json({
      success: true,
      data: pages
    });
  });

  updateBuilder = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const page = await this.pageService.updateBuilder(id, req.body.sections);
    res.status(200).json({
      success: true,
      data: page
    });
  });
}

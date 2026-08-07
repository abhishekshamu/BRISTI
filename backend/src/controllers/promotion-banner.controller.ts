import { Request, Response } from 'express';
import { PromotionBannerService } from '../services/promotion-banner.service';
import { asyncHandler } from '../middleware/async';

export class PromotionBannerController {
  constructor(private bannerService: PromotionBannerService) {}

  getBanners = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;

    const options: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sort: { bannerOrder: 1, createdAt: -1 }
    };

    const result = await this.bannerService.getBanners({}, options);

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

  getBannerById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const banner = await this.bannerService.getBannerById(id);

    res.status(200).json({
      success: true,
      data: banner
    });
  });

  getActiveBanners = asyncHandler(async (_req: Request, res: Response) => {
    const banners = await this.bannerService.getActiveBanners();

    res.status(200).json({
      success: true,
      data: banners
    });
  });

  createBanner = asyncHandler(async (req: Request, res: Response) => {
    const banner = await this.bannerService.createBanner(req.body);
    res.status(201).json({
      success: true,
      data: banner
    });
  });

  updateBanner = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const banner = await this.bannerService.updateBanner(id, req.body);
    res.status(200).json({
      success: true,
      data: banner
    });
  });

  deleteBanner = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.bannerService.deleteBanner(id);
    res.status(200).json({
      success: true,
      message: 'Promotion banner deleted successfully'
    });
  });
}

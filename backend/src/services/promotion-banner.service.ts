import { PromotionBannerRepository } from '../repositories/promotion-banner.repository';
import { PromotionBanner } from '../../shared/types';
import { NotFoundError } from '../utils/exceptions';

export class PromotionBannerService {
  constructor(private bannerRepo: PromotionBannerRepository) {}

  async getBanners(filter: any = {}, options: any = {}): Promise<any> {
    return this.bannerRepo.paginate(filter, options);
  }

  async getBannerById(id: string): Promise<PromotionBanner> {
    const banner = await this.bannerRepo.findById(id);
    if (!banner) {
      throw new NotFoundError('Promotion banner not found');
    }
    return banner;
  }

  async getActiveBanners(): Promise<PromotionBanner[]> {
    const now = new Date();
    const filter: any = {
      isActive: true,
      $and: [
        {
          $or: [
            { startDate: { $exists: false } },
            { startDate: null },
            { startDate: { $lte: now } },
          ],
        },
        {
          $or: [
            { endDate: { $exists: false } },
            { endDate: null },
            { endDate: { $gte: now } },
          ],
        },
      ],
    };
    return this.bannerRepo.findMany(filter, { sort: { bannerOrder: 1, createdAt: -1 } });
  }

  async createBanner(data: Partial<PromotionBanner>): Promise<PromotionBanner> {
    return this.bannerRepo.create(data);
  }

  async updateBanner(id: string, updateData: Partial<PromotionBanner>): Promise<PromotionBanner> {
    const updated = await this.bannerRepo.updateById(id, updateData);
    if (!updated) {
      throw new NotFoundError('Promotion banner not found');
    }
    return updated;
  }

  async deleteBanner(id: string): Promise<boolean> {
    const banner = await this.bannerRepo.findById(id);
    if (!banner) {
      throw new NotFoundError('Promotion banner not found');
    }
    return this.bannerRepo.deleteById(id);
  }
}

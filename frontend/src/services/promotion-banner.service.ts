import { api } from '@/lib/api';
import type { PromotionBanner } from '@shared/types';

export const promotionBannerService = {
  async getActive(): Promise<PromotionBanner[]> {
    const response = await api.get('/promotion-banners/active');
    return response.data.data as PromotionBanner[];
  },
};

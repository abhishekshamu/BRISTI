import { PromotionBannerModel } from '../models/PromotionBanner';
import { BaseRepository } from './base.repository';
import { PromotionBanner } from 'shared/types';

export class PromotionBannerRepository extends BaseRepository<PromotionBanner> {
  constructor() {
    super(PromotionBannerModel);
  }
}

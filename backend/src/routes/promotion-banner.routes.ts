import { Router } from 'express';
import { PromotionBannerController } from '../controllers/promotion-banner.controller';
import { PromotionBannerService } from '../services/promotion-banner.service';
import { PromotionBannerRepository } from '../repositories/promotion-banner.repository';
import { protect, authorize } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { validate } from '../validators/index';
import {
  createPromotionBannerValidation,
  updatePromotionBannerValidation,
  promotionBannerIdValidation,
} from '../validators/promotion-banner.validators';

const bannerRepo = new PromotionBannerRepository();
const bannerService = new PromotionBannerService(bannerRepo);
const bannerController = new PromotionBannerController(bannerService);

const router = Router();

// Public: active, in-schedule banners for the storefront
router.get('/active', bannerController.getActiveBanners);

// Admin routes
router.get('/', protect, authorize('admin'), bannerController.getBanners);
router.post('/', protect, authorize('admin'), auditLog('promotion-banner', 'create'), createPromotionBannerValidation, validate, bannerController.createBanner);
router.get('/:id', protect, authorize('admin'), promotionBannerIdValidation, validate, bannerController.getBannerById);
router.put('/:id', protect, authorize('admin'), auditLog('promotion-banner', 'update'), updatePromotionBannerValidation, validate, bannerController.updateBanner);
router.delete('/:id', protect, authorize('admin'), auditLog('promotion-banner', 'delete'), promotionBannerIdValidation, validate, bannerController.deleteBanner);

export default router;

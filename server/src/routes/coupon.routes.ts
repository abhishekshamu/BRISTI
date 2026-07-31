import { Router } from 'express';
import { CouponController } from '../controllers/coupon.controller';
import { CouponService } from '../services/coupon.service';
import { CouponRepository } from '../repositories/coupon.repository';
import { protect, authorize } from '../middleware/auth.middleware';
import { createCouponValidation, updateCouponValidation, validateCouponValidation } from '../validators/coupon.validators';
import { validate } from '../validators/index';

const couponRepo = new CouponRepository();
const couponService = new CouponService(couponRepo);
const couponController = new CouponController(couponService);

const router = Router();

router.post('/validate', validateCouponValidation, validate, couponController.validateCoupon);
router.get('/', protect, authorize('admin'), couponController.getAllCoupons);
router.get('/:code', protect, authorize('admin'), couponController.getCouponByCode);
router.post('/', protect, authorize('admin'), createCouponValidation, validate, couponController.createCoupon);
router.put('/:id', protect, authorize('admin'), updateCouponValidation, validate, couponController.updateCoupon);
router.delete('/:id', protect, authorize('admin'), couponController.deleteCoupon);

export default router;

import { body, param } from 'express-validator';

export const createCouponValidation = [
  body('code').notEmpty().withMessage('Coupon code is required').trim(),
  body('type').isIn(['percentage', 'fixed']).withMessage('Coupon type must be percentage or fixed'),
  body('value').isNumeric().withMessage('Coupon value must be numeric'),
  body('minOrderAmount').optional().isNumeric().withMessage('minOrderAmount must be numeric'),
  body('maxDiscount').optional().isNumeric().withMessage('maxDiscount must be numeric'),
  body('validFrom').optional().isISO8601().withMessage('Invalid validFrom date'),
  body('validUntil').optional().isISO8601().withMessage('Invalid validUntil date'),
  body('usageLimit').optional().isInt({ min: 0 }).withMessage('usageLimit must be a non-negative integer'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

export const updateCouponValidation = [
  param('id').isMongoId().withMessage('Invalid coupon ID'),
  body('code').optional().trim(),
  body('value').optional().isNumeric().withMessage('Coupon value must be numeric'),
];

export const validateCouponValidation = [
  body('code').notEmpty().withMessage('Coupon code is required').trim(),
];

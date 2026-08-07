import { body, param } from 'express-validator';

export const createCouponValidation = [
  body('code').notEmpty().withMessage('Coupon code is required').trim(),
  body('type').isIn(['percentage', 'fixed_amount', 'free_shipping', 'bogo']).withMessage('Coupon type must be percentage, fixed_amount, free_shipping or bogo'),
  body('value').isNumeric().withMessage('Coupon value must be numeric'),
  body('minimumPurchase').optional().isNumeric().withMessage('minimumPurchase must be numeric'),
  body('maximumDiscount').optional().isNumeric().withMessage('maximumDiscount must be numeric'),
  body('startsAt').optional().isISO8601().withMessage('Invalid startsAt date'),
  body('expiresAt').optional().isISO8601().withMessage('Invalid expiresAt date'),
  body('usageLimit').optional().isInt({ min: 0 }).withMessage('usageLimit must be a non-negative integer'),
  body('perCustomerLimit').optional().isInt({ min: 0 }).withMessage('perCustomerLimit must be a non-negative integer'),
  body('appliesTo').optional().isIn(['all', 'specific_products', 'specific_categories', 'specific_collections']).withMessage('Invalid appliesTo value'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('appliesToSaleItems').optional().isBoolean().withMessage('appliesToSaleItems must be a boolean'),
];

export const updateCouponValidation = [
  param('id').isMongoId().withMessage('Invalid coupon ID'),
  body('code').optional().trim(),
  body('value').optional().isNumeric().withMessage('Coupon value must be numeric'),
  body('type').optional().isIn(['percentage', 'fixed_amount', 'free_shipping', 'bogo']).withMessage('Coupon type must be percentage, fixed_amount, free_shipping or bogo'),
];

export const validateCouponValidation = [
  body('code').notEmpty().withMessage('Coupon code is required').trim(),
];
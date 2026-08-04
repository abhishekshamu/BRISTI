import { body, param } from 'express-validator';

export const addToCartValidation = [
  body('productId').isMongoId().withMessage('Invalid product ID'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('variantId').optional().isString().notEmpty().isLength({ max: 120 }).withMessage('Invalid variant ID'),
  body('selectedOptions').optional().isObject().withMessage('selectedOptions must be an object'),
];

export const updateCartItemValidation = [
  param('itemId').isMongoId().withMessage('Invalid cart item ID'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
];

export const applyCouponValidation = [
  body('couponCode').notEmpty().withMessage('Coupon code is required').trim(),
];

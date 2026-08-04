import { body, param } from 'express-validator';

export const createReviewValidation = [
  body('productId').isMongoId().withMessage('Invalid product ID'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title').optional().trim(),
  body('comment').optional().trim(),
  body('images').optional().isArray().withMessage('images must be an array'),
  body('isVerifiedPurchase').optional().isBoolean(),
];

export const updateReviewValidation = [
  param('reviewId').isMongoId().withMessage('Invalid review ID'),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title').optional().trim(),
  body('comment').optional().trim(),
];

export const deleteReviewValidation = [
  param('reviewId').isMongoId().withMessage('Invalid review ID'),
];

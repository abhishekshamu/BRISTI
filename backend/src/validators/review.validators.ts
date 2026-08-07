import { body, param } from 'express-validator';

export const createReviewValidation = [
  body('productId').isMongoId().withMessage('Invalid product ID'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title').optional().trim().escape(),
  body('comment').trim().escape().notEmpty().withMessage('Comment is required'),
  body('images').optional().isArray().withMessage('images must be an array'),
];

export const updateReviewValidation = [
  param('reviewId').isMongoId().withMessage('Invalid review ID'),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title').optional().trim().escape(),
  body('comment').optional().trim().escape(),
];

export const updateReviewStatusValidation = [
  param('reviewId').isMongoId().withMessage('Invalid review ID'),
  body('status').isIn(['pending', 'approved', 'rejected']).withMessage('Invalid review status'),
];

export const deleteReviewValidation = [
  param('reviewId').isMongoId().withMessage('Invalid review ID'),
];

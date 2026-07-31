import { body, param } from 'express-validator';

export const createCollectionValidation = [
  body('name').notEmpty().withMessage('Collection name is required').trim(),
  body('slug').optional().trim(),
  body('description').optional().trim(),
  body('shortDescription').optional().trim(),
  body('image').optional().trim(),
  body('bannerImage').optional().trim(),
  body('featured').optional().isBoolean().withMessage('featured must be a boolean'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

export const updateCollectionValidation = [
  param('id').isMongoId().withMessage('Invalid collection ID'),
  body('name').optional().trim(),
  body('slug').optional().trim(),
];

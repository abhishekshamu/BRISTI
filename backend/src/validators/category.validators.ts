import { body, param } from 'express-validator';

export const createCategoryValidation = [
  body('name').notEmpty().withMessage('Category name is required').trim(),
  body('slug').optional().trim(),
  body('description').optional(),
  body('subtitle').optional(),
  body('image').optional(),
  body('bannerImage').optional(),
  body('sortOrder').optional().isInt({ min: 0 }).withMessage('Sort order must be a non-negative integer'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('seo.title').optional(),
  body('seo.description').optional(),
  body('parentId').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid parent ID'),
];

export const updateCategoryValidation = [
  param('id').isMongoId().withMessage('Invalid category ID'),
  body('name').optional().trim(),
  body('slug').optional().trim(),
  body('description').optional(),
  body('subtitle').optional(),
  body('image').optional(),
  body('bannerImage').optional(),
  body('sortOrder').optional().isInt({ min: 0 }).withMessage('Sort order must be a non-negative integer'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('seo.title').optional(),
  body('seo.description').optional(),
  body('parentId').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid parent ID'),
];

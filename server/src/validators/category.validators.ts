import { body, param } from 'express-validator';

export const createCategoryValidation = [
  body('name').notEmpty().withMessage('Category name is required').trim(),
  body('description').optional(),
  body('parentId').optional().isMongoId().withMessage('Invalid parent ID'),
];

export const updateCategoryValidation = [
  param('id').isMongoId().withMessage('Invalid category ID'),
  body('name').optional().trim(),
];

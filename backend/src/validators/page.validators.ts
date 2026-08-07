import { body, param } from 'express-validator';

export const createPageValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('slug').optional().trim().toLowerCase(),
  body('content').optional(),
  body('excerpt').optional().trim(),
  body('featuredImage').optional().isURL().withMessage('Invalid featured image URL'),
  body('status').optional().isIn(['draft', 'published', 'archived']).withMessage('Invalid status'),
  body('isInMenu').optional().isBoolean().withMessage('isInMenu must be a boolean'),
  body('menuOrder').optional().isInt({ min: 0 }).withMessage('menuOrder must be a non-negative integer'),
  body('seo.title').optional().trim(),
  body('seo.description').optional().trim(),
  body('seo.keywords').optional().isArray().withMessage('seo.keywords must be an array'),
  body('builderSections').optional().isArray().withMessage('builderSections must be an array'),
];

export const updatePageValidation = [
  param('id').isMongoId().withMessage('Invalid page ID'),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('slug').optional().trim().toLowerCase(),
  body('content').optional(),
  body('excerpt').optional().trim(),
  body('featuredImage').optional().isURL().withMessage('Invalid featured image URL'),
  body('status').optional().isIn(['draft', 'published', 'archived']).withMessage('Invalid status'),
  body('isInMenu').optional().isBoolean().withMessage('isInMenu must be a boolean'),
  body('menuOrder').optional().isInt({ min: 0 }).withMessage('menuOrder must be a non-negative integer'),
  body('seo.title').optional().trim(),
  body('seo.description').optional().trim(),
  body('seo.keywords').optional().isArray().withMessage('seo.keywords must be an array'),
  body('builderSections').optional().isArray().withMessage('builderSections must be an array'),
];

export const updatePageBuilderValidation = [
  param('id').isMongoId().withMessage('Invalid page ID'),
  body('sections').isArray().withMessage('sections must be an array'),
];

export const pageIdValidation = [
  param('id').isMongoId().withMessage('Invalid page ID'),
];

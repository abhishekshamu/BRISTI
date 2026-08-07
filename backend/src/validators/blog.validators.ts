import { body, param } from 'express-validator';

export const createBlogPostValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('slug').optional().trim().toLowerCase(),
  body('excerpt').optional().trim(),
  body('content').optional(),
  body('featuredImage').optional().isURL().withMessage('Invalid featured image URL'),
  body('gallery').optional().isArray().withMessage('gallery must be an array'),
  body('author').optional().trim(),
  body('tags').optional().isArray().withMessage('tags must be an array'),
  body('category').optional().trim(),
  body('status').optional().isIn(['draft', 'published', 'archived']).withMessage('Invalid status'),
  body('featured').optional().isBoolean().withMessage('featured must be a boolean'),
  body('seo.title').optional().trim(),
  body('seo.description').optional().trim(),
  body('seo.keywords').optional().isArray().withMessage('seo.keywords must be an array'),
];

export const updateBlogPostValidation = [
  param('id').isMongoId().withMessage('Invalid blog post ID'),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('slug').optional().trim().toLowerCase(),
  body('excerpt').optional().trim(),
  body('content').optional(),
  body('featuredImage').optional().isURL().withMessage('Invalid featured image URL'),
  body('gallery').optional().isArray().withMessage('gallery must be an array'),
  body('author').optional().trim(),
  body('tags').optional().isArray().withMessage('tags must be an array'),
  body('category').optional().trim(),
  body('status').optional().isIn(['draft', 'published', 'archived']).withMessage('Invalid status'),
  body('featured').optional().isBoolean().withMessage('featured must be a boolean'),
  body('seo.title').optional().trim(),
  body('seo.description').optional().trim(),
  body('seo.keywords').optional().isArray().withMessage('seo.keywords must be an array'),
];

export const blogIdValidation = [
  param('id').isMongoId().withMessage('Invalid blog post ID'),
];

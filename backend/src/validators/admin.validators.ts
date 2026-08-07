import { body, param } from 'express-validator';

const passwordRules = [
  body('password')
    .if(body('password').exists())
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
];

export const createAdminValidation = [
  body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('role').optional().isIn(['super_admin', 'admin', 'moderator', 'content_editor', 'support'])
    .withMessage('Invalid admin role'),
];

export const updateAdminValidation = [
  body('email').optional().isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  body('firstName').optional().trim().isLength({ min: 1, max: 80 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 80 }),
  body('role').optional().isIn(['super_admin', 'admin', 'moderator', 'content_editor', 'support'])
    .withMessage('Invalid admin role'),
  body('isActive').optional().isBoolean(),
  body('permissions').optional().isArray(),
  ...passwordRules,
];

export const adminIdValidation = [
  param('id').trim().isMongoId().withMessage('Invalid admin id'),
];

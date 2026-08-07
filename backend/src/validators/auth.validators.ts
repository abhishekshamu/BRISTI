import { body } from 'express-validator';

export const registerValidation = [
  body('email')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  body('firstName').notEmpty().withMessage('First name is required').trim(),
  body('lastName').notEmpty().withMessage('Last name is required').trim(),
];

export const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
];

export const resetPasswordValidation = [
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
];

export const refreshTokenValidation = [
  body('refreshToken').isString().notEmpty().withMessage('Refresh token is required'),
];

export const changePasswordValidation = [
  body('currentPassword').isString().notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/[a-z]/).withMessage('New password must contain at least one lowercase letter')
    .matches(/[A-Z]/).withMessage('New password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('New password must contain at least one number'),
];

export const updateProfileValidation = [
  body('firstName').optional().trim().isLength({ min: 1, max: 80 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 80 }),
  body('phone').optional().trim().isLength({ max: 32 }),
  body('gender').optional().isIn(['male', 'female', 'other', 'prefer_not_to_say']),
  body('dateOfBirth').optional().isISO8601().toDate(),
];

const phoneValidation = body('phone')
  .trim()
  .matches(/^\+?[1-9]\d{9,14}$/)
  .withMessage('Please provide a valid phone number in international format (e.g. +8801712345678)');

export const googleLoginValidation = [
  body('credential').isString().notEmpty().withMessage('Google credential is required'),
];

export const requestOtpValidation = [phoneValidation];

export const verifyOtpValidation = [
  phoneValidation,
  body('otp').isString().matches(/^\d{6}$/).withMessage('Code must be exactly 6 digits'),
];

import { body, param } from 'express-validator';

const addressFields = [
  body('type').isIn(['billing', 'shipping', 'both']),
  body('firstName').trim().notEmpty(), body('lastName').trim().notEmpty(),
  body('addressLine1').trim().notEmpty(), body('city').trim().notEmpty(),
  body('state').trim().notEmpty(), body('postalCode').trim().notEmpty(),
  body('country').trim().notEmpty(), body('phone').trim().notEmpty(),
];

export const updateProfileValidation = [
  body('firstName').optional().trim().isLength({ min: 1, max: 80 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 80 }),
  body('phone').optional().trim().isLength({ max: 32 }),
  body('gender').optional().isIn(['male', 'female', 'other', 'prefer_not_to_say']),
  body('dateOfBirth').optional().isISO8601().toDate(),
];
export const createAddressValidation = addressFields;
export const updateAddressValidation = [param('addressId').trim().notEmpty(), ...addressFields.map((rule: any) => rule.optional())];
export const addressIdValidation = [param('addressId').trim().notEmpty()];
export const preferencesValidation = [
  body('newsletter').optional().isBoolean().toBoolean(),
  body('marketing').optional().isBoolean().toBoolean(),
  body('orderUpdates').optional().isBoolean().toBoolean(),
];

export const changePasswordValidation = [
  body('currentPassword').isString().notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/[a-z]/).withMessage('New password must contain at least one lowercase letter')
    .matches(/[A-Z]/).withMessage('New password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('New password must contain at least one number'),
];

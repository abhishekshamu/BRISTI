import { body, param } from 'express-validator';

export const addToWishlistValidation = [
  body('productId').isMongoId().withMessage('Invalid product ID'),
];

export const removeFromWishlistValidation = [
  param('productId').isMongoId().withMessage('Invalid product ID'),
];

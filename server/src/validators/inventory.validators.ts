import { body, param } from 'express-validator';

export const updateInventoryValidation = [
  param('id').isMongoId().withMessage('Invalid inventory item ID'),
  body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  body('reserved').optional().isInt({ min: 0 }).withMessage('Reserved must be a non-negative integer'),
  body('lowStockThreshold').optional().isInt({ min: 0 }).withMessage('Low stock threshold must be a non-negative integer'),
  body('restockAt').optional().isISO8601().withMessage('Invalid restock date'),
];

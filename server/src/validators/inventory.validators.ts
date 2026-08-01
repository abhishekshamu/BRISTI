import { body, param } from 'express-validator';

export const updateInventoryValidation = [
  param('id').isMongoId().withMessage('Invalid inventory item ID'),
  body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  body('reserved').optional().isInt({ min: 0 }).withMessage('Reserved must be a non-negative integer'),
  body('reorderPoint').optional().isInt({ min: 0 }).withMessage('Reorder point must be a non-negative integer'),
  body('maxStockLevel').optional().isInt({ min: 0 }).withMessage('Max stock level must be a non-negative integer'),
  body('reason').optional().isString().withMessage('Reason must be a string'),
];

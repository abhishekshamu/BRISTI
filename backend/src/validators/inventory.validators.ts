import { body, param } from 'express-validator';

export const updateInventoryValidation = [
  param('id').isMongoId().withMessage('Invalid inventory item ID'),
  body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  body('reserved').optional().isInt({ min: 0 }).withMessage('Reserved must be a non-negative integer'),
  body('reorderPoint').optional().isInt({ min: 0 }).withMessage('Reorder point must be a non-negative integer'),
  body('maxStockLevel').optional().isInt({ min: 0 }).withMessage('Max stock level must be a non-negative integer'),
  body('reason').optional().isString().withMessage('Reason must be a string'),
];

export const transferInventoryValidation = [
  param('id').isMongoId().withMessage('Invalid inventory item ID'),
  body('quantity').isInt({ min: 1 }).withMessage('Transfer quantity must be a positive integer'),
  body('targetWarehouse').isString().trim().notEmpty().withMessage('Target warehouse is required'),
  body('note').optional().isString().withMessage('Note must be a string'),
];

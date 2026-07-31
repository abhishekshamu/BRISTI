import { body, param } from 'express-validator';

export const createPaymentValidation = [
  body('orderId').isMongoId().withMessage('Invalid order ID'),
  body('method').isIn(['credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay', 'razorpay', 'stripe', 'cod'])
    .withMessage('Invalid payment method'),
  body('transactionId').optional().trim(),
  body('amount').isNumeric().withMessage('Amount must be numeric'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
];

export const createStripeIntentValidation = [
  body('orderId').isMongoId().withMessage('Invalid order ID'),
];

export const createRazorpayOrderValidation = [
  body('orderId').isMongoId().withMessage('Invalid order ID'),
];

export const refundPaymentValidation = [
  param('id').isMongoId().withMessage('Invalid payment ID'),
  body('amount').optional().isNumeric().withMessage('Amount must be numeric'),
  body('reason').optional().trim(),
];

export const updatePaymentStatusValidation = [
  param('id').isMongoId().withMessage('Invalid payment ID'),
  body('status').isIn(['pending', 'completed', 'failed', 'refunded', 'cancelled']).withMessage('Invalid payment status'),
];

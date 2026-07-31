import { body, param } from 'express-validator';

const paymentMethods = ['credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay', 'razorpay', 'stripe', 'cod'];

export const createOrderValidation = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').isMongoId().withMessage('Invalid product ID'),
  body('items.*.variantId').optional().isMongoId().withMessage('Invalid variant ID'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('shippingAddress').isObject().withMessage('Shipping address is required'),
  body('shippingAddress.fullName').optional().notEmpty().withMessage('Recipient name is required'),
  body('shippingAddress.phone').optional().notEmpty().withMessage('Phone is required'),
  body('billingAddress').optional().isObject(),
  body('paymentMethod').isIn(paymentMethods).withMessage('Invalid payment method'),
  body('couponCode').optional().trim(),
  body('notes').optional().trim(),
];

export const updateOrderStatusValidation = [
  param('id').isMongoId().withMessage('Invalid order ID'),
  body('status').isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
    .withMessage('Invalid order status'),
];

export const cancelOrderValidation = [
  param('id').isMongoId().withMessage('Invalid order ID'),
];

export const addTrackingValidation = [
  param('id').isMongoId().withMessage('Invalid order ID'),
  body('trackingNumber').optional().trim(),
  body('carrier').optional().trim(),
  body('status').optional().isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
    .withMessage('Invalid order status'),
];

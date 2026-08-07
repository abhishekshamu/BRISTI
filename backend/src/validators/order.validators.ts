import { body, param } from 'express-validator';

const paymentMethods = ['credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay', 'razorpay', 'stripe', 'cod'];

const orderStatuses = ['pending', 'confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded'];
const paymentStatuses = ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'];

export const createOrderValidation = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').isMongoId().withMessage('Invalid product ID'),
  body('items.*.variantId').optional().isString().notEmpty().withMessage('Invalid variant ID'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('shippingAddress').isObject().withMessage('Shipping address is required'),
  body('shippingAddress.fullName').optional().notEmpty().withMessage('Recipient name is required'),
  body('shippingAddress.phone').optional().notEmpty().withMessage('Phone is required'),
  body('billingAddress').optional().isObject(),
  body('paymentMethod').isIn(paymentMethods).withMessage('Invalid payment method'),
  body('couponCode').optional().trim(),
  body('notes').optional().trim(),
  body('guestEmail').optional().isEmail().withMessage('Invalid guest email'),
];

export const getOrderValidation = [
  param('id').isMongoId().withMessage('Invalid order ID'),
];

export const updateOrderStatusValidation = [
  param('id').isMongoId().withMessage('Invalid order ID'),
  body('status').isIn(orderStatuses).withMessage('Invalid order status'),
  body('note').optional().trim(),
];

export const updatePaymentStatusValidation = [
  param('id').isMongoId().withMessage('Invalid order ID'),
  body('paymentStatus').isIn(paymentStatuses).withMessage('Invalid payment status'),
  body('paymentId').optional().trim(),
];

export const updateNotesValidation = [
  param('id').isMongoId().withMessage('Invalid order ID'),
  body('notes').optional().trim(),
];

export const sendEmailValidation = [
  param('id').isMongoId().withMessage('Invalid order ID'),
  body('type').isIn(['confirmation', 'shipping', 'delivered']).withMessage('Invalid email type'),
];

export const cancelOrderValidation = [
  param('id').isMongoId().withMessage('Invalid order ID'),
  body('reason').optional().trim(),
];

export const addTrackingValidation = [
  param('id').isMongoId().withMessage('Invalid order ID'),
  body('trackingNumber').optional().trim(),
  body('carrier').optional().trim(),
  body('status').optional().isIn(orderStatuses).withMessage('Invalid order status'),
];

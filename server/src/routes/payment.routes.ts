import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { PaymentService } from '../services/payment.service';
import { PaymentRepository } from '../repositories/payment.repository';
import { OrderRepository } from '../repositories/order.repository';
import { protect, authorize } from '../middleware/auth.middleware';
import { createPaymentValidation, createStripeIntentValidation, createRazorpayOrderValidation, refundPaymentValidation, updatePaymentStatusValidation } from '../validators/payment.validators';
import { validate } from '../validators/index';

const paymentRepo = new PaymentRepository();
const orderRepo = new OrderRepository();
const paymentService = new PaymentService(paymentRepo, orderRepo);
const paymentController = new PaymentController(paymentService);

const router = Router();

router.post('/intent', protect, createStripeIntentValidation, validate, paymentController.createStripeIntent);
router.post('/razorpay/order', protect, createRazorpayOrderValidation, validate, paymentController.createRazorpayOrder);
router.post('/refund/:id', protect, authorize('admin'), refundPaymentValidation, validate, paymentController.refundPayment);

router.post('/', protect, createPaymentValidation, validate, paymentController.createPayment);
router.get('/', protect, authorize('admin'), paymentController.getAllPayments);
router.get('/:id', protect, paymentController.getPaymentById);
router.get('/order/:orderId', protect, paymentController.getPaymentByOrderId);
router.put('/:id/status', protect, authorize('admin'), updatePaymentStatusValidation, validate, paymentController.updatePaymentStatus);

export default router;

import { PaymentRepository } from '../repositories/payment.repository';
import { OrderRepository } from '../repositories/order.repository';
import { IPayment } from 'shared/types';
import { NotFoundError, BadRequestException, ForbiddenError } from '../utils/exceptions';
import Stripe from 'stripe';
import Razorpay from 'razorpay';
import crypto from 'crypto';

export class PaymentService {
  constructor(
    private paymentRepo: PaymentRepository,
    private orderRepo: OrderRepository
  ) {}

  private async validateOrderOwnership(orderId: any, userId?: string): Promise<any> {
    const order = await this.orderRepo.findById(orderId.toString());
    if (!order) {
      throw new NotFoundError('Order not found');
    }
    // A payment may only be created against the caller's own order, and the
    // amount must match the order total exactly (no self-pricing).
    if (order.userId && String(order.userId) !== String(userId)) {
      throw new ForbiddenError('Order does not belong to this user');
    }
    return order;
  }

  private assertAmountMatches(order: any, amount: number): void {
    if (Math.abs(Number(order.total) - Number(amount)) > 0.01) {
      throw new BadRequestException('Amount does not match the order total');
    }
  }

  async createPayment(data: Partial<IPayment>): Promise<IPayment> {
    if (!data.orderId || !data.userId || !data.amount || !data.method) {
      throw new BadRequestException('Order ID, user ID, amount, and payment method are required');
    }

    const order = await this.validateOrderOwnership(data.orderId, String(data.userId));
    this.assertAmountMatches(order, data.amount);

    const payment = await this.paymentRepo.create({
      ...data,
      status: 'pending'
    });

    return payment;
  }

  async getPaymentById(id: string): Promise<IPayment> {
    const payment = await this.paymentRepo.findById(id);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }
    return payment;
  }

  async getPaymentByOrderId(orderId: string): Promise<IPayment | null> {
    return this.paymentRepo.findByOrderId(orderId);
  }

  async getPaymentByTransactionId(transactionId: string): Promise<IPayment | null> {
    return this.paymentRepo.findByTransactionId(transactionId);
  }

  async getAllPayments(options: any = {}): Promise<any> {
    return this.paymentRepo.paginate({}, options);
  }

  async updatePaymentStatus(id: string, status: string, transactionId?: string): Promise<IPayment> {
    const payment = await this.paymentRepo.findById(id);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    const updateData: any = { status };
    if (transactionId) {
      updateData.transactionId = transactionId;
    }

    const updated = await this.paymentRepo.updateById(id, updateData);
    if (!updated) {
      throw new NotFoundError('Payment not found');
    }

    if (status === 'completed') {
      await this.orderRepo.updatePaymentStatus(payment.orderId.toString(), 'paid', transactionId);
    } else if (status === 'failed') {
      await this.orderRepo.updatePaymentStatus(payment.orderId.toString(), 'failed');
    }

    return updated;
  }

  async createStripeIntent(amount: number, currency: string, orderId: string, userId?: string): Promise<{ clientSecret: string }> {
    const order = await this.validateOrderOwnership(orderId, userId);
    this.assertAmountMatches(order, amount);

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16',
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency,
      metadata: { orderId: orderId.toString() }
    });

    return { clientSecret: paymentIntent.client_secret };
  }

  async createRazorpayOrder(amount: number, currency: string, orderId: string, userId?: string): Promise<any> {
    const order = await this.validateOrderOwnership(orderId, userId);
    this.assertAmountMatches(order, amount);

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || '',
      key_secret: process.env.RAZORPAY_KEY_SECRET || ''
    });

    const options: any = {
      amount: Math.round(amount * 100),
      currency: currency,
      receipt: orderId.toString(),
      payment_capture: 1
    };

    const razorpayOrder = await razorpay.orders.create(options);
    return razorpayOrder;
  }

  async verifyRazorpayPayment(razorpayOrderId: string, razorpayPaymentId: string, signature: string): Promise<boolean> {
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(body.toString())
      .digest('hex');

    return expectedSignature === signature;
  }

  async refundPayment(paymentId: string, amount?: number, reason?: string): Promise<IPayment> {
    const payment = await this.paymentRepo.findById(paymentId);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    const refundAmount = amount || payment.amount;

    if (payment.method === 'stripe' || payment.method === 'credit_card' || payment.method === 'debit_card') {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
        apiVersion: '2023-10-16',
      });

      await stripe.refunds.create({
        payment_intent: payment.transactionId,
        amount: Math.round(refundAmount * 100),
        reason: 'requested_by_customer'
      });
    } else if (payment.method === 'razorpay') {
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID || '',
        key_secret: process.env.RAZORPAY_KEY_SECRET || ''
      });

      await razorpay.payments.refund(payment.transactionId, {
        amount: Math.round(refundAmount * 100),
        notes: { reason: reason || '' }
      });
    }

    const updated = await this.paymentRepo.updateById(paymentId, {
      status: 'refunded',
      refundAmount,
      refundReason: reason
    });

    if (!updated) {
      throw new NotFoundError('Payment not found');
    }

    await this.orderRepo.updatePaymentStatus(payment.orderId.toString(), 'refunded');

    return updated;
  }
}


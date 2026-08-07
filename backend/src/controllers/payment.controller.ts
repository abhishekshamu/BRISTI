import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import { asyncHandler } from '../middleware/async';
import { BadRequestException } from '../utils/exceptions';

function isAdminUser(user: any): boolean {
  return !!user && (user.role === 'admin' || user.role === 'super_admin' || !!user.isAdmin);
}

function currentUserId(user: any): string | null {
  return user ? String(user.id ?? user._id ?? '') : null;
}

export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  createPayment = asyncHandler(async (req: Request, res: Response) => {
    const userId = currentUserId(req.user);
    const payment = await this.paymentService.createPayment({ ...req.body, userId });
    res.status(201).json({
      success: true,
      data: payment
    });
  });

  getPaymentById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const payment = await this.paymentService.getPaymentById(id);
    const userId = currentUserId(req.user);
    if (!isAdminUser(req.user) && String(payment.userId) !== userId) {
      throw new BadRequestException('Not authorized to view this payment');
    }
    res.status(200).json({
      success: true,
      data: payment
    });
  });

  getPaymentByOrderId = asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const payment = await this.paymentService.getPaymentByOrderId(orderId);
    if (!payment) {
      throw new BadRequestException('No payment found for this order');
    }
    const userId = currentUserId(req.user);
    if (!isAdminUser(req.user) && String(payment.userId) !== userId) {
      throw new BadRequestException('Not authorized to view this payment');
    }
    res.status(200).json({
      success: true,
      data: payment
    });
  });

  getAllPayments = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;
    const options: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };
    const result = await this.paymentService.getAllPayments(options);
    res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages
      }
    });
  });

  updatePaymentStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, transactionId } = req.body;
    const payment = await this.paymentService.updatePaymentStatus(id, status, transactionId);
    res.status(200).json({
      success: true,
      data: payment
    });
  });

  createStripeIntent = asyncHandler(async (req: Request, res: Response) => {
    const { amount, currency, orderId } = req.body;
    const userId = currentUserId(req.user);
    const result = await this.paymentService.createStripeIntent(amount, currency || 'USD', orderId, userId || undefined);
    res.status(200).json({
      success: true,
      data: result
    });
  });

  createRazorpayOrder = asyncHandler(async (req: Request, res: Response) => {
    const { amount, currency, orderId } = req.body;
    const userId = currentUserId(req.user);
    const result = await this.paymentService.createRazorpayOrder(amount, currency || 'INR', orderId, userId || undefined);
    res.status(200).json({
      success: true,
      data: result
    });
  });

  refundPayment = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { amount, reason } = req.body;
    const result = await this.paymentService.refundPayment(id, amount, reason);
    res.status(200).json({
      success: true,
      data: result
    });
  });
}

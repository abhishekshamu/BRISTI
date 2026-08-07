import { Request, Response } from 'express';
import { OrderService } from '../services/order.service';
import { asyncHandler } from '../middleware/async';
import { ValidationError, BadRequestException } from '../utils/exceptions';

function isAdminUser(user: any): boolean {
  return !!user && (user.role === 'admin' || user.role === 'super_admin' || !!user.isAdmin);
}

function actorName(user: any): string {
  if (!user) return 'system';
  if (user.firstName) return `${user.firstName} ${user.lastName || ''}`.trim();
  return user.email || user.name || String(user._id || user.id || '');
}

export class OrderController {
  constructor(private orderService: OrderService) {}

  createOrder = asyncHandler(async (req: Request, res: Response) => {
    // The authenticated user's id is authoritative — never trust a client-supplied userId
    const userId = (req.user as any)?.id ?? (req.user as any)?._id;
    const { items, shippingAddress, billingAddress, paymentMethod, couponCode, guestEmail, notes } = req.body;

    if (!items || !shippingAddress || !paymentMethod) {
      throw new ValidationError('Please provide all required fields');
    }

    if (!userId && !guestEmail) {
      throw new ValidationError('Authentication required, or provide a guest email for guest checkout');
    }

    try {
      const order = await this.orderService.createOrder({
        userId,
        guestEmail: userId ? undefined : guestEmail,
        items,
        shippingAddress,
        billingAddress,
        paymentMethod,
        couponCode,
        notes,
      });

      res.status(201).json({
        success: true,
        data: order
      });
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Failed to create order');
    }
  });

  getOrderById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const order = await this.orderService.getOrderById(id);
    const isAdmin = isAdminUser((req.user as any));
    if (!isAdmin && String(order.userId) !== String((req.user as any)?.id ?? (req.user as any)?._id)) {
      throw new BadRequestException('Not authorized to view this order');
    }

    res.status(200).json({
      success: true,
      data: order
    });
  });

  getOrderByNumber = asyncHandler(async (req: Request, res: Response) => {
    const { orderNumber } = req.params;
    const order = await this.orderService.getOrderByOrderNumber(orderNumber);
    const isAdmin = isAdminUser((req.user as any));
    if (!isAdmin && String(order.userId) !== String((req.user as any)?.id ?? (req.user as any)?._id)) {
      throw new BadRequestException('Not authorized to view this order');
    }

    res.status(200).json({
      success: true,
      data: order
    });
  });

  getUserOrders = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.params.userId as string) ?? (req.user as any)?.id ?? (req.user as any)?._id;
    const { page = 1, limit = 20 } = req.query;
    const options: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sort: { createdAt: -1 }
    };
    const result = await this.orderService.getUserOrders(userId, options);

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

  getAllOrders = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, status, paymentStatus, customer } = req.query;
    const options: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sort: { createdAt: -1 }
    };
    const filter: any = { status, paymentStatus };
    if (customer) filter.userId = customer;
    const result = await this.orderService.getAllOrders(filter, options);

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

  updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!status) {
      throw new ValidationError('Please provide order status');
    }

    const updatedOrder = await this.orderService.updateOrderStatus(id, status, actorName(req.user as any), note);

    res.status(200).json({
      success: true,
      data: updatedOrder
    });
  });

  updatePaymentStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { paymentStatus, paymentId } = req.body;

    if (!paymentStatus) {
      throw new ValidationError('Please provide payment status');
    }

    const updatedOrder = await this.orderService.updatePaymentStatus(id, paymentStatus, paymentId, actorName(req.user as any));

    res.status(200).json({
      success: true,
      data: updatedOrder
    });
  });

  updateNotes = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { notes } = req.body;

    const updatedOrder = await this.orderService.updateNotes(id, notes ?? '');

    res.status(200).json({
      success: true,
      data: updatedOrder
    });
  });

  refundOrder = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    const updatedOrder = await this.orderService.refundOrder(id, reason, actorName(req.user as any));

    res.status(200).json({
      success: true,
      data: updatedOrder
    });
  });

  sendEmail = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { type } = req.body;

    if (!['confirmation', 'shipping', 'delivered'].includes(type)) {
      throw new ValidationError('Invalid email type');
    }

    const updatedOrder = await this.orderService.sendOrderEmail(id, type);

    res.status(200).json({
      success: true,
      data: updatedOrder
    });
  });

  cancelOrder = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const order = await this.orderService.getOrderById(id);
    const isAdmin = isAdminUser((req.user as any));
    if (!isAdmin && String(order.userId) !== String((req.user as any)?.id ?? (req.user as any)?._id)) {
      throw new BadRequestException('Not authorized to cancel this order');
    }
    const updated = await this.orderService.cancelOrder(id, req.body?.reason, actorName(req.user as any));

    res.status(200).json({
      success: true,
      data: updated
    });
  });

  getOrderForTracking = asyncHandler(async (req: Request, res: Response) => {
    const { orderNumber } = req.params;
    const order = await this.orderService.getOrderForTracking(orderNumber);
    res.status(200).json({
      success: true,
      data: order
    });
  });

  addTrackingInfo = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { trackingNumber, trackingUrl } = req.body;

    if (!trackingNumber) {
      throw new ValidationError('Please provide tracking number');
    }

    const order = await this.orderService.addTrackingInfo(id, trackingNumber, trackingUrl, actorName(req.user as any));

    res.status(200).json({
      success: true,
      data: order
    });
  });

  getOrderStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await this.orderService.getOrderStats();

    res.status(200).json({
      success: true,
      data: stats
    });
  });

  getSalesStats = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, days } = req.query;
    const summary = await this.orderService.getSalesStats(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    const daily = await this.orderService.getDailySales(Number.parseInt(days as string) || 30);

    res.status(200).json({
      success: true,
      data: {
        summary: summary[0] ?? null,
        daily,
      }
    });
  });
}

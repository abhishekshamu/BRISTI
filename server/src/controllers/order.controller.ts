import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service';
import { asyncHandler } from '../middleware/async';
import { ValidationError, BadRequestException } from '../utils/exceptions';

export class OrderController {
  constructor(private orderService: OrderService) {}

  createOrder = asyncHandler(async (req: Request, res: Response) => {
    // The authenticated user's id is authoritative — never trust a client-supplied userId
    const userId = (req.user as any)?.id ?? (req.user as any)?._id;
    const { items, shippingAddress, billingAddress, paymentMethod, couponCode } = req.body;

    if (!userId) {
      throw new ValidationError('Authentication required');
    }

    if (!items || !shippingAddress || !paymentMethod) {
      throw new ValidationError('Please provide all required fields');
    }

    try {
      const order = await this.orderService.createOrder({
        userId,
        items,
        shippingAddress,
        billingAddress,
        paymentMethod,
        couponCode
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
    const isAdmin = (req.user as any)?.role === 'admin' || (req.user as any)?.isAdmin;
    if (!isAdmin && String(order.userId) !== String((req.user as any)?.id ?? (req.user as any)?._id)) {
      throw new BadRequestException('Not authorized to view this order');
    }

    res.status(200).json({
      success: true,
      data: order
    });
  });

  getUserOrders = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.id ?? (req.user as any)?._id;
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
    const { page = 1, limit = 20, status, paymentStatus } = req.query;
    const options: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sort: { createdAt: -1 }
    };
    const result = await this.orderService.getAllOrders({ status, paymentStatus }, options);

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
    const { status } = req.body;

    if (!status) {
      throw new ValidationError('Please provide order status');
    }

    const updatedOrder = await this.orderService.updateOrderStatus(id, status);

    res.status(200).json({
      success: true,
      data: updatedOrder
    });
  });

  cancelOrder = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const order = await this.orderService.getOrderById(id);
    const isAdmin = (req.user as any)?.role === 'admin' || (req.user as any)?.isAdmin;
    if (!isAdmin && String(order.userId) !== String((req.user as any)?.id ?? (req.user as any)?._id)) {
      throw new BadRequestException('Not authorized to cancel this order');
    }
    const updated = await this.orderService.cancelOrder(id);

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

    const order = await this.orderService.addTrackingInfo(id, trackingNumber, trackingUrl);

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
    const { startDate, endDate } = req.query;
    const stats = await this.orderService.getSalesStats(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.status(200).json({
      success: true,
      data: stats
    });
  });
}

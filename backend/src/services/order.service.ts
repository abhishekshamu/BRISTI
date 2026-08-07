import mongoose from 'mongoose';
import { OrderRepository } from '../repositories/order.repository';
import { ProductRepository } from '../repositories/product.repository';
import { CartRepository } from '../repositories/cart.repository';
import { UserRepository } from '../repositories/user.repository';
import { CouponRepository } from '../repositories/coupon.repository';
import { InventoryItemRepository } from '../repositories/inventory-item.repository';
import { SettingsRepository } from '../repositories/settings.repository';
import { AdminRepository } from '../repositories/admin.repository';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import { ProductModel } from '../models/Product';
import { IOrder } from 'shared/types';
import { NotFoundException, BadRequestException } from '../utils/exceptions';

export class OrderService {
  constructor(
    private orderRepo: OrderRepository,
    private productRepo: ProductRepository,
    private cartRepo: CartRepository,
    private userRepo: UserRepository,
    private couponRepo: CouponRepository,
    private inventoryRepo: InventoryItemRepository,
    private settingsRepo: SettingsRepository,
    private adminRepo: AdminRepository,
    private notificationService: NotificationService,
    private emailService: EmailService
  ) {}

  private async getOrderSettings() {
    const settings = await this.settingsRepo.getSettings();
    return {
      freeShippingThreshold: settings?.freeShippingThreshold ?? 100,
      taxRate: settings?.taxRate ?? 0.1,
      flatShippingRate: settings?.orderSettings?.flatShippingRate ?? 15,
      allowGuestCheckout: settings?.orderSettings?.allowGuestCheckout ?? true,
      orderNumberPrefix: settings?.orderSettings?.orderNumberPrefix ?? 'BRS',
      orderNumberLength: settings?.orderSettings?.orderNumberLength ?? 8,
    };
  }

  async createOrder(data: {
    userId?: string;
    guestEmail?: string;
    items: Array<{
      productId: string;
      variantId?: string;
      quantity: number;
      selectedOptions?: Record<string, string>;
    }>;
    shippingAddress: any;
    billingAddress?: any;
    paymentMethod: IOrder['paymentMethod'];
    couponCode?: string;
    notes?: string;
  }): Promise<IOrder> {
    const isGuest = !data.userId;
    let user = null;
    if (!isGuest) {
      user = await this.userRepo.findById(data.userId!);
      if (!user) {
        throw new NotFoundException('User not found');
      }
    } else if (!data.guestEmail) {
      throw new BadRequestException('Guest orders require a guest email');
    }

    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    const orderConfig = await this.getOrderSettings();

    // The order number is randomly generated; on a (rare) unique-index
    // collision the whole transaction is safely retried with a fresh number.
    for (let attempt = 1; attempt <= 3; attempt++) {
      const session = await mongoose.startSession();

      try {
        session.startTransaction();

        // Validate items, verify stock atomically, calculate totals
        let subtotal = 0;
        const orderItems: any[] = [];

        for (const itemData of data.items) {
          const product = await this.productRepo.findById(itemData.productId, session);
          if (!product) {
            throw new NotFoundException(`Product not found: ${itemData.productId}`);
          }
          if (product.status !== 'active') {
            throw new BadRequestException(`${product.name} is not available for purchase`);
          }

          let unitPrice = product.price;
          let variant = null;
          if (itemData.variantId) {
            variant = product.variants?.find((v: any) => String(v.id) === String(itemData.variantId));
            if (!variant) {
              throw new BadRequestException(`Variant not found for ${product.name}`);
            }
            unitPrice = product.price + (variant.priceAdjustment ?? 0);
          }

          // Atomically decrement stock to prevent overselling
          if (product.trackQuantity) {
            // Guard aggregate stock atomically; the transaction aborts if either guard fails
            const aggregateGuard = await ProductModel.updateOne(
              { _id: product._id, stock: { $gte: itemData.quantity } },
              { $inc: { stock: -itemData.quantity } },
              { session }
            ).exec();
            if (aggregateGuard.modifiedCount === 0) {
              throw new BadRequestException(`Insufficient stock for ${product.name}`);
            }

            if (variant) {
              const variantGuard = await ProductModel.updateOne(
                { _id: product._id, 'variants.id': variant.id, 'variants.stock': { $gte: itemData.quantity } },
                { $inc: { 'variants.$.stock': -itemData.quantity } },
                { session }
              ).exec();
              if (variantGuard.modifiedCount === 0) {
                throw new BadRequestException(`Insufficient stock for ${product.name} (${variant.name})`);
              }
            }
          }

          const itemTotal = unitPrice * itemData.quantity;
          subtotal += itemTotal;

          const featuredImage = product.images?.find((img: any) => img.isFeatured) || product.images?.[0];

          orderItems.push({
            productId: product._id,
            variantId: itemData.variantId || null,
            productName: product.name,
            variantName: variant ? variant.name : undefined,
            quantity: itemData.quantity,
            price: unitPrice,
            total: itemTotal,
            sku: variant?.sku || product.sku,
            image: featuredImage?.url,
          });

          // Keep inventory ledger in sync
          await this.inventoryRepo.applyOrderItem(
            product._id.toString(),
            itemData.variantId,
            itemData.quantity,
            undefined as any,
            session
          );
        }

        const taxRate = orderConfig.taxRate;
        const tax = parseFloat((subtotal * taxRate).toFixed(2));
        const shipping = subtotal >= orderConfig.freeShippingThreshold ? 0 : orderConfig.flatShippingRate;

        // Apply coupon (validated against cart scope)
        let discount = 0;
        let couponCode = null;
        let couponDiscount = 0;

        if (data.couponCode) {
          const coupon = await this.couponRepo.findByCode(data.couponCode, session);
          if (coupon && coupon.isValid) {
            if (coupon.minimumPurchase && subtotal < coupon.minimumPurchase) {
              throw new BadRequestException(`Minimum purchase of $${coupon.minimumPurchase} required`);
            }
            if (coupon.perCustomerLimit && user) {
              const customerUses = (coupon.customersUsed ?? []).filter((id: any) => String(id) === String(user._id)).length;
              if (customerUses >= coupon.perCustomerLimit) {
                throw new BadRequestException('You have already used this coupon');
              }
            }
            const scoped = await this.couponRepo.validateScopes(coupon, orderItems, session);
            if (!scoped.valid) {
              throw new BadRequestException(scoped.message || 'Coupon does not apply to these items');
            }
            discount = coupon.calculateDiscount(subtotal, shipping);
            couponCode = coupon.code;
            couponDiscount = discount;
            if (user) {
              await this.couponRepo.incrementUsage(coupon.code, user._id.toString(), session);
            } else {
              await this.couponRepo.incrementUsage(coupon.code, undefined as any, session);
            }
          }
        }

        const total = parseFloat((subtotal + tax + shipping - discount).toFixed(2));

        // Create order inside the transaction
        const order = await this.orderRepo.create({
          orderNumber: this.generateOrderNumber(orderConfig.orderNumberPrefix, orderConfig.orderNumberLength),
          userId: isGuest ? undefined : user._id,
          guestEmail: isGuest ? data.guestEmail : undefined,
          items: orderItems,
          subtotal,
          tax,
          shipping,
          discount,
          total,
          status: 'pending',
          paymentStatus: 'pending',
          paymentMethod: data.paymentMethod,
          shippingAddress: data.shippingAddress,
          billingAddress: data.billingAddress || data.shippingAddress,
          couponCode,
          couponDiscount,
          notes: data.notes,
          statusHistory: [{
            status: 'pending',
            note: isGuest ? 'Order placed (guest)' : 'Order placed',
            changedAt: new Date(),
          }],
        } as any, session);

        // Attach the order reference to inventory history entries created during the decrement
        for (const itemData of data.items) {
          await this.inventoryRepo.setHistoryOrderId(
            itemData.productId,
            itemData.variantId,
            order._id.toString(),
            session
          );
        }

        // Clear cart (registered users only)
        if (user) {
          await this.cartRepo.clearByUserId(user._id.toString(), session);
        }

        await session.commitTransaction();

        // Fire-and-forget notifications / emails after commit
        if (user) {
          await this.notificationService.createNotification({
            userId: user._id.toString(),
            title: 'Order Placed',
            message: `Your order #${order.orderNumber} has been placed successfully!`,
            type: 'success',
            relatedId: order._id,
            relatedType: 'Order',
          });
        }
        await this.notifyAdmins({
          title: 'New Order',
          message: `New order #${order.orderNumber} for $${total.toFixed(2)} by ${user ? user.email : data.guestEmail}`,
          type: 'info',
          relatedId: order._id,
          relatedType: 'Order',
        });
        await this.emailService.sendOrderConfirmation(user ? user.email : (data.guestEmail as string), {
          orderNumber: order.orderNumber,
          items: orderItems,
          subtotal,
          tax,
          shipping,
          discount,
          total,
        });

        return order;
      } catch (error) {
        await session.abortTransaction();
        const duplicateOrderNumber =
          (error as any)?.code === 11000 && /orderNumber/.test((error as any)?.message ?? '');
        if (duplicateOrderNumber && attempt < 3) {
          continue;
        }
        throw error;
      } finally {
        session.endSession();
      }
    }

    throw new BadRequestException('Could not generate a unique order number, please retry');
  }

  private async notifyAdmins(data: { title: string; message: string; type: string; relatedId?: any; relatedType?: string }) {
    try {
      const admins = await this.adminRepo.findMany({ isActive: true }, {});
      for (const admin of admins) {
        await this.notificationService.createNotification({
          userId: admin._id.toString(),
          title: data.title,
          message: data.message,
          type: data.type as any,
          relatedId: data.relatedId,
          relatedType: data.relatedType,
        });
      }
    } catch {
      // Notification failures must never break business flows
    }
  }

  async getOrderById(id: string): Promise<IOrder> {
    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async getOrderByOrderNumber(orderNumber: string): Promise<IOrder> {
    const order = await this.orderRepo.findOne({ orderNumber });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async getUserOrders(userId: string, options: any = {}): Promise<any> {
    return this.orderRepo.paginate({ userId }, options);
  }

  async getAllOrders(filter: any = {}, options: any = {}): Promise<any> {
    return this.orderRepo.paginate(filter, options);
  }

  async getOrderStats(): Promise<any> {
    return this.orderRepo.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
  }

  async getSalesStats(startDate?: Date, endDate?: Date): Promise<any> {
    return this.orderRepo.getSalesStats(startDate || new Date(0), endDate || new Date());
  }

  async getDailySales(days: number = 30): Promise<any> {
    return this.orderRepo.getDailySales(days);
  }

  private recordStatusHistory(order: any, status: string, note?: string, actorName?: string): any {
    const entry = {
      status,
      note,
      changedBy: actorName,
      changedAt: new Date(),
    };
    const history = Array.isArray(order.statusHistory) ? [...order.statusHistory, entry] : [entry];
    return history;
  }

  async updateOrderStatus(id: string, status: string, actorName?: string, note?: string): Promise<IOrder> {
    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.status === 'cancelled' || order.status === 'refunded') {
      throw new BadRequestException('Cancelled or refunded orders cannot change status');
    }
    if (status === order.status) {
      throw new BadRequestException(`Order is already ${status}`);
    }

    const history = this.recordStatusHistory(order, status, note || undefined, actorName);
    const updated = await this.orderRepo.updateOrderStatus(id, status);

    if (status === 'cancelled' || status === 'refunded') {
      await this.restoreStockForOrder(order, status === 'cancelled' ? 'cancel' : 'refund');
      await this.orderRepo.updateById(id, { statusHistory: history });
      const paymentUpdate: any = {};
      if (status === 'refunded' && order.paymentStatus !== 'refunded') {
        paymentUpdate.paymentStatus = 'refunded';
        paymentUpdate.refundedAt = new Date();
      }
      if (Object.keys(paymentUpdate).length) {
        await this.orderRepo.updateById(id, paymentUpdate);
      }
    } else {
      await this.orderRepo.updateById(id, { statusHistory: history });
    }

    if (order.userId) {
      await this.notificationService.createNotification({
        userId: order.userId.toString(),
        title: 'Order Update',
        message: `Your order #${order.orderNumber} is now ${status}.`,
        type: 'info',
        relatedId: order._id,
        relatedType: 'Order',
      });
    }

    return updated;
  }

  async updatePaymentStatus(id: string, paymentStatus: string, paymentId?: string, actorName?: string): Promise<IOrder> {
    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const history = this.recordStatusHistory(order, order.status, `Payment status: ${order.paymentStatus} -> ${paymentStatus}`, actorName);
    await this.orderRepo.updateById(id, { statusHistory: history });
    const updated = await this.orderRepo.updatePaymentStatus(id, paymentStatus, paymentId);

    if (paymentStatus === 'failed') {
      // Stock was reserved at order creation; a failed payment must release it.
      if (order.status === 'pending') {
        await this.restoreStockForOrder(order, 'cancel');
        await this.orderRepo.updateOrderStatus(id, 'cancelled');
        await this.orderRepo.updateById(id, {
          statusHistory: this.recordStatusHistory(order, 'cancelled', 'Cancelled due to failed payment', actorName),
        });
      } else {
        await this.restoreStockForOrder(order, 'cancel');
      }
      await this.notifyAdmins({
        title: 'Failed Payment',
        message: `Payment failed for order #${order.orderNumber} (${order.paymentMethod}).`,
        type: 'error',
        relatedId: order._id,
        relatedType: 'Order',
      });
    }

    return updated;
  }

  async addTrackingInfo(id: string, trackingNumber: string, trackingUrl?: string, actorName?: string): Promise<IOrder> {
    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    const history = this.recordStatusHistory(order, order.status, `Tracking added: ${trackingNumber}`, actorName);
    await this.orderRepo.updateById(id, { statusHistory: history });
    const updated = await this.orderRepo.addTrackingInfo(id, trackingNumber, trackingUrl);
    if (order.userId) {
      await this.notificationService.createNotification({
        userId: order.userId.toString(),
        title: 'Order Shipped',
        message: `Your order #${order.orderNumber} has shipped. Tracking: ${trackingNumber}`,
        type: 'info',
        relatedId: order._id,
        relatedType: 'Order',
      });
    }
    return updated;
  }

  async cancelOrder(id: string, reason?: string, actorName?: string): Promise<IOrder> {
    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'pending' && order.status !== 'processing' && order.status !== 'confirmed') {
      throw new BadRequestException('Only pending, confirmed or processing orders can be cancelled');
    }

    const history = this.recordStatusHistory(order, 'cancelled', reason || 'Cancelled by administrator', actorName);
    await this.orderRepo.updateById(id, { statusHistory: history });

    await this.restoreStockForOrder(order, 'cancel');

    const updatedOrder = await this.orderRepo.updateOrderStatus(id, 'cancelled');

    if (order.userId) {
      await this.notificationService.createNotification({
        userId: order.userId.toString(),
        title: 'Order Cancelled',
        message: `Your order #${order.orderNumber} has been cancelled.`,
        type: 'warning',
        relatedId: order._id,
        relatedType: 'Order',
      });
    }

    return updatedOrder;
  }

  async refundOrder(id: string, reason?: string, actorName?: string): Promise<IOrder> {
    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === 'cancelled' || order.status === 'refunded') {
      throw new BadRequestException('This order cannot be refunded (already cancelled or refunded)');
    }

    await this.restoreStockForOrder(order, 'refund');

    const history = this.recordStatusHistory(order, 'refunded', reason || `Refunded (payment: ${order.paymentStatus})`, actorName);
    await this.orderRepo.updateById(id, {
      status: 'refunded',
      statusHistory: history,
    });
    await this.orderRepo.updatePaymentStatus(id, 'refunded');

    const updatedOrder = await this.orderRepo.findById(id);
    if (!updatedOrder) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId) {
      await this.notificationService.createNotification({
        userId: order.userId.toString(),
        title: 'Order Refunded',
        message: `Your order #${order.orderNumber} has been refunded.`,
        type: 'warning',
        relatedId: order._id,
        relatedType: 'Order',
      });
    }

    return updatedOrder;
  }

  async updateNotes(id: string, notes: string): Promise<IOrder> {
    const updated = await this.orderRepo.updateById(id, { notes });
    if (!updated) {
      throw new NotFoundException('Order not found');
    }
    return updated;
  }

  async sendOrderEmail(id: string, type: 'confirmation' | 'shipping' | 'delivered'): Promise<IOrder> {
    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    let email: string;
    if (order.guestEmail) {
      email = order.guestEmail;
    } else if (order.userId) {
      const user = await this.userRepo.findById(order.userId.toString());
      email = user?.email || '';
    } else {
      email = '';
    }
    if (!email) {
      throw new BadRequestException('No customer email available for this order');
    }

    if (type === 'confirmation') {
      await this.emailService.sendOrderConfirmation(email, {
        orderNumber: order.orderNumber,
        items: order.items,
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        discount: order.discount,
        total: order.total,
      });
    } else {
      const subject = type === 'shipping' ? 'Your BRISTI order has shipped' : 'Your BRISTI order has been delivered';
      await this.emailService.sendNotificationEmail(email, subject, `Order #${order.orderNumber} ${type === 'shipping' ? 'has shipped' : 'has been delivered'}. Thank you for shopping with BRISTI.`);
    }

    const emailHistory = Array.isArray(order.emailHistory) ? [...order.emailHistory, { type, sentAt: new Date() }] : [{ type, sentAt: new Date() }];
    return (await this.orderRepo.updateById(id, { emailHistory })) as IOrder;
  }

  async restoreStockForOrder(order: IOrder, reason: 'cancel' | 'refund'): Promise<void> {
    // Idempotency guard: stock must only ever be returned to the shelf once,
    // regardless of how many cancellation paths run against the same order.
    if ((order as any).stockRestored) return;

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      for (const item of order.items) {
        await ProductModel.updateOne(
          { _id: item.productId, ...(item.variantId ? { 'variants.id': item.variantId } : {}) },
          item.variantId
            ? { $inc: { 'variants.$.stock': item.quantity, stock: item.quantity } }
            : { $inc: { stock: item.quantity } },
          { session }
        ).exec();

        await this.inventoryRepo.restoreOrderItem(
          item.productId.toString(),
          item.variantId || undefined,
          item.quantity,
          order._id.toString(),
          reason,
          session
        );
      }
      await this.orderRepo.updateById(order._id.toString(), { stockRestored: true }, session);
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getOrderForTracking(orderNumber: string) {
    const order = await this.orderRepo.findOne({ orderNumber });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      items: order.items.map((i: any) => ({
        productName: i.productName,
        quantity: i.quantity,
        price: i.price,
      })),
    };
  }

  private generateOrderNumber(prefix: string = 'BRS', length: number = 8): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, '0');
    return `${prefix}-${year}${month}${day}-${random}`;
  }
}

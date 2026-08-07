import { OrderModel } from '../models/Order';
import { BaseRepository } from './base.repository';
import { IOrder } from 'shared/types';

export class OrderRepository extends BaseRepository<IOrder> {
  constructor() {
    super(OrderModel);
  }

  async findByOrderNumber(orderNumber: string): Promise<IOrder | null> {
    return this.findOne({ orderNumber });
  }

  async findByUserId(userId: string, options: any = {}): Promise<IOrder[]> {
    return this.findMany({ userId }, options);
  }

  async findByStatus(status: string, options: any = {}): Promise<IOrder[]> {
    return this.findMany({ status }, options);
  }

  async findRecent(limit: number = 10): Promise<IOrder[]> {
    return this.findMany(
      {},
      { sort: { createdAt: -1 }, limit }
    );
  }

  async getSalesStats(startDate: Date, endDate: Date): Promise<any> {
    return this.model.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          paymentStatus: 'paid',
          status: { $in: ['processing', 'shipped', 'delivered'] }
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$total' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$total' },
          totalTax: { $sum: '$tax' },
          totalShipping: { $sum: '$shipping' }
        }
      }
    ]).exec();
  }

  async getDailySales(days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return this.model.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            }
          },
          totalSales: { $sum: '$total' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]).exec();
  }

  async updateOrderStatus(orderId: string, status: string): Promise<IOrder | null> {
    const updateData: any = { status };
    
    if (status === 'shipped') {
      updateData.shippedAt = new Date();
    } else if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    } else if (status === 'cancelled') {
      updateData.cancelledAt = new Date();
    }
    
    return this.updateById(orderId, updateData);
  }

  async updatePaymentStatus(orderId: string, paymentStatus: string, paymentId?: string): Promise<IOrder | null> {
    const updateData: any = { paymentStatus };
    
    if (paymentId) {
      updateData.paymentId = paymentId;
    }
    
    if (paymentStatus === 'paid') {
      updateData.paidAt = new Date();
    } else if (paymentStatus === 'failed') {
      updateData.failedAt = new Date();
    } else if (paymentStatus === 'refunded') {
      updateData.refundedAt = new Date();
    }
    
    return this.updateById(orderId, updateData);
  }

  async addTrackingInfo(orderId: string, trackingNumber: string, trackingUrl?: string): Promise<IOrder | null> {
    return this.updateById(orderId, {
      trackingNumber,
      trackingUrl: trackingUrl || null
    });
  }
}

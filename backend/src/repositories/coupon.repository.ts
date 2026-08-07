import { CouponModel } from '../models/Coupon';
import { BaseRepository } from './base.repository';
import { ICoupon } from 'shared/types';

export class CouponRepository extends BaseRepository<ICoupon> {
  constructor() {
    super(CouponModel);
  }

  async findByCode(code: string, session?: any): Promise<ICoupon | null> {
    return this.findOne({ code: code.toUpperCase() }, session);
  }

  async incrementUsage(code: string, userId?: string, session?: any): Promise<ICoupon | null> {
    const update: any = { $inc: { usageCount: 1 } };
    if (userId) {
      update.$addToSet = { customersUsed: userId };
    }
    return this.findOneAndUpdate(
      { code: code.toUpperCase() },
      update,
      { new: true },
      session
    );
  }

  async validateScopes(coupon: any, orderItems: Array<{ productId: any; variantId?: any }>, session?: any): Promise<{ valid: boolean; message?: string }> {
    if (coupon.appliesTo === 'all') {
      return { valid: true };
    }

    const productIds = orderItems.map((i) => i.productId);

    if (coupon.appliesTo === 'specific_products') {
      const scoped = productIds.some((pid) => (coupon.productIds ?? []).some((cp: any) => String(cp) === String(pid)));
      return scoped ? { valid: true } : { valid: false, message: 'Coupon only applies to selected products' };
    }

    const products = await this.model.find({ _id: { $in: productIds } }).select('category collection').session(session ?? null).exec();

    if (coupon.appliesTo === 'specific_categories') {
      const scoped = products.some((p: any) => (coupon.categoryIds ?? []).some((c: any) => String(c) === String(p.category)));
      return scoped ? { valid: true } : { valid: false, message: 'Coupon only applies to selected categories' };
    }

    if (coupon.appliesTo === 'specific_collections') {
      const scoped = products.some((p: any) => (coupon.collectionIds ?? []).some((c: any) => String(c) === String(p.collection)));
      return scoped ? { valid: true } : { valid: false, message: 'Coupon only applies to selected collections' };
    }

    return { valid: true };
  }

  async findValidCoupons(options: any = {}): Promise<ICoupon[]> {
    const now = new Date();
    
    return this.findMany(
      {
        isActive: true,
        $or: [
          { startsAt: { $exists: false } },
          { startsAt: { $lte: now } }
        ],
        $and: [
          {
            $or: [
              { expiresAt: { $exists: false } },
              { expiresAt: { $gte: now } }
            ]
          }
        ]
      },
      options
    );
  }

  async isValidCode(code: string): Promise<boolean> {
    const coupon = await this.findByCode(code);
    return coupon ? coupon.isValid : false;
  }

  async calculateDiscount(code: string, cartTotal: number): Promise<number> {
    const coupon = await this.findByCode(code);
    if (!coupon || !coupon.isValid) return 0;
    
    return coupon.calculateDiscount(cartTotal);
  }

  async getExpiringSoon(days: number = 7): Promise<ICoupon[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);
    
    return this.findMany({
      isActive: true,
      expiresAt: { $gte: now, $lte: futureDate }
    });
  }

  async getUsageStats(): Promise<any> {
    return this.model.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: '$type',
          totalUsage: { $sum: '$usageCount' },
          count: { $sum: 1 }
        }
      }
    ]).exec();
  }
}

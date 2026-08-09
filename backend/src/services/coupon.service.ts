import { CouponRepository } from '../repositories/coupon.repository';
import { ICoupon } from '../../shared/types';
import { Types } from 'mongoose';
import { ValidationError, NotFoundError, BadRequestError } from '../utils/exceptions';

export class CouponService {
  constructor(private couponRepo: CouponRepository) {}

  async createCoupon(couponData: Partial<ICoupon>): Promise<ICoupon> {
    if (!couponData.code) {
      throw new ValidationError('Coupon code is required');
    }

    const existingCoupon = await this.couponRepo.findByCode(couponData.code);
    if (existingCoupon) {
      throw new BadRequestError('Coupon with this code already exists');
    }

    return this.couponRepo.create(couponData);
  }

async getCouponByCode(code: string): Promise<ICoupon> {
    // Accept either a Mongo _id (used by the admin edit screen) or a coupon code.
    const byId = Types.ObjectId.isValid(code) ? await this.couponRepo.findById(code) : null;
    const coupon = byId ?? await this.couponRepo.findByCode(code);
    if (!coupon) {
      throw new NotFoundError('Coupon not found');
    }
    return coupon.toObject();
  }

  async getAllCoupons(options: any = {}): Promise<any> {
    const { isActive, ...paginateOptions } = options;
    const filter: any = {};
    if (isActive !== undefined) filter.isActive = Boolean(isActive);
    return this.couponRepo.paginate(filter, paginateOptions);
  }

  async updateCoupon(couponId: string, updateData: Partial<ICoupon>): Promise<ICoupon> {
    const coupon = await this.couponRepo.findById(couponId);
    if (!coupon) {
      throw new NotFoundError('Coupon not found');
    }
    return this.couponRepo.updateById(couponId, updateData);
  }

  async deleteCoupon(couponId: string): Promise<boolean> {
    const coupon = await this.couponRepo.findById(couponId);
    if (!coupon) {
      throw new NotFoundError('Coupon not found');
    }
    return this.couponRepo.deleteById(couponId);
  }

  async validateCoupon(
    code: string,
    subtotal: number,
    options: { items?: Array<{ productId: any; variantId?: any }>; userId?: string; shipping?: number } = {}
  ): Promise<{ valid: boolean; discount: number; message?: string; coupon?: ICoupon }> {
    const coupon = await this.couponRepo.findByCode(code);
    if (!coupon) {
      return { valid: false, discount: 0, message: 'Invalid coupon code' };
    }

    if (!coupon.isActive) {
      return { valid: false, discount: 0, message: 'This coupon is no longer active' };
    }

    if (coupon.startsAt && coupon.startsAt > new Date()) {
      return { valid: false, discount: 0, message: 'This coupon is not active yet' };
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return { valid: false, discount: 0, message: 'This coupon has expired' };
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return { valid: false, discount: 0, message: 'This coupon has reached its usage limit' };
    }

    if (coupon.perCustomerLimit && options.userId) {
      const customerUses = (coupon.customersUsed ?? []).filter((id: any) => String(id) === String(options.userId)).length;
      if (customerUses >= coupon.perCustomerLimit) {
        return { valid: false, discount: 0, message: 'You have already used this coupon' };
      }
    }

    if (coupon.minimumPurchase && subtotal < coupon.minimumPurchase) {
      return { valid: false, discount: 0, message: `Minimum purchase of $${coupon.minimumPurchase} required` };
    }

    if (options.items && options.items.length > 0) {
      const scoped = await this.couponRepo.validateScopes(coupon, options.items);
      if (!scoped.valid) {
        return { valid: false, discount: 0, message: scoped.message };
      }
    }

    const discount = coupon.calculateDiscount(subtotal, options.shipping ?? 0);

    return { valid: true, discount, coupon: this.sanitizeCoupon(coupon) };
  }

  /** Public-safe projection: never expose usage counters, customer lists or
   * internal settings through the storefront validation endpoint. */
  private sanitizeCoupon(coupon: any): any {
    const doc = typeof coupon.toObject === 'function' ? coupon.toObject() : coupon;
    return {
      _id: doc._id,
      code: doc.code,
      description: doc.description ?? undefined,
      discountType: doc.discountType,
      discountValue: doc.discountValue,
      minimumPurchase: doc.minimumPurchase ?? undefined,
      startsAt: doc.startsAt ?? undefined,
      expiresAt: doc.expiresAt ?? undefined
    };
  }
}


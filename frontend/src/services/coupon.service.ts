import { api } from '@/lib/api';
import type { Coupon } from '@shared/types';

export interface CouponValidation {
  valid: boolean;
  discount: number;
  coupon?: Coupon;
}

export const couponService = {
  async validate(code: string, subtotal = 0): Promise<CouponValidation> {
    const response = await api.post('/coupons/validate', { code, subtotal });
    return response.data.data as CouponValidation;
  },
};

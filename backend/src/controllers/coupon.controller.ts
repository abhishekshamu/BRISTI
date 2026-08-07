import { Request, Response } from 'express';
import { CouponService } from '../services/coupon.service';
import { asyncHandler } from '../middleware/async';
import { ValidationError } from '../utils/exceptions';

export class CouponController {
  constructor(private couponService: CouponService) {}

  createCoupon = asyncHandler(async (req: Request, res: Response) => {
    const coupon = await this.couponService.createCoupon(req.body);
    res.status(201).json({ success: true, data: coupon });
  });

  getCouponByCode = asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.params;
    const coupon = await this.couponService.getCouponByCode(code);
    res.status(200).json({ success: true, data: coupon });
  });

  getAllCoupons = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, isActive } = req.query;
    const result = await this.couponService.getAllCoupons({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      ...(isActive !== undefined ? { isActive: isActive === 'true' } : {})
    });
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

  updateCoupon = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const coupon = await this.couponService.updateCoupon(id, req.body);
    res.status(200).json({ success: true, data: coupon });
  });

  deleteCoupon = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.couponService.deleteCoupon(id);
    res.status(200).json({ success: true, message: 'Coupon deleted successfully' });
  });

  validateCoupon = asyncHandler(async (req: Request, res: Response) => {
    const { code, subtotal, items, shipping } = req.body;
    if (!code) {
      throw new ValidationError('Please provide coupon code');
    }
    const userId = (req as any).user?.id;
    const result = await this.couponService.validateCoupon(code, subtotal || 0, {
      items,
      userId,
      shipping,
    });
    res.status(200).json({ success: true, data: result });
  });
}

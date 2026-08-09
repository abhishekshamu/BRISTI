// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';
import { ICoupon } from '../../shared/types';

export interface ICouponDoc extends Omit<ICoupon, '_id'>, Document {}

const CouponSchema: Schema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed_amount', 'free_shipping', 'bogo'],
    required: true,
  },
  value: {
    type: Number,
    required: true,
    min: 0,
  },
  minimumPurchase: {
    type: Number,
    min: 0,
  },
  maximumDiscount: {
    type: Number,
    min: 0,
  },
  startsAt: {
    type: Date,
  },
  expiresAt: {
    type: Date,
  },
  usageLimit: {
    type: Number,
    required: true,
    min: 0,
  },
  usageCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  perCustomerLimit: {
    type: Number,
    min: 0,
  },
  customersUsed: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  appliesTo: {
    type: String,
    enum: ['all', 'specific_products', 'specific_categories', 'specific_collections'],
    default: 'all',
  },
  productIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Product',
  }],
  categoryIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Category',
  }],
  collectionIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Collection',
  }],
  appliesToSaleItems: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
CouponSchema.index({ type: 1 });
CouponSchema.index({ isActive: 1 });
CouponSchema.index({ startsAt: 1 });
CouponSchema.index({ expiresAt: 1 });
CouponSchema.index({ appliesTo: 1 });

// Pre-save hook to uppercase code
CouponSchema.pre('save', function(next) {
  if (this.isModified('code')) {
    this.code = this.code.toUpperCase();
  }
  
  next();
});

// Virtual for checking if coupon is valid
CouponSchema.virtual('isValid').get(function() {
  const now = new Date();
  
  if (!this.isActive) return false;
  if (this.usageLimit > 0 && this.usageCount >= this.usageLimit) return false;
  if (this.startsAt && now < this.startsAt) return false;
  if (this.expiresAt && now > this.expiresAt) return false;
  
  return true;
});

// Method to calculate discount
CouponSchema.methods.calculateDiscount = function(cartTotal: number, shipping: number = 0): number {
  if (!this.isValid) return 0;
  
  let discount = 0;
  
  switch (this.type) {
    case 'percentage':
      discount = Math.min(cartTotal * (this.value / 100), this.maximumDiscount || Number.MAX_VALUE);
      break;
    case 'fixed_amount':
      discount = Math.min(this.value, cartTotal);
      if (this.maximumDiscount) {
        discount = Math.min(discount, this.maximumDiscount);
      }
      break;
    case 'free_shipping':
      discount = shipping;
      if (this.maximumDiscount) {
        discount = Math.min(discount, this.maximumDiscount);
      }
      break;
    case 'bogo':
      // BOGO gives the cheapest item free when a full-price item is present
      discount = 0;
      break;
  }
  
  // Apply minimum purchase requirement
  if (this.minimumPurchase && cartTotal < this.minimumPurchase) {
    return 0;
  }
  
  return discount;
};

export const CouponModel = mongoose.model<ICouponDoc>('Coupon', CouponSchema);




// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';
import { PromotionBanner } from 'shared/types';

export interface IPromotionBannerDoc extends Omit<PromotionBanner, '_id'>, Document {}

const PromotionBannerSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  scope: {
    type: String,
    enum: ['all', 'selected'],
    default: 'all',
  },
  categorySlugs: {
    type: [String],
    default: [],
  },
  desktopImage: {
    type: String, // URL to desktop image
  },
  tabletImage: {
    type: String, // URL to tablet image
  },
  mobileImage: {
    type: String, // URL to mobile image
  },
  redirectUrl: {
    type: String, // URL the banner links to
  },
  openInNewTab: {
    type: Boolean,
    default: true,
  },
  startDate: {
    type: Date, // Optional scheduling window start
  },
  endDate: {
    type: Date, // Optional scheduling window end
  },
  backgroundColor: {
    type: String, // CSS color, fallback behind the image
  },
  borderColor: {
    type: String, // CSS color
  },
  borderWidth: {
    type: Number,
    default: 1,
    min: 0,
  },
  borderRadius: {
    type: Number,
    default: 16,
    min: 0,
  },
  padding: {
    type: Number,
    default: 0,
    min: 0,
  },
  marginTop: {
    type: Number,
    default: 0,
    min: 0,
  },
  marginBottom: {
    type: Number,
    default: 0,
    min: 0,
  },
  overlayColor: {
    type: String, // CSS color for the overlay
  },
  overlayOpacity: {
    type: Number,
    default: 30,
    min: 0,
    max: 100,
  },
  bannerOrder: {
    type: Number,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
});

// Indexes
PromotionBannerSchema.index({ isActive: 1 });
PromotionBannerSchema.index({ bannerOrder: 1 });

export const PromotionBannerModel = mongoose.model<IPromotionBannerDoc>('PromotionBanner', PromotionBannerSchema);

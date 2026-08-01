import mongoose, { Schema, Document } from 'mongoose';
import { HeroBlock, HeroBlockStatus, HeroAnimationStyle, HeroContentAlignment, HeroLinkType } from 'shared/types';

export interface IHeroBlockDoc extends Omit<HeroBlock, '_id'>, Document {}

const HeroButtonSchema = new Schema(
  {
    label: { type: String, trim: true },
    linkType: { type: String, enum: ['collection', 'category', 'product', 'custom'], default: 'custom' as HeroLinkType },
    link: { type: String, trim: true },
  },
  { _id: false }
);

const HeroVisibilitySchema = new Schema(
  {
    desktop: { type: Boolean, default: true },
    tablet: { type: Boolean, default: true },
    mobile: { type: Boolean, default: true },
  },
  { _id: false }
);

const HeroBlockSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subtitle: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      trim: true,
    },
    video: {
      type: String,
      trim: true,
    },
    badge: {
      type: String,
      trim: true,
    },
    primaryButton: { type: HeroButtonSchema, default: {} },
    secondaryButton: { type: HeroButtonSchema, default: {} },
    overlay: {
      type: Boolean,
      default: true,
    },
    overlayOpacity: {
      type: Number,
      default: 45,
      min: 0,
      max: 100,
    },
    gradient: {
      type: Boolean,
      default: true,
    },
    contentAlignment: {
      type: String,
      enum: ['left', 'center', 'right'],
      default: 'left' as HeroContentAlignment,
    },
    textColor: {
      type: String,
      trim: true,
    },
    buttonColor: {
      type: String,
      trim: true,
    },
    accentColor: {
      type: String,
      trim: true,
    },
    animationStyle: {
      type: String,
      enum: ['slide', 'fade', 'kenburns'],
      default: 'kenburns' as HeroAnimationStyle,
    },
    animationSpeed: {
      type: Number,
      default: 1,
      min: 0.3,
      max: 4,
    },
    visibility: { type: HeroVisibilitySchema, default: { desktop: true, tablet: true, mobile: true } },
    priority: {
      type: Number,
      default: 0,
    },
    seoLabel: {
      type: String,
      trim: true,
    },
    altText: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft' as HeroBlockStatus,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    scheduledStart: {
      type: Date,
    },
    scheduledEnd: {
      type: Date,
    },
  },
  { timestamps: true }
);

HeroBlockSchema.index({ status: 1, isActive: 1 });
HeroBlockSchema.index({ priority: 1 });

export const HeroBlockModel = mongoose.model<IHeroBlockDoc>('HeroBlock', HeroBlockSchema);

import mongoose, { Schema, Document } from 'mongoose';
import { HeroBlock, HeroBlockStatus, HeroLinkType, HeroSlideAnimationType } from 'shared/types';

export interface IHeroBlockDoc extends Omit<HeroBlock, '_id'>, Document {}

const HeroButtonSchema = new Schema(
  {
    label: { type: String, trim: true },
    linkType: { type: String, enum: ['collection', 'category', 'product', 'custom'], default: 'custom' as HeroLinkType },
    link: { type: String, trim: true },
  },
  { _id: false }
);

const HeroSlideSchema = new Schema(
  {
    image: { type: String, trim: true },
    imageMobile: { type: String, trim: true },
    video: { type: String, trim: true },
    videoMobile: { type: String, trim: true },
    eyebrow: { type: String, trim: true },
    heading: { type: String, trim: true },
    headingColor: { type: String, trim: true, default: '#FFFFFF' },
    showEyebrow: { type: Boolean, default: false },
    showCta: { type: Boolean, default: false },
    ctaText: { type: String, trim: true },
    ctaLinkType: { type: String, enum: ['collection', 'category', 'product', 'custom'], default: 'custom' as HeroLinkType },
    ctaLink: { type: String, trim: true },
    description: { type: String, trim: true },
    secondaryButtonText: { type: String, trim: true },
    secondaryButtonLink: { type: String, trim: true },
    backgroundColor: { type: String, trim: true },
    animationType: {
      type: String,
      enum: ['fade', 'zoom', 'slide'],
      default: 'zoom' as HeroSlideAnimationType,
    },
    overlay: { type: Boolean, default: false },
    overlayOpacity: { type: Number, default: 45, min: 0, max: 100 },
    gradient: { type: Boolean, default: false },
    textAlign: {
      type: String,
      enum: ['left', 'center', 'right'],
      default: 'left' as const,
    },
    buttonColor: { type: String, trim: true },
    animationSpeed: { type: Number, min: 0.3, max: 5 },
    priority: { type: Number, default: 0 },
    visibility: {
      desktop: { type: Boolean, default: true },
      tablet: { type: Boolean, default: true },
      mobile: { type: Boolean, default: true },
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
    altText: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const HeroPanelSchema = new Schema(
  {
    label: { type: String, trim: true },
    slides: { type: [HeroSlideSchema], default: [] },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft' as HeroBlockStatus,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const HeroBlockSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slides: {
      type: [HeroSlideSchema],
      default: [],
      validate: {
        validator: (slides: unknown[]) => slides.length <= 100,
        message: 'A hero set can contain at most 100 blocks',
      },
    },
    panels: {
      type: [HeroPanelSchema],
      default: [],
      validate: {
        validator: (panels: unknown[]) => panels.length <= 5,
        message: 'Legacy panels structure: at most 5 panels',
      },
    },
    overlay: {
      type: Boolean,
      default: false,
    },
    overlayOpacity: {
      type: Number,
      default: 45,
      min: 0,
      max: 100,
    },
    gradient: {
      type: Boolean,
      default: false,
    },
    animationSpeed: {
      type: Number,
      default: 4.5,
      min: 0.3,
      max: 5,
    },
    priority: {
      type: Number,
      default: 0,
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
    /* Legacy flat fields — kept optional for one-time migration into panels */
    title: {
      type: String,
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
    imageMobile: {
      type: String,
      trim: true,
    },
    videoMobile: {
      type: String,
      trim: true,
    },
    badge: {
      type: String,
      trim: true,
    },
    primaryButton: { type: HeroButtonSchema, default: {} },
    secondaryButton: { type: HeroButtonSchema, default: {} },
    contentAlignment: {
      type: String,
      enum: ['left', 'center', 'right'],
      default: 'left',
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
      default: 'kenburns',
    },
    visibility: {
      desktop: { type: Boolean, default: true },
      tablet: { type: Boolean, default: true },
      mobile: { type: Boolean, default: true },
    },
    seoLabel: {
      type: String,
      trim: true,
    },
    altText: {
      type: String,
      trim: true,
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

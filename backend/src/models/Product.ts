// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';
import { IProduct } from '../../shared/types';

export interface IProductDoc extends Omit<IProduct, '_id'>, Document {}

const ProductSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  shortDescription: {
    type: String,
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  collection: {
    type: Schema.Types.ObjectId,
    ref: 'Collection',
  },
  // Merchandising collection slugs (summer-collection, winter-collection, ...).
  // A product may belong to any number of collections.
  // NOTE: marketing slugs (new-arrival, sale, trending, ...) must never appear
  // here — marketing sections are driven by the independent is* flag fields.
  collections: [{
    type: String,
    lowercase: true,
    trim: true,
  }],
  brand: {
    type: String,
    trim: true,
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  compareAtPrice: {
    type: Number,
    min: 0,
  },
  costPrice: {
    type: Number,
    min: 0,
  },
  taxCode: {
    type: String,
  },
  weight: {
    type: Number, // in grams
    min: 0,
  },
  dimensions: {
    length: { type: Number, min: 0 }, // in cm
    width: { type: Number, min: 0 },  // in cm
    height: { type: Number, min: 0 }, // in cm
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  trackQuantity: {
    type: Boolean,
    default: true,
  },
  allowBackorder: {
    type: Boolean,
    default: false,
  },
  lowStockThreshold: {
    type: Number,
    min: 0,
    default: 5,
  },
  images: [{
    url: {
      type: String,
      required: true,
    },
    alt: {
      type: String,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  }],
  videos: [{
    url: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
    },
  }],
  models: [{
    url: {
      type: String,
      required: true,
    },
    format: {
      type: String,
      enum: ['gltf', 'glb', 'obj', 'fbx'],
    },
  }],
  variants: [{
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    options: {
      type: Map,
      of: String,
    },
    priceAdjustment: {
      type: Number,
      default: 0,
    },
    sku: {
      type: String,
      required: true,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
    },
    image: {
      type: String,
    },
  }],
  options: [{
    name: {
      type: String,
      required: true,
    },
    values: {
      type: [String],
      required: true,
    },
  }],
  tags: [{
    type: String,
    trim: true,
  }],
  categoryPath: [{
    type: String,
  }],
  featured: {
    type: Boolean,
    default: false,
  },
  featuredUntil: {
    type: Date,
  },
  // Independent marketing flags (Shopify-style). One product may belong to
  // any number of these lists at once — none are mutually exclusive.
  isNewArrival: {
    type: Boolean,
    default: false,
  },
  isBestSeller: {
    type: Boolean,
    default: false,
  },
  isTrending: {
    type: Boolean,
    default: false,
  },
  isOnSale: {
    type: Boolean,
    default: false,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  isRecommended: {
    type: Boolean,
    default: false,
  },
  isExclusive: {
    type: Boolean,
    default: false,
  },
  isLimitedEdition: {
    type: Boolean,
    default: false,
  },
  isEditorsPick: {
    type: Boolean,
    default: false,
  },
  isPremiumCollection: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    default: 'active',
  },
  seo: {
    title: {
      type: String,
    },
    description: {
      type: String,
    },
    keywords: {
      type: [String],
    },
  },
  rating: {
    average: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    count: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
}, {
  timestamps: true,
});

// Indexes
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ category: 1 });
ProductSchema.index({ collection: 1 });
ProductSchema.index({ collections: 1 });
ProductSchema.index({ brand: 1 });
ProductSchema.index({ status: 1 });
ProductSchema.index({ featured: 1 });
ProductSchema.index({ isNewArrival: 1 });
ProductSchema.index({ isBestSeller: 1 });
ProductSchema.index({ isTrending: 1 });
ProductSchema.index({ isOnSale: 1 });
ProductSchema.index({ isFeatured: 1 });
ProductSchema.index({ isRecommended: 1 });
ProductSchema.index({ isExclusive: 1 });
ProductSchema.index({ isLimitedEdition: 1 });
ProductSchema.index({ isEditorsPick: 1 });
ProductSchema.index({ isPremiumCollection: 1 });
ProductSchema.index({ 'rating.average': -1 });

// Pre-save hook to generate slug if not provided
ProductSchema.pre('save', function(next) {
  if (!this.isModified('name')) return next();
  
  if (!this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
  
  next();
});

// Virtual for virtual stock (stock + incoming - reserved)
ProductSchema.virtual('virtualStock').get(function() {
  // This would typically come from inventory service
  return this.stock;
});

export const ProductModel = mongoose.model<IProductDoc>('Product', ProductSchema);




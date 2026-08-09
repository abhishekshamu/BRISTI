// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';
import { ICollection } from '../../shared/types';

export interface ICollectionDoc extends Omit<ICollection, '_id'>, Document {}

const CollectionSchema: Schema = new Schema({
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
  },
  shortDescription: {
    type: String,
  },
  image: {
    type: String, // URL to image
  },
  bannerImage: {
    type: String, // URL to desktop banner image
  },
  bannerTablet: {
    type: String, // URL to tablet banner image
  },
  mobileBanner: {
    type: String, // URL to mobile banner image
  },
  icon: {
    type: String, // URL or icon identifier
  },
  video: {
    type: String, // URL to video
  },
  showOnHomepage: {
    type: Boolean,
    default: true,
  },
  showInNavigation: {
    type: Boolean,
    default: false,
  },
  themeColor: {
    type: String,
  },
  buttonColor: {
    type: String,
  },
  buttonText: {
    type: String,
  },
  products: [{
    type: Schema.Types.ObjectId,
    ref: 'Product',
  }],
  featured: {
    type: Boolean,
    default: false,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
  featuredUntil: {
    type: Date,
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  seo: {
    title: {
      type: String,
    },
    description: {
      type: String,
    },
    image: {
      type: String,
    },
  },
}, {
  timestamps: true,
});

// Indexes
CollectionSchema.index({ name: 1 });
CollectionSchema.index({ featured: 1 });
CollectionSchema.index({ sortOrder: 1 });
CollectionSchema.index({ isActive: 1 });
CollectionSchema.index({ showOnHomepage: 1 });
CollectionSchema.index({ showInNavigation: 1 });
CollectionSchema.index({ startDate: 1 });
CollectionSchema.index({ endDate: 1 });

// Virtual for getting products count
CollectionSchema.virtual('productCount').get(function() {
  return this.products ? this.products.length : 0;
});

// Pre-save hook to generate slug
CollectionSchema.pre('save', function(next) {
  if (!this.isModified('name')) return next();
  
  if (!this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
  
  next();
});

export const CollectionModel = mongoose.model<ICollectionDoc>('Collection', CollectionSchema);




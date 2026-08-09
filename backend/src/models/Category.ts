// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';
import { ICategory } from '../../shared/types';

export interface ICategoryDoc extends Omit<ICategory, '_id'>, Document {}

const CategorySchema: Schema = new Schema({
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
  subtitle: {
    type: String,
  },
  image: {
    type: String, // URL to image
  },
  bannerImage: {
    type: String, // URL to banner image
  },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
  },
  level: {
    type: Number,
    default: 0,
    min: 0,
  },
  sortOrder: {
    type: Number,
    default: 0,
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  productCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  seo: {
    title: {
      type: String,
    },
    description: {
      type: String,
    },
  },
}, {
  timestamps: true,
});

// Indexes
CategorySchema.index({ slug: 1 });
CategorySchema.index({ parentId: 1 });
CategorySchema.index({ level: 1 });
CategorySchema.index({ isActive: 1 });
CategorySchema.index({ sortOrder: 1 });

// Virtual for getting children
CategorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentId',
});

// Virtual for getting parent
CategorySchema.virtual('parent', {
  ref: 'Category',
  localField: 'parentId',
  foreignField: '_id',
  justOne: true,
});

// Pre-save hook to generate slug
CategorySchema.pre('save', function(next) {
  if (!this.isModified('name')) return next();
  
  if (!this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
  
  next();
});

// Auto-set level based on parent
CategorySchema.pre('save', function(next) {
  if (this.parentId) {
    // In a real app, we'd look up the parent to get its level
    // For simplicity, we'll set it to parent level + 1
    // This would need to be handled in a pre-populate middleware or service
    this.level = 1; // Simplified
  } else {
    this.level = 0;
  }
  
  next();
});

export const CategoryModel = mongoose.model<ICategoryDoc>('Category', CategorySchema);




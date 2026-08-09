// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';
import { IPage } from '../../shared/types';

export interface IPageDoc extends Omit<IPage, '_id'>, Document {}

const PageSchema: Schema = new Schema({
  title: {
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
  content: {
    type: Schema.Types.Mixed, // Can be HTML string or JSON for dynamic content
    required: true,
  },
  excerpt: {
    type: String,
  },
  featuredImage: {
    type: String, // URL to image
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
  },
  isInMenu: {
    type: Boolean,
    default: false,
  },
  menuOrder: {
    type: Number,
    default: 0,
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
  layout: {
    type: Schema.Types.ObjectId,
    ref: 'Layout',
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  builderSections: [{
    type: Schema.Types.Mixed,
  }],
}, {
  timestamps: true,
});

// Indexes
PageSchema.index({ slug: 1 });
PageSchema.index({ status: 1 });
PageSchema.index({ isInMenu: 1 });
PageSchema.index({ createdBy: 1 });
PageSchema.index({ updatedAt: -1 });

// Virtual for reading time
PageSchema.virtual('readingTime').get(function() {
  // Assuming content is HTML, we'll strip tags for estimation
  const textContent = typeof this.content === 'string' 
    ? this.content.replace(/<[^>]*>/g, ' ') 
    : JSON.stringify(this.content);
  
  const wordsPerMinute = 200;
  const words = textContent.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
});

// Pre-save hook to generate slug
PageSchema.pre('save', function(next) {
  if (!this.isModified('title')) return next();
  
  if (!this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
  
  next();
});

export const PageModel = mongoose.model<IPageDoc>('Page', PageSchema);




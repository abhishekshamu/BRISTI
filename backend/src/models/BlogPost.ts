// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';
import { IBlogPost } from '../../shared/types';

export interface IBlogPostDoc extends Omit<IBlogPost, '_id'>, Document {}

const BlogPostSchema: Schema = new Schema({
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
    default: function (this: { title: string }) {
      return this.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    },
  },
  excerpt: {
    type: String,
  },
  content: {
    type: String,
    required: true,
  },
  featuredImage: {
    type: String, // URL to image
  },
  gallery: [{
    type: String, // URL to image
  }],
  author: {
    type: String,
    required: true,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  category: {
    type: String,
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
  },
  featured: {
    type: Boolean,
    default: false,
  },
  publishedAt: {
    type: Date,
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
}, {
  timestamps: true,
});

// Indexes
BlogPostSchema.index({ slug: 1 });
BlogPostSchema.index({ title: 'text', content: 'text' });
BlogPostSchema.index({ status: 1 });
BlogPostSchema.index({ featured: 1 });
BlogPostSchema.index({ publishedAt: -1 });
BlogPostSchema.index({ tags: 1 });
BlogPostSchema.index({ category: 1 });

// Pre-save hook to generate slug if not provided
BlogPostSchema.pre('save', function(next) {
  if (!this.isModified('title')) return next();
  
  if (!this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
  
  next();
});

// Pre-save hook to set publishedAt when status changes to published
BlogPostSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  next();
});

export const BlogPostModel = mongoose.model<IBlogPostDoc>('BlogPost', BlogPostSchema);




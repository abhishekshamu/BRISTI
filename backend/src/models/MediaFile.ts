// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';
import { IMediaFile } from 'shared/types';

export interface IMediaFileDoc extends Omit<IMediaFile, '_id'>, Document {}

const MediaFileSchema: Schema = new Schema({
  filename: {
    type: String,
    required: true,
    trim: true,
  },
  originalName: {
    type: String,
    required: true,
    trim: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
    min: 0,
  },
  url: {
    type: String,
    required: true,
  },
  thumbnailUrl: {
    type: String,
  },
  width: {
    type: Number,
    min: 0,
  },
height: {
    type: Number,
    min: 0,
  },
  ratio: {
    type: String,
  }, // Auto-detected aspect ratio (e.g. '3:4') — never changed by the system, informational only
  duration: {
    type: Number,
    min: 0,
  }, // For video/audio files
  altText: {
    type: String,
    trim: true,
  },
  title: {
    type: String,
    trim: true,
  },
  caption: {
    type: String,
    trim: true,
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  folder: {
    type: String,
    default: '/',
    trim: true,
  },
  checksum: {
    type: String,
  },
  favorite: {
    type: Boolean,
    default: false,
  },
  variants: {
    type: Schema.Types.Mixed,
    default: {},
  },
  derived: [{
    url: { type: String },
    width: { type: Number },
    height: { type: Number },
    ratio: { type: String },
    source: { type: String, enum: ['auto', 'manual'] },
    createdAt: { type: Date, default: Date.now },
  }],
  versions: [{
    url: { type: String },
    thumbnailUrl: { type: String },
    width: { type: Number },
    height: { type: Number },
    size: { type: Number },
    mimeType: { type: String },
    note: { type: String },
    createdAt: { type: Date, default: Date.now },
  }],
  optimization: {
    type: Schema.Types.Mixed,
    default: {},
  },
  lastUsedAt: {
    type: Date,
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  }, // For storing EXIF data, video codec info, etc.
}, {
  timestamps: true,
});

// Indexes
MediaFileSchema.index({ filename: 1 });
MediaFileSchema.index({ originalName: 1 });
MediaFileSchema.index({ mimeType: 1 });
MediaFileSchema.index({ folder: 1 });
MediaFileSchema.index({ uploadedBy: 1 });
MediaFileSchema.index({ createdAt: -1 });
MediaFileSchema.index({ tags: 1 });
MediaFileSchema.index({ isPublic: 1 });
MediaFileSchema.index({ checksum: 1 });
MediaFileSchema.index({ favorite: 1 });
MediaFileSchema.index({ lastUsedAt: -1 });

// Virtual for file extension
MediaFileSchema.virtual('extension').get(function() {
  return this.originalName.split('.').pop()?.toLowerCase() || '';
});

// Virtual for human-readable file size
MediaFileSchema.virtual('sizeFormatted').get(function() {
  if (this.size === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(this.size) / Math.log(k));
  
  return parseFloat((this.size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Pre-save hook to normalize tags
MediaFileSchema.pre('save', function(next) {
  if (this.tags && this.tags.length > 0) {
    this.tags = this.tags
      .map(tag => tag.trim().toLowerCase())
      .filter((tag, index, arr) => tag && arr.indexOf(tag) === index); // Remove duplicates and empty
  }
  
  next();
});

// Method to get file URL with transformation parameters
MediaFileSchema.methods.getUrl = function(_transformations?: Record<string, any>): string {
  // In a real implementation, this would integrate with Cloudinary or similar
  // For now, just return the base URL
  return this.url;
};

export const MediaFileModel = mongoose.model<IMediaFileDoc>('MediaFile', MediaFileSchema);




// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';
import { ILayout } from '../../shared/types';

export interface ILayoutDoc extends Omit<ILayout, '_id'>, Document {}

const LayoutSchema: Schema = new Schema({
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
  thumbnail: {
    type: String, // URL to thumbnail image
  },
  sections: [{
    id: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    props: {
      type: Schema.Types.Mixed, // JSON object for section props
      default: {},
    },
  }],
  isActive: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes
LayoutSchema.index({ slug: 1 });
LayoutSchema.index({ name: 1 });
LayoutSchema.index({ isActive: 1 });

// Pre-save hook to generate slug if not provided
LayoutSchema.pre('save', function(next) {
  if (!this.isModified('name')) return next();
  
  if (!this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
  
  next();
});

// Ensure only one active layout
LayoutSchema.pre('save', async function(next) {
  if (this.isActive) {
    // Deactivate all other layouts
    await this.constructor.updateMany(
      { _id: { $ne: this._id }, isActive: true },
      { $set: { isActive: false } }
    );
  }
  
  next();
});

LayoutSchema.post('save', function() {
  // If this is the first layout being created and it's not active, make it active
  if (!this.isActive) {
    this.constructor.countDocuments().then(count => {
      if (count === 1) {
        this.isActive = true;
        this.save();
      }
    });
  }
});

export const LayoutModel = mongoose.model<ILayoutDoc>('Layout', LayoutSchema);




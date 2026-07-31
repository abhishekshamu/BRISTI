// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';
import { IThemeSettings } from 'shared/types';

export interface IThemeDoc extends Omit<IThemeSettings, '_id'>, Document {}

const ThemeSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  colors: {
    primary: {
      type: String,
      required: true,
    },
    secondary: {
      type: String,
      required: true,
    },
    background: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    accent: {
      type: String,
      required: true,
    },
    gold: {
      type: String,
      default: '#C9A227',
    },
    darkGray: {
      type: String,
      default: '#1A1A1A',
    },
    lightGray: {
      type: String,
      default: '#F5F5F5',
    },
  },
  typography: {
    headingFont: {
      type: String,
      required: true,
    },
    bodyFont: {
      type: String,
      required: true,
    },
    baseSize: {
      type: String,
      required: true,
    },
    scale: {
      type: Number,
      default: 1.25,
    },
  },
  borderRadius: {
    type: String,
    default: '8px',
  },
  boxShadow: {
    type: String,
    default: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  },
  transition: {
    type: String,
    default: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
}, {
  timestamps: true,
});

// Indexes
ThemeSchema.index({ name: 1 });
ThemeSchema.index({ isActive: 1 });

// Ensure only one active theme
ThemeSchema.pre('save', async function(next) {
  if (this.isActive) {
    // Deactivate all other themes
    await this.constructor.updateMany(
      { _id: { $ne: this._id }, isActive: true },
      { $set: { isActive: false } }
    );
  }
  
  next();
});

ThemeSchema.post('save', function() {
  // If this is the first theme being created and it's not active, make it active
  if (!this.isActive) {
    this.constructor.countDocuments().then(count => {
      if (count === 1) {
        this.isActive = true;
        this.save();
      }
    });
  }
});

export const ThemeModel = mongoose.model<IThemeDoc>('Theme', ThemeSchema);




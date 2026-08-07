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
  description: {
    type: String,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  isDark: {
    type: Boolean,
    default: false,
  },
  colors: {
    type: Schema.Types.Mixed,
    default: {},
  },
  typography: {
    type: Schema.Types.Mixed,
    default: {},
  },
  buttons: {
    type: Schema.Types.Mixed,
    default: {},
  },
  header: {
    type: Schema.Types.Mixed,
    default: {},
  },
  footer: {
    type: Schema.Types.Mixed,
    default: {},
  },
  effects: {
    type: Schema.Types.Mixed,
    default: {},
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

// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';
import { INewsletterSubscriber } from 'shared/types';

export interface INewsletterSubscriberDoc extends Omit<INewsletterSubscriber, '_id'>, Document {}

const NewsletterSubscriberSchema: Schema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  firstName: {
    type: String,
    trim: true,
  },
  lastName: {
    type: String,
    trim: true,
  },
  source: {
    type: String,
    enum: ['homepage', 'footer', 'popup', 'checkout', 'account_signup', 'social_media', 'blog', 'other'],
    default: 'homepage',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  subscribedAt: {
    type: Date,
    default: Date.now,
  },
  unsubscribedAt: {
    type: Date,
  },
  preferences: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly',
    },
    topics: [{
      type: String,
      enum: ['new_arrivals', 'sales', 'blog', 'events', 'collaborations'],
    }],
  },
  doubleOptIn: {
    type: Boolean,
    default: false,
  },
  confirmationToken: {
    type: String,
  },
  confirmationExpires: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes
NewsletterSubscriberSchema.index({ email: 1 });
NewsletterSubscriberSchema.index({ isActive: 1 });
NewsletterSubscriberSchema.index({ subscribedAt: -1 });
NewsletterSubscriberSchema.index({ source: 1 });
NewsletterSubscriberSchema.index({ 'preferences.topics': 1 });

// Virtual for full name
NewsletterSubscriberSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`.trim() || this.email.split('@')[0];
});

// Pre-save hook to handle double opt-in
NewsletterSubscriberSchema.pre('save', function(next) {
  if (this.isNew && this.doubleOptIn) {
    // Generate confirmation token
    this.confirmationToken = Math.random().toString(36).substring(2, 15) + 
                            Math.random().toString(36).substring(2, 15);
    this.confirmationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  }
  
  next();
});

// Method to check if subscription is confirmed
NewsletterSubscriberSchema.methods.isConfirmed = function(): boolean {
  return !this.doubleOptIn || (this.confirmationToken && !this.confirmationExpires || this.confirmationExpires > new Date());
};

// Static method to find by email (case insensitive)
NewsletterSubscriberSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: new RegExp(`^${email}$`, 'i') });
};

export const NewsletterSubscriberModel = mongoose.model<INewsletterSubscriberDoc>('NewsletterSubscriber', NewsletterSubscriberSchema);




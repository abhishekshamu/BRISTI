// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';
import { INotification } from '../../shared/types';

export interface INotificationDoc extends Omit<INotification, '_id'>, Document {}

const NotificationSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error'],
    default: 'info',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
  },
  relatedId: {
    type: Schema.Types.ObjectId,
    refPath: 'relatedType',
  },
  relatedType: {
    type: String,
    enum: ['Order', 'Product', 'User', 'Review', 'BlogPost', 'Message'],
  },
  // For notifications that don't relate to a specific model
  relatedRef: {
    type: Schema.Types.ObjectId,
    refPath: 'relatedRefType',
  },
  relatedRefType: {
    type: String,
    enum: ['Order', 'Product', 'User', 'Review', 'BlogPost', 'Message'],
  },
  actionUrl: {
    type: String,
  },
  actionText: {
    type: String,
  },
  expiresAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes
NotificationSchema.index({ userId: 1 });
NotificationSchema.index({ isRead: 1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 });
NotificationSchema.index({ relatedId: 1, relatedType: 1 });

// Pre-save hook to set expiration date (30 days from creation)
NotificationSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days
    this.expiresAt = expiryDate;
  }
  
  next();
});

// Static method to mark notifications as read
NotificationSchema.statics.markAsRead = async function(userId: string, notificationIds: string[]) {
  return this.updateMany(
    { _id: { $in: notificationIds }, userId },
    { $set: { isRead: true, readAt: new Date() } }
  );
};

// Static method to delete expired notifications
NotificationSchema.statics.deleteExpired = async function() {
  return this.deleteMany({ expiresAt: { $lt: new Date() } });
};

export const NotificationModel = mongoose.model<INotificationDoc>('Notification', NotificationSchema);




// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';
import { LoginHistoryEntry } from '../../shared/types';

export interface ILoginHistoryDoc extends Omit<LoginHistoryEntry, '_id'>, Document {}

const LoginHistorySchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  method: {
    type: String,
    enum: ['email', 'google', 'phone', 'refresh'],
    required: true,
  },
  success: {
    type: Boolean,
    required: true,
  },
  ip: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  identifier: {
    type: String,
  },
  failedReason: {
    type: String,
  },
}, {
  timestamps: true,
});

// Indexes for admin login-history queries.
LoginHistorySchema.index({ success: 1, createdAt: -1 });
LoginHistorySchema.index({ method: 1 });
LoginHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const LoginHistoryModel = mongoose.model<ILoginHistoryDoc>('LoginHistory', LoginHistorySchema);

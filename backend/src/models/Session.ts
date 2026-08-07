// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';
import { UserSession } from 'shared/types';

export interface IUserSessionDoc extends Omit<UserSession, '_id'>, Document {}

const SessionSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true,
  },
  device: {
    type: String,
  },
  ip: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  lastActiveAt: {
    type: Date,
    default: Date.now,
  },
  revokedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

SessionSchema.index({ userId: 1, revokedAt: 1 });
// Stale sessions are pruned 90 days after their last activity.
SessionSchema.index({ lastActiveAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const SessionModel = mongoose.model<IUserSessionDoc>('Session', SessionSchema);

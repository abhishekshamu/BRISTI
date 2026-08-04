// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';
import { IAnalyticsEvent } from 'shared/types';

export interface IAnalyticsEventDoc extends Omit<IAnalyticsEvent, '_id'>, Document {}

const AnalyticsEventSchema: Schema = new Schema({
  eventName: {
    type: String,
    required: true,
    trim: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  sessionId: {
    type: String,
    required: true,
  },
  properties: {
    type: Schema.Types.Mixed, // Flexible storage for event properties
    default: {},
  },
  url: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
    required: true,
  },
  ipAddress: {
    type: String,
  },
  referrer: {
    type: String,
  },
  country: {
    type: String,
  },
  city: {
    type: String,
  },
  deviceType: {
    type: String,
    enum: ['desktop', 'tablet', 'mobile'],
  },
  browser: {
    type: String,
  },
  os: {
    type: String,
  },
  screenResolution: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes
AnalyticsEventSchema.index({ eventName: 1 });
AnalyticsEventSchema.index({ userId: 1 });
AnalyticsEventSchema.index({ sessionId: 1 });
AnalyticsEventSchema.index({ createdAt: -1 });
AnalyticsEventSchema.index({ timestamp: -1 });
AnalyticsEventSchema.index({ url: 1 });
AnalyticsEventSchema.index({ eventName: 1, createdAt: -1 }); // For time-series queries
AnalyticsEventSchema.index({ ipAddress: 1 });
AnalyticsEventSchema.index({ country: 1 });

// Index for TTL to automatically delete old analytics data (optional)
// AnalyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // 90 days

export const AnalyticsEventModel = mongoose.model<IAnalyticsEventDoc>('AnalyticsEvent', AnalyticsEventSchema);




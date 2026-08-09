// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';
import { OtpCode } from '../../shared/types';

export interface IOtpCodeDoc extends Omit<OtpCode, '_id'>, Document {}

const OtpCodeSchema: Schema = new Schema({
  phone: {
    type: String,
    required: true,
    index: true,
  },
  otpHash: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ['login', 'phone_verification'],
    default: 'login',
  },
  attempts: {
    type: Number,
    default: 0,
  },
  lastSentAt: {
    type: Date,
    required: true,
  },
  consumedAt: {
    type: Date,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true,
});

// One active code per phone + purpose (verify/send rotates the record).
OtpCodeSchema.index({ phone: 1, purpose: 1 }, { unique: true });

// Auto-expire codes after their 5-minute lifetime.
OtpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpCodeModel = mongoose.model<IOtpCodeDoc>('OtpCode', OtpCodeSchema);

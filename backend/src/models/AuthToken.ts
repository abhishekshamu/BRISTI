// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';

export interface IAuthToken {
  userId: string;
  ownerType: 'user' | 'admin';
  tokenHash: string;
  type: 'access' | 'refresh';
  expiresAt: Date;
  createdAt: Date;
}

export interface IAuthTokenDoc extends Omit<IAuthToken, '_id'>, Document {}

const AuthTokenSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  ownerType: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  tokenHash: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['access', 'refresh'],
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes
AuthTokenSchema.index({ userId: 1, ownerType: 1 });
AuthTokenSchema.index({ tokenHash: 1 }, { unique: true });

// TTL index to auto-delete expired tokens (single expiresAt index: no plain
// duplicate, otherwise MongoDB rejects the TTL options)
AuthTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static methods
AuthTokenSchema.statics.findValidToken = function(tokenHash: string) {
  return this.findOne({
    tokenHash,
    expiresAt: { $gt: new Date() }
  });
};

AuthTokenSchema.statics.deleteUserTokens = function(userId: string) {
  return this.deleteMany({ userId });
};

export const AuthTokenModel = mongoose.model<IAuthTokenDoc>('AuthToken', AuthTokenSchema);



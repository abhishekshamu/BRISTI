// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';

export interface IAuthToken {
  userId: string;
  tokenHash: string;
  type: 'access' | 'refresh';
  expiresAt: Date;
  createdAt: Date;
}

export interface IAuthTokenDoc extends Omit<IAuthToken, '_id'>, Document {}

const AuthTokenSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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
AuthTokenSchema.index({ userId: 1 });
AuthTokenSchema.index({ tokenHash: 1 }, { unique: true });
AuthTokenSchema.index({ expiresAt: 1 });

// TTL index to auto-delete expired tokens
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



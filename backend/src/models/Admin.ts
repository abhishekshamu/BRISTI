// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IAdmin } from '../../shared/types';

export interface IAdminDoc extends Omit<IAdmin, '_id'>, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const AdminSchema: Schema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
password: {
    type: String,
    required: true,
    select: false,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'moderator', 'content_editor', 'support'],
    required: true,
  },
  permissions: [{
    type: String,
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLoginAt: {
    type: Date,
  },
  failedLoginAttempts: {
    type: Number,
    default: 0,
  },
  lockedUntil: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes
AdminSchema.index({ role: 1 });
AdminSchema.index({ isActive: 1 });

// Pre-save hook to hash password
AdminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare password
AdminSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if account is locked
AdminSchema.methods.isLocked = function(): boolean {
  return this.lockedUntil && this.lockedUntil > new Date();
};

// Method to increment failed login attempts
AdminSchema.methods.incrementFailedAttempts = async function() {
  this.failedLoginAttempts = (this.failedLoginAttempts || 0) + 1;
  if (this.failedLoginAttempts >= 5) {
    this.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
  }
  await this.save();
  return this.lockedUntil ? true : false;
};

// Method to reset failed login attempts
AdminSchema.methods.resetFailedLoginAttempts = async function(): Promise<void> {
  this.failedLoginAttempts = 0;
  this.lockedUntil = undefined;
  await this.save();
};

// Method to get full name
AdminSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

export const AdminModel = mongoose.model<IAdminDoc>('Admin', AdminSchema);




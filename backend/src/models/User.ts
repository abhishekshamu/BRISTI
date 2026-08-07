// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from 'shared/types';

export interface IUserDoc extends Omit<IUser, '_id'>, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema({
  email: {
    type: String,
    required: false,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: false,
    select: false,
  },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  emailVerificationToken: { type: String, select: false },
  emailVerificationExpires: { type: Date, select: false },
  lastLoginAt: { type: Date },
  loginCount: { type: Number, default: 0 },
  firstName: {
    type: String,
    required: false,
    default: 'BRISTI',
    trim: true,
  },
  lastName: {
    type: String,
    required: false,
    default: 'Member',
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  phoneVerified: {
    type: Boolean,
    default: false,
  },
  authProvider: {
    type: String,
    enum: ['email', 'google', 'phone'],
    default: 'email',
  },
  googleId: {
    type: String,
  },
  avatar: {
    type: String,
  },
  failedLoginAttempts: {
    type: Number,
    default: 0,
  },
  lockedUntil: {
    type: Date,
  },
  rewardPoints: {
    type: Number,
    default: 0,
  },
  role: {
    type: String,
    enum: ['customer', 'admin', 'moderator'],
    default: 'customer',
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'deleted'],
    default: 'active',
  },
  addresses: [{
    id: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['billing', 'shipping', 'both'],
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    company: {
      type: String,
    },
    addressLine1: {
      type: String,
      required: true,
    },
    addressLine2: {
      type: String,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    postalCode: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    isDefault: {
      type: Boolean,
    },
  }],
  preferences: {
    newsletter: {
      type: Boolean,
      default: true,
    },
    marketing: {
      type: Boolean,
      default: true,
    },
    orderUpdates: {
      type: Boolean,
      default: true,
    },
  },
  wishlist: [{
    type: Schema.Types.ObjectId,
    ref: 'Product',
  }],
}, {
  timestamps: true,
});

// Indexes
UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ phone: 1 }, { unique: true, sparse: true });
UserSchema.index({ googleId: 1 }, { unique: true, sparse: true });
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ emailVerified: 1 });
UserSchema.index({ authProvider: 1 });
UserSchema.index({ passwordResetToken: 1 }, { sparse: true });
UserSchema.index({ emailVerificationToken: 1 }, { sparse: true });

// Pre-save hook to hash password
UserSchema.pre('save', async function(next) {
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
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get full name
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

// Method to get default address
UserSchema.methods.getDefaultAddress = function() {
  return this.addresses.find(addr => addr.isDefault) || this.addresses[0];
};

// Virtual for address count
UserSchema.virtual('addressCount').get(function() {
  return this.addresses.length;
});

// Virtual for wishlist count
UserSchema.virtual('wishlistCount').get(function() {
  return this.wishlist.length;
});

export const UserModel = mongoose.model<IUserDoc>('User', UserSchema);




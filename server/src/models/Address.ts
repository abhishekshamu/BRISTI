// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';

export interface IAddressDoc extends Document {
  userId: Schema.Types.ObjectId;
  type: 'billing' | 'shipping' | 'both';
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
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
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  company: {
    type: String,
    trim: true,
  },
  addressLine1: {
    type: String,
    required: true,
    trim: true,
  },
  addressLine2: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: String,
    required: true,
    trim: true,
  },
  postalCode: {
    type: String,
    required: true,
    trim: true,
  },
  country: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes
AddressSchema.index({ userId: 1 });
AddressSchema.index({ userId: 1, isDefault: 1 });

// Virtual for full name
AddressSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

// Virtual for formatted address
AddressSchema.virtual('formattedAddress').get(function() {
  const lines = [
    this.addressLine1,
    this.addressLine2,
    `${this.city}, ${this.state} ${this.postalCode}`,
    this.country
  ].filter(Boolean);
  
  return lines.join('\n');
});

// Pre-save hook to ensure only one default address per type per user
AddressSchema.pre('save', async function(next) {
  if (this.isDefault) {
    // Unset any other default addresses of the same type for this user
    await this.constructor.updateMany(
      { 
        _id: { $ne: this._id }, 
        userId: this.userId, 
        type: this.type,
        isDefault: true 
      },
      { $set: { isDefault: false } }
    );
  }
  
  next();
});

export const AddressModel = mongoose.model<IAddressDoc>('Address', AddressSchema);


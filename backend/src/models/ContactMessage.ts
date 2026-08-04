// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';
import { ContactMessage } from 'shared/types';

export interface IContactMessageDoc extends Omit<ContactMessage, '_id'>, Document {}

const ContactMessageSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  subject: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'read', 'responded', 'archived'],
    default: 'pending',
  },
}, {
  timestamps: true,
});

// Indexes
ContactMessageSchema.index({ status: 1, createdAt: -1 });
ContactMessageSchema.index({ email: 1 });
ContactMessageSchema.index({ createdAt: -1 });

export const ContactMessageModel = mongoose.model<IContactMessageDoc>('ContactMessage', ContactMessageSchema);

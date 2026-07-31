// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';

export interface IFAQ {
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
}

export interface IFAQDoc extends Document, IFAQ {}

const FAQSchema: Schema = new Schema({
  question: {
    type: String,
    required: true,
    trim: true,
  },
  answer: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  sortOrder: {
    type: Number,
    default: 0,
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

FAQSchema.index({ category: 1, sortOrder: 1 });
FAQSchema.index({ isActive: 1 });

export const FAQModel = mongoose.model<IFAQDoc>('FAQ', FAQSchema);
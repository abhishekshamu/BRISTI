// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';
import { IPayment } from 'shared/types';

export interface IPaymentDoc extends Omit<IPayment, '_id'>, Document {}

const PaymentSchema: Schema = new Schema({
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  method: {
    type: String,
    required: true,
    enum: ['credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay', 'razorpay', 'stripe', 'cod']
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  gatewayResponse: {
    type: Schema.Types.Mixed
  },
  refundAmount: {
    type: Number
  },
  refundReason: {
    type: String
  }
}, {
  timestamps: true
});

export const PaymentModel = mongoose.model<IPaymentDoc>('Payment', PaymentSchema);





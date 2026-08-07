// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog {
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  userEmail: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
}

export interface IAuditLogDoc extends Document, IAuditLog {}

const AuditLogSchema: Schema = new Schema({
  action: {
    type: String,
    required: true,
    enum: ['create', 'update', 'delete', 'view', 'login', 'logout', 'reorder', 'duplicate', 'transfer'],
  },
  entityType: {
    type: String,
    required: true,
    index: true,
  },
  entityId: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  userName: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  changes: {
    type: Schema.Types.Mixed,
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
}, {
  timestamps: true,
});

AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });

export const AuditLogModel = mongoose.model<IAuditLogDoc>('AuditLog', AuditLogSchema);
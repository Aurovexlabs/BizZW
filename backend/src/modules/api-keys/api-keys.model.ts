import crypto from 'crypto';
import mongoose, { Connection, Document, Schema } from 'mongoose';

export interface ApiKeyDocument extends Document {
  orgId: string;
  name: string;
  keyPrefix: string;
  hashedKey: string;
  permissions: string[];
  lastUsed?: Date;
  expiresAt?: Date;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
}

const ApiKeySchema = new Schema<ApiKeyDocument>(
  {
    orgId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    keyPrefix: { type: String, required: true },
    hashedKey: { type: String, required: true, select: false, index: true },
    permissions: [{ type: String }],
    lastUsed: { type: Date },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

const apiKeyModels = new Map<string, mongoose.Model<ApiKeyDocument>>();

export function getApiKeyModel(db: Connection) {
  const key = db.name;
  if (!apiKeyModels.has(key)) {
    apiKeyModels.set(key, db.model<ApiKeyDocument>('ApiKey', ApiKeySchema));
  }
  return apiKeyModels.get(key)!;
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export const API_PERMISSIONS = [
  'inventory:read',
  'inventory:write',
  'sales:read',
  'sales:write',
  'invoices:read',
  'invoices:write',
  'customers:read',
  'customers:write',
  'reports:read',
  'expenses:read',
  'expenses:write',
] as const;

export type ApiPermission = (typeof API_PERMISSIONS)[number];

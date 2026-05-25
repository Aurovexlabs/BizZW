import mongoose, { Document, Schema } from 'mongoose';
import { Currency, PlanType, SubscriptionStatus, TenantStatus } from '../../shared/types';

// ─── Tenant Model ─────────────────────────────────────────────

export interface TenantDocument extends Document {
  orgId: string;
  name: string;
  email: string;
  plan: PlanType;
  status: TenantStatus;
  dbName: string;
  settings: {
    currency: Currency;
    taxRate: number;
    businessType: string;
    timezone: string;
    logo?: { fileId: string; filePath: string };
    address?: string;
    phone?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const tenantSchema = new Schema<TenantDocument>(
  {
    orgId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    plan: { type: String, enum: Object.values(PlanType), default: PlanType.STARTER },
    status: { type: String, enum: Object.values(TenantStatus), default: TenantStatus.TRIAL },
    dbName: { type: String, required: true, unique: true },
    settings: {
      currency: { type: String, enum: Object.values(Currency), default: Currency.USD },
      taxRate: { type: Number, default: 15 }, // Zimbabwe 15% VAT
      businessType: { type: String, default: 'retail' },
      timezone: { type: String, default: 'Africa/Harare' },
      logo: {
        fileId: String,
        filePath: String,
      },
      address: String,
      phone: String,
    },
  },
  { timestamps: true }
);

export const Tenant = mongoose.model<TenantDocument>('Tenant', tenantSchema);

// ─── Subscription Model ───────────────────────────────────────

export interface SubscriptionDocument extends Document {
  tenantId: mongoose.Types.ObjectId;
  plan: PlanType;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  paynowRef?: string;
  paynowReference?: string;
  paynowPollUrl?: string;
  amount: number;
  createdAt: Date;
}

const subscriptionSchema = new Schema<SubscriptionDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    plan: { type: String, enum: Object.values(PlanType), required: true },
    status: {
      type: String,
      enum: Object.values(SubscriptionStatus),
      default: SubscriptionStatus.PENDING,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    paynowRef: String,
    paynowReference: String,
    paynowPollUrl: String,
    amount: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model<SubscriptionDocument>(
  'Subscription',
  subscriptionSchema
);

// ─── PlatformAdmin Model ──────────────────────────────────────

export interface PlatformAdminDocument extends Document {
  email: string;
  passwordHash: string;
  role: 'SUPER_ADMIN';
  createdAt: Date;
}

const platformAdminSchema = new Schema<PlatformAdminDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'SUPER_ADMIN', immutable: true },
  },
  { timestamps: true }
);

export const PlatformAdmin = mongoose.model<PlatformAdminDocument>(
  'PlatformAdmin',
  platformAdminSchema
);

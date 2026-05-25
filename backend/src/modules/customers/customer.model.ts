import { Connection, Schema, Document, Model } from 'mongoose';

export interface CustomerDocument extends Document {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  totalPurchases: number;
  outstandingBalance: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<CustomerDocument>(
  {
    name: { type: String, required: true, trim: true, index: true },
    email: { type: String, lowercase: true, trim: true, sparse: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    totalPurchases: { type: Number, default: 0, min: 0 },
    outstandingBalance: { type: Number, default: 0 },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

customerSchema.index({ name: 'text', email: 'text', phone: 'text' });

export function getCustomerModel(conn: Connection): Model<CustomerDocument> {
  if (conn.models['Customer']) return conn.models['Customer'] as Model<CustomerDocument>;
  return conn.model<CustomerDocument>('Customer', customerSchema);
}

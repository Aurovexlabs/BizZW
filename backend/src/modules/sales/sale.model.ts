import { Connection, Document, Model, Schema } from 'mongoose';
import { Currency, PaymentMethod } from '../../shared/types';

export interface SaleDocument extends Document {
  saleNumber: string;
  sequence: number;
  cashierId: string;
  customerId?: Schema.Types.ObjectId;
  items: Array<{
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  currency: Currency;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  change: number;
  receiptNumber: string;
  notes?: string;
  createdAt: Date;
}

const saleSchema = new Schema<SaleDocument>(
  {
    saleNumber: { type: String, required: true, unique: true, index: true },
    sequence: { type: Number, required: true },
    cashierId: { type: String, required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', sparse: true },
    items: [
      {
        productId: { type: String, required: true },
        productName: { type: String, required: true },
        sku: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        total: { type: Number, required: true, min: 0 },
      },
    ],
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: Object.values(Currency), default: Currency.USD },
    paymentMethod: { type: String, enum: Object.values(PaymentMethod), required: true },
    amountPaid: { type: Number, required: true, min: 0 },
    change: { type: Number, required: true, default: 0 },
    receiptNumber: { type: String, required: true, unique: true },
    notes: String,
  },
  {
    timestamps: true,
    // Sales are immutable once created
    strict: true,
  }
);

saleSchema.index({ createdAt: -1 });
saleSchema.index({ cashierId: 1, createdAt: -1 });

export function getSaleModel(conn: Connection): Model<SaleDocument> {
  if (conn.models['Sale']) return conn.models['Sale'] as Model<SaleDocument>;
  return conn.model<SaleDocument>('Sale', saleSchema);
}

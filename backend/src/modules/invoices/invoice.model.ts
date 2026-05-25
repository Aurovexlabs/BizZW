import { Connection, Document, Model, Schema } from 'mongoose';
import { Currency, InvoiceStatus } from '../../shared/types';

export interface InvoiceDocument extends Document {
  invoiceNumber: string;
  customerId: Schema.Types.ObjectId;
  lineItems: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  taxRate: number;
  discount: number;
  total: number;
  currency: Currency;
  status: InvoiceStatus;
  dueDate: Date;
  paidAt?: Date;
  paynowRef?: string;
  paynowUrl?: string;
  notes?: string;
  sequence: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = new Schema<InvoiceDocument>(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    sequence: { type: Number, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    lineItems: [
      {
        productId: { type: String, required: true },
        productName: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        total: { type: Number, required: true, min: 0 },
      },
    ],
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, default: 0 },
    taxRate: { type: Number, required: true, default: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: Object.values(Currency), default: Currency.USD },
    status: {
      type: String,
      enum: Object.values(InvoiceStatus),
      default: InvoiceStatus.DRAFT,
      index: true,
    },
    dueDate: { type: Date, required: true, index: true },
    paidAt: Date,
    paynowRef: String,
    paynowUrl: String,
    notes: { type: String, trim: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

invoiceSchema.index({ status: 1, dueDate: 1 });
invoiceSchema.index({ customerId: 1, status: 1 });
invoiceSchema.index({ createdAt: -1 });

export function getInvoiceModel(conn: Connection): Model<InvoiceDocument> {
  if (conn.models['Invoice']) return conn.models['Invoice'] as Model<InvoiceDocument>;
  return conn.model<InvoiceDocument>('Invoice', invoiceSchema);
}

// Counter model for auto-incrementing invoice numbers
export interface CounterDocument extends Document<string> {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<CounterDocument>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export function getCounterModel(conn: Connection): Model<CounterDocument> {
  if (conn.models['Counter']) return conn.models['Counter'] as Model<CounterDocument>;
  return conn.model<CounterDocument>('Counter', counterSchema);
}

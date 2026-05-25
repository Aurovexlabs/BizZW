import { Connection, Schema, Document, Model } from 'mongoose';

export interface ProductDocument extends Document {
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  costPrice: number;
  sellPrice: number;
  quantity: number;
  lowStockThreshold: number;
  images: Array<{ fileId: string; filePath: string }>;
  isActive: boolean;
  stockHistory: Array<{
    type: 'IN' | 'OUT' | 'ADJUSTMENT';
    quantity: number;
    reason: string;
    userId: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<ProductDocument>(
  {
    name: { type: String, required: true, trim: true, index: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    barcode: { type: String, sparse: true, index: true },
    category: { type: String, required: true, trim: true, index: true },
    costPrice: { type: Number, required: true, min: 0 },
    sellPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    images: [
      {
        fileId: { type: String, required: true },
        filePath: { type: String, required: true },
      },
    ],
    isActive: { type: Boolean, default: true, index: true },
    stockHistory: [
      {
        type: { type: String, enum: ['IN', 'OUT', 'ADJUSTMENT'], required: true },
        quantity: { type: Number, required: true },
        reason: { type: String, required: true },
        userId: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', sku: 'text', barcode: 'text' });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ quantity: 1 }); // for low stock queries

export function getProductModel(conn: Connection): Model<ProductDocument> {
  if (conn.models['Product']) return conn.models['Product'] as Model<ProductDocument>;
  return conn.model<ProductDocument>('Product', productSchema);
}

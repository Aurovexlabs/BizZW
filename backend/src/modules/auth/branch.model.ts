import { Connection, Schema, Document, Model } from 'mongoose';

export interface BranchDocument extends Document {
  name: string;
  address: string;
  managerId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const branchSchema = new Schema<BranchDocument>(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    managerId: { type: String, sparse: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export function getBranchModel(conn: Connection): Model<BranchDocument> {
  if (conn.models['Branch']) return conn.models['Branch'] as Model<BranchDocument>;
  return conn.model<BranchDocument>('Branch', branchSchema);
}

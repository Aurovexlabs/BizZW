import { Connection, Schema, Document, Model } from 'mongoose';
import { ExpenseCategory, Currency } from '../../shared/types';

export interface ExpenseDocument extends Document {
  title: string;
  category: ExpenseCategory;
  amount: number;
  currency: Currency;
  date: Date;
  receipt?: { fileId: string; filePath: string };
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<ExpenseDocument>(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: Object.values(ExpenseCategory),
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: Object.values(Currency), default: Currency.USD },
    date: { type: Date, required: true, index: true },
    receipt: {
      fileId: String,
      filePath: String,
    },
    notes: { type: String, trim: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1, date: -1 });

export function getExpenseModel(conn: Connection): Model<ExpenseDocument> {
  if (conn.models['Expense']) return conn.models['Expense'] as Model<ExpenseDocument>;
  return conn.model<ExpenseDocument>('Expense', expenseSchema);
}

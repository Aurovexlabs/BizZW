import { z } from 'zod';
import { Currency, InvoiceStatus } from '../../shared/types';
import { getTenantDB } from '../../lib/db';
import { getInvoiceModel, getCounterModel } from './invoice.model';
import { getCustomerModel } from '../customers/customer.model';
import { AppError } from '../../middleware/error.middleware';
import { sendEmail, invoiceEmailTemplate } from '../../lib/resend';
import { formatCurrency, formatDate, generateInvoiceNumber } from '../../shared/utils';

const lineItemSchema = z.object({
  productId: z.string(),
  productName: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
});

const createInvoiceSchema = z.object({
  customerId: z.string().min(1),
  lineItems: z.array(lineItemSchema).min(1),
  taxRate: z.number().min(0).max(100).default(0),
  discount: z.number().min(0).default(0),
  currency: z.nativeEnum(Currency).default(Currency.USD),
  dueDate: z.string().transform((d) => new Date(d)),
  notes: z.string().optional(),
});

// ─── Get next invoice sequence ────────────────────────────────

async function getNextSequence(orgId: string): Promise<number> {
  const db = await getTenantDB(orgId);
  const Counter = getCounterModel(db);
  const result = await Counter.findByIdAndUpdate(
    'invoiceSeq',
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return (result as { seq: number }).seq;
}

// ─── List Invoices ────────────────────────────────────────────

export async function listInvoices(
  orgId: string,
  opts: {
    page: number;
    limit: number;
    status?: InvoiceStatus;
    customerId?: string;
    startDate?: string;
    endDate?: string;
  }
) {
  const { page = 1, limit = 20, status, customerId, startDate, endDate } = opts;
  const db = await getTenantDB(orgId);
  const Invoice = getInvoiceModel(db);

  const query: Record<string, unknown> = {};
  if (status) query.status = status;
  if (customerId) query.customerId = customerId;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) (query.createdAt as Record<string, unknown>).$gte = new Date(startDate);
    if (endDate) (query.createdAt as Record<string, unknown>).$lte = new Date(endDate);
  }

  const [invoices, total] = await Promise.all([
    Invoice.find(query)
      .populate('customerId', 'name email phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Invoice.countDocuments(query),
  ]);

  return {
    invoices,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 },
  };
}

// ─── Get Invoice ──────────────────────────────────────────────

export async function getInvoice(orgId: string, invoiceId: string) {
  const db = await getTenantDB(orgId);
  const Invoice = getInvoiceModel(db);
  const invoice = await Invoice.findById(invoiceId).populate('customerId');
  if (!invoice) throw new AppError('Invoice not found', 404, 'NOT_FOUND');
  return invoice;
}

// ─── Create Invoice ───────────────────────────────────────────

export async function createInvoice(orgId: string, data: unknown, userId: string) {
  const validated = createInvoiceSchema.parse(data);
  const db = await getTenantDB(orgId);
  const Invoice = getInvoiceModel(db);
  const Customer = getCustomerModel(db);

  const customer = await Customer.findById(validated.customerId);
  if (!customer) throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');

  // Calculate totals
  const lineItems = validated.lineItems.map((item) => ({
    ...item,
    total: item.quantity * item.unitPrice,
  }));
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = (subtotal * validated.taxRate) / 100;
  const total = subtotal + taxAmount - validated.discount;

  const sequence = await getNextSequence(orgId);
  const invoiceNumber = generateInvoiceNumber(sequence);

  const invoice = await Invoice.create({
    invoiceNumber,
    sequence,
    customerId: validated.customerId,
    lineItems,
    subtotal,
    tax: taxAmount,
    taxRate: validated.taxRate,
    discount: validated.discount,
    total,
    currency: validated.currency,
    status: InvoiceStatus.DRAFT,
    dueDate: validated.dueDate,
    notes: validated.notes,
    createdBy: userId,
  });

  return invoice;
}

// ─── Update Invoice ───────────────────────────────────────────

export async function updateInvoice(orgId: string, invoiceId: string, data: unknown) {
  const db = await getTenantDB(orgId);
  const Invoice = getInvoiceModel(db);

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new AppError('Invoice not found', 404, 'NOT_FOUND');

  if (invoice.status === InvoiceStatus.PAID) {
    throw new AppError('Cannot edit a paid invoice', 400, 'INVOICE_PAID');
  }

  const updateSchema = createInvoiceSchema.partial();
  const validated = updateSchema.parse(data);

  if (validated.lineItems) {
    const lineItems = validated.lineItems.map((item) => ({
      ...item,
      total: item.quantity * item.unitPrice,
    }));
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const taxRate = validated.taxRate ?? invoice.taxRate;
    const taxAmount = (subtotal * taxRate) / 100;
    const discount = validated.discount ?? invoice.discount;
    const total = subtotal + taxAmount - discount;

    Object.assign(invoice, { lineItems, subtotal, tax: taxAmount, taxRate, discount, total });
  }

  if (validated.currency) invoice.currency = validated.currency;
  if (validated.dueDate) invoice.dueDate = validated.dueDate as unknown as Date;
  if (validated.notes !== undefined) invoice.notes = validated.notes;

  await invoice.save();
  return invoice;
}

// ─── Send Invoice via Email ───────────────────────────────────

export async function sendInvoiceEmail(orgId: string, invoiceId: string) {
  const db = await getTenantDB(orgId);
  const Invoice = getInvoiceModel(db);

  const invoice = await Invoice.findById(invoiceId).populate<{
    customerId: { name: string; email: string };
  }>('customerId', 'name email');
  if (!invoice) throw new AppError('Invoice not found', 404, 'NOT_FOUND');

  const customer = invoice.customerId as { name: string; email: string };
  if (!customer.email) throw new AppError('Customer has no email address', 400, 'NO_CUSTOMER_EMAIL');

  const formattedAmount = formatCurrency(invoice.total, invoice.currency);
  const formattedDue = formatDate(invoice.dueDate.toISOString());

  await sendEmail({
    to: customer.email,
    subject: `Invoice ${invoice.invoiceNumber} from BizZW`,
    html: invoiceEmailTemplate(
      customer.name,
      invoice.invoiceNumber,
      formattedAmount,
      formattedDue
    ),
  });

  await Invoice.updateOne({ _id: invoiceId }, {
    status: invoice.status === InvoiceStatus.DRAFT ? InvoiceStatus.SENT : invoice.status,
  });

  return { message: 'Invoice sent successfully' };
}

// ─── Mark as Paid ─────────────────────────────────────────────

export async function markInvoicePaid(orgId: string, invoiceId: string, paynowRef?: string) {
  const db = await getTenantDB(orgId);
  const Invoice = getInvoiceModel(db);
  const Customer = getCustomerModel(db);

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new AppError('Invoice not found', 404, 'NOT_FOUND');
  if (invoice.status === InvoiceStatus.PAID) throw new AppError('Invoice already paid', 400, 'ALREADY_PAID');

  invoice.status = InvoiceStatus.PAID;
  invoice.paidAt = new Date();
  if (paynowRef) invoice.paynowRef = paynowRef;
  await invoice.save();

  // Reduce customer outstanding balance
  await Customer.findByIdAndUpdate(invoice.customerId, {
    $inc: { outstandingBalance: -invoice.total },
  });

  return invoice;
}

// ─── Delete Invoice (DRAFT only) ─────────────────────────────

export async function deleteInvoice(orgId: string, invoiceId: string) {
  const db = await getTenantDB(orgId);
  const Invoice = getInvoiceModel(db);
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new AppError('Invoice not found', 404, 'NOT_FOUND');
  if (invoice.status !== InvoiceStatus.DRAFT) throw new AppError('Only draft invoices can be deleted', 400, 'NOT_DRAFT');
  await Invoice.deleteOne({ _id: invoiceId });
}

// ─── Update Overdue Invoices (cron-style) ─────────────────────

export async function markOverdueInvoices(orgId: string) {
  const db = await getTenantDB(orgId);
  const Invoice = getInvoiceModel(db);

  const result = await Invoice.updateMany(
    {
      status: { $in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID] },
      dueDate: { $lt: new Date() },
    },
    { status: InvoiceStatus.OVERDUE }
  );
  return result.modifiedCount;
}

import { z } from 'zod';
import { getTenantDB } from '../../lib/db';
import { AppError } from '../../middleware/error.middleware';
import { Currency, PaymentMethod, WebhookEvent } from '../../shared/types';
import { getCustomerModel } from '../customers/customer.model';
import { getProductModel } from '../inventory/product.model';
import { getCounterModel } from '../invoices/invoice.model';
import { triggerWebhooks } from '../webhooks/webhooks.router';
import { getSaleModel } from './sale.model';

const saleItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});

const createSaleSchema = z.object({
  items: z.array(saleItemSchema).min(1),
  customerId: z.string().optional(),
  discount: z.number().min(0).default(0),
  currency: z.nativeEnum(Currency).default(Currency.USD),
  paymentMethod: z.nativeEnum(PaymentMethod),
  amountPaid: z.number().positive(),
  notes: z.string().optional(),
});

async function getNextSaleSequence(orgId: string): Promise<number> {
  const db = await getTenantDB(orgId);
  const Counter = getCounterModel(db);
  const result = await Counter.findByIdAndUpdate(
    'saleSeq',
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return (result as { seq: number }).seq;
}

// ─── Create Sale (POS checkout) ───────────────────────────────

export async function createSale(orgId: string, data: unknown, cashierId: string) {
  const validated = createSaleSchema.parse(data);
  const db = await getTenantDB(orgId);
  const Product = getProductModel(db);
  const Sale = getSaleModel(db);
  const Customer = getCustomerModel(db);

  // Validate all products and stock availability
  const resolvedItems = await Promise.all(
    validated.items.map(async (item) => {
      const product = await Product.findById(item.productId);
      if (!product)
        throw new AppError(`Product ${item.productId} not found`, 404, 'PRODUCT_NOT_FOUND');
      if (!product.isActive)
        throw new AppError(`Product "${product.name}" is inactive`, 400, 'PRODUCT_INACTIVE');
      if (product.quantity < item.quantity) {
        throw new AppError(
          `Insufficient stock for "${product.name}". Available: ${product.quantity}`,
          400,
          'INSUFFICIENT_STOCK'
        );
      }
      return {
        productId: item.productId,
        productName: product.name,
        sku: product.sku,
        quantity: item.quantity,
        unitPrice: product.sellPrice,
        total: product.sellPrice * item.quantity,
        _product: product,
      };
    })
  );

  const subtotal = resolvedItems.reduce((sum, i) => sum + i.total, 0);
  const total = Math.max(0, subtotal - validated.discount);

  if (validated.amountPaid < total) {
    throw new AppError(
      `Amount paid (${validated.amountPaid}) is less than total (${total})`,
      400,
      'INSUFFICIENT_PAYMENT'
    );
  }

  const change = validated.amountPaid - total;
  const sequence = await getNextSaleSequence(orgId);
  const saleNumber = `SALE-${String(sequence).padStart(6, '0')}`;
  const receiptNumber = `RCP-${Date.now()}`;

  // Create sale record
  const saleItems = resolvedItems.map(({ _product: _p, ...item }) => item);
  const sale = await Sale.create({
    saleNumber,
    sequence,
    cashierId,
    customerId: validated.customerId || undefined,
    items: saleItems,
    subtotal,
    discount: validated.discount,
    total,
    currency: validated.currency,
    paymentMethod: validated.paymentMethod,
    amountPaid: validated.amountPaid,
    change,
    receiptNumber,
    notes: validated.notes,
  });

  // Deduct stock for each product in a single pass
  await Promise.all(
    resolvedItems.map(({ _product, quantity }) =>
      Product.findByIdAndUpdate(_product._id, {
        $inc: { quantity: -quantity },
        $push: {
          stockHistory: {
            type: 'OUT',
            quantity,
            reason: `POS Sale ${saleNumber}`,
            userId: cashierId,
            createdAt: new Date(),
          },
        },
      })
    )
  );

  const lowStockAlerts = resolvedItems
    .map(({ _product, quantity }) => {
      const previousQuantity = _product.quantity;
      const remainingQuantity = previousQuantity - quantity;
      const threshold = _product.lowStockThreshold;
      const crossedThreshold = previousQuantity > threshold && remainingQuantity <= threshold;

      if (!crossedThreshold) return null;

      return {
        productId: _product._id.toString(),
        name: _product.name,
        sku: _product.sku,
        remainingQuantity,
        lowStockThreshold: threshold,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  for (const alert of lowStockAlerts) {
    void triggerWebhooks(orgId, WebhookEvent.PRODUCT_LOW_STOCK, {
      ...alert,
      saleId: sale._id,
      saleNumber,
    });
  }

  // Update customer purchase history if customerId provided
  if (validated.customerId) {
    await Customer.findByIdAndUpdate(validated.customerId, {
      $inc: { totalPurchases: total },
    });
  }

  return sale;
}

// ─── List Sales ───────────────────────────────────────────────

export async function listSales(
  orgId: string,
  opts: {
    page: number;
    limit: number;
    cashierId?: string;
    startDate?: string;
    endDate?: string;
    paymentMethod?: string;
  }
) {
  const { page = 1, limit = 20, cashierId, startDate, endDate, paymentMethod } = opts;
  const db = await getTenantDB(orgId);
  const Sale = getSaleModel(db);

  const query: Record<string, unknown> = {};
  if (cashierId) query.cashierId = cashierId;
  if (paymentMethod) query.paymentMethod = paymentMethod;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) (query.createdAt as Record<string, unknown>).$gte = new Date(startDate);
    if (endDate) (query.createdAt as Record<string, unknown>).$lte = new Date(endDate);
  }

  const [sales, total] = await Promise.all([
    Sale.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Sale.countDocuments(query),
  ]);

  return {
    sales,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

// ─── Get Sale ─────────────────────────────────────────────────

export async function getSale(orgId: string, saleId: string) {
  const db = await getTenantDB(orgId);
  const Sale = getSaleModel(db);
  const sale = await Sale.findById(saleId);
  if (!sale) throw new AppError('Sale not found', 404, 'NOT_FOUND');
  return sale;
}

// ─── Search Products for POS ──────────────────────────────────

export async function searchProductsForPOS(orgId: string, query: string) {
  const db = await getTenantDB(orgId);
  const Product = getProductModel(db);

  return Product.find({
    isActive: true,
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { sku: { $regex: query, $options: 'i' } },
      { barcode: query },
    ],
  })
    .select('name sku barcode sellPrice quantity images category')
    .limit(20);
}

// ─── Today's Summary ──────────────────────────────────────────

export async function getTodaySummary(orgId: string) {
  const db = await getTenantDB(orgId);
  const Sale = getSaleModel(db);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const sales = await Sale.find({ createdAt: { $gte: start, $lte: end } });
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalTransactions = sales.length;

  const byMethod = sales.reduce(
    (acc, s) => {
      acc[s.paymentMethod] = (acc[s.paymentMethod] || 0) + s.total;
      return acc;
    },
    {} as Record<string, number>
  );

  return { totalRevenue, totalTransactions, byMethod, sales: sales.slice(0, 10) };
}

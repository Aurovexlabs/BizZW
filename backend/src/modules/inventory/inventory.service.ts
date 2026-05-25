import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { getTenantDB } from '../../lib/db';
import { AppError } from '../../middleware/error.middleware';
import { getProductModel } from './product.model';

const productSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().min(2).max(50).toUpperCase(),
  barcode: z.string().optional(),
  category: z.string().min(1).max(100),
  costPrice: z.number().min(0),
  sellPrice: z.number().min(0),
  quantity: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  isActive: z.boolean().default(true),
});

const updateProductSchema = productSchema.partial();

export interface PaginationOptions {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  lowStock?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

function escapeRegex(raw: string): string {
  return raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── List Products ────────────────────────────────────────────

export async function listProducts(orgId: string, opts: PaginationOptions) {
  const {
    page = 1,
    limit = 20,
    search,
    category,
    lowStock,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = opts;
  const db = await getTenantDB(orgId);
  const Product = getProductModel(db);

  const query: Record<string, unknown> = { isActive: true };
  if (search) {
    const normalizedSearch = search.trim();
    if (normalizedSearch) {
      const safeSearchPattern = new RegExp(escapeRegex(normalizedSearch), 'i');
      query.$or = [
        { name: safeSearchPattern },
        { sku: safeSearchPattern },
        { barcode: safeSearchPattern },
      ];
    }
  }
  if (category) query.category = category;
  if (lowStock) query.$expr = { $lte: ['$quantity', '$lowStockThreshold'] };

  const [products, total] = await Promise.all([
    Product.find(query)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(query),
  ]);

  return {
    products,
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

// ─── Get All Categories ───────────────────────────────────────

export async function getCategories(orgId: string): Promise<string[]> {
  const db = await getTenantDB(orgId);
  const Product = getProductModel(db);
  return Product.distinct('category', { isActive: true });
}

// ─── Get Single Product ───────────────────────────────────────

export async function getProduct(orgId: string, productId: string) {
  const db = await getTenantDB(orgId);
  const Product = getProductModel(db);
  const product = await Product.findById(productId);
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');
  return product;
}

// ─── Create Product ───────────────────────────────────────────

export async function createProduct(orgId: string, data: unknown, userId: string) {
  const validated = productSchema.parse(data);
  const db = await getTenantDB(orgId);
  const Product = getProductModel(db);

  const existing = await Product.findOne({ sku: validated.sku });
  if (existing) throw new AppError(`SKU ${validated.sku} already exists`, 409, 'DUPLICATE_SKU');

  const product = await Product.create({
    ...validated,
    stockHistory:
      validated.quantity > 0
        ? [{ type: 'IN', quantity: validated.quantity, reason: 'Initial stock', userId }]
        : [],
  });

  return product;
}

// ─── Update Product ───────────────────────────────────────────

export async function updateProduct(
  orgId: string,
  productId: string,
  data: unknown,
  userId: string
) {
  const validated = updateProductSchema.parse(data);
  const db = await getTenantDB(orgId);
  const Product = getProductModel(db);

  const product = await Product.findById(productId);
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');

  if (validated.sku && validated.sku !== product.sku) {
    const existing = await Product.findOne({ sku: validated.sku });
    if (existing) throw new AppError(`SKU ${validated.sku} already in use`, 409, 'DUPLICATE_SKU');
  }

  // Track quantity change in stock history
  if (validated.quantity !== undefined && validated.quantity !== product.quantity) {
    const diff = validated.quantity - product.quantity;
    product.stockHistory.push({
      type: diff > 0 ? 'IN' : 'ADJUSTMENT',
      quantity: Math.abs(diff),
      reason: 'Manual stock update',
      userId,
      createdAt: new Date(),
    });
  }

  Object.assign(product, validated);
  await product.save();
  return product;
}

// ─── Adjust Stock ─────────────────────────────────────────────

export async function adjustStock(
  orgId: string,
  productId: string,
  type: 'IN' | 'OUT' | 'ADJUSTMENT',
  quantity: number,
  reason: string,
  userId: string
) {
  const db = await getTenantDB(orgId);
  const Product = getProductModel(db);

  const product = await Product.findById(productId);
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');

  if (type === 'OUT' && product.quantity < quantity) {
    throw new AppError(
      `Insufficient stock. Available: ${product.quantity}`,
      400,
      'INSUFFICIENT_STOCK'
    );
  }

  const newQty =
    type === 'IN'
      ? product.quantity + quantity
      : type === 'OUT'
        ? product.quantity - quantity
        : quantity; // ADJUSTMENT sets absolute value

  product.quantity = newQty;
  product.stockHistory.push({ type, quantity, reason, userId, createdAt: new Date() });
  await product.save();
  return product;
}

// ─── Delete Product (soft delete) ────────────────────────────

export async function deleteProduct(orgId: string, productId: string) {
  const db = await getTenantDB(orgId);
  const Product = getProductModel(db);
  const product = await Product.findByIdAndUpdate(productId, { isActive: false }, { new: true });
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');
  return product;
}

// ─── Update Product Images ────────────────────────────────────

export async function updateProductImages(
  orgId: string,
  productId: string,
  images: Array<{ fileId: string; filePath: string }>
) {
  const db = await getTenantDB(orgId);
  const Product = getProductModel(db);
  const product = await Product.findByIdAndUpdate(productId, { images }, { new: true });
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');
  return product;
}

// ─── Bulk CSV Import ──────────────────────────────────────────

export async function bulkImportProducts(orgId: string, csvBuffer: Buffer, userId: string) {
  const records = parse(csvBuffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  const results = { created: 0, skipped: 0, errors: [] as string[] };
  const db = await getTenantDB(orgId);
  const Product = getProductModel(db);

  for (const record of records) {
    try {
      const validated = productSchema.parse({
        name: record['name'] || record['Name'],
        sku: record['sku'] || record['SKU'],
        barcode: record['barcode'] || record['Barcode'],
        category: record['category'] || record['Category'] || 'General',
        costPrice: parseFloat(record['costPrice'] || record['cost_price'] || '0'),
        sellPrice: parseFloat(record['sellPrice'] || record['sell_price'] || '0'),
        quantity: parseInt(record['quantity'] || record['Quantity'] || '0', 10),
        lowStockThreshold: parseInt(record['lowStockThreshold'] || '5', 10),
      });

      const existing = await Product.findOne({ sku: validated.sku });
      if (existing) {
        results.skipped++;
        continue;
      }

      await Product.create({
        ...validated,
        stockHistory:
          validated.quantity > 0
            ? [{ type: 'IN', quantity: validated.quantity, reason: 'CSV Import', userId }]
            : [],
      });
      results.created++;
    } catch (err) {
      results.errors.push(`Row ${record['name'] || '?'}: ${(err as Error).message}`);
    }
  }

  return results;
}

// ─── Get Low Stock Products ───────────────────────────────────

export async function getLowStockProducts(orgId: string) {
  const db = await getTenantDB(orgId);
  const Product = getProductModel(db);
  return Product.find({
    isActive: true,
    $expr: { $lte: ['$quantity', '$lowStockThreshold'] },
  }).sort({ quantity: 1 });
}

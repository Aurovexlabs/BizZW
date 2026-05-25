import { Request, Response, Router } from 'express';
import type { FileFilterCallback } from 'multer';
import multer from 'multer';
import { z } from 'zod';
import { getTenantDB } from '../../lib/db';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { asyncHandler, sendSuccess } from '../../middleware/error.middleware';
import { idempotencyMiddleware } from '../../middleware/idempotency.middleware';
import { UserRole } from '../../shared/types';
import { buildCsv, csvHeaders, INVENTORY_CSV_COLUMNS } from '../../utils/csv';
import * as inventoryService from './inventory.service';
import { getProductModel } from './product.model';

// ─── Multer v2 for CSV import ────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(null, false); // multer v2: reject with false, don't throw
    }
  },
});

// ─── Controllers ──────────────────────────────────────────────

const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const query = z
    .object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      search: z.string().optional(),
      category: z.string().optional(),
      lowStock: z.coerce.boolean().optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
    })
    .parse(req.query);
  const result = await inventoryService.listProducts(req.user!.orgId!, query);
  sendSuccess(res, result.products, 'Products retrieved', 200, result.meta);
});

const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await inventoryService.getCategories(req.user!.orgId!);
  sendSuccess(res, categories, 'Categories retrieved');
});

const getLowStock = asyncHandler(async (req: Request, res: Response) => {
  const products = await inventoryService.getLowStockProducts(req.user!.orgId!);
  sendSuccess(res, products, 'Low stock products retrieved');
});

const exportCsv = asyncHandler(async (req: Request, res: Response) => {
  const db = await getTenantDB(req.user!.orgId!);
  const Product = getProductModel(db);
  const products = await Product.find({ isActive: true }).lean();
  const csv = buildCsv(
    products.map((p) => ({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode || '',
      category: p.category,
      costPrice: p.costPrice,
      sellPrice: p.sellPrice,
      quantity: p.quantity,
      lowStockThreshold: p.lowStockThreshold,
      isActive: p.isActive,
    })),
    INVENTORY_CSV_COLUMNS
  );
  const headers = csvHeaders(`inventory-${new Date().toISOString().split('T')[0]}.csv`);
  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
  res.send(csv);
});

const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await inventoryService.getProduct(req.user!.orgId!, req.params.id);
  sendSuccess(res, product, 'Product retrieved');
});

const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await inventoryService.createProduct(
    req.user!.orgId!,
    req.body,
    req.user!.userId
  );
  sendSuccess(res, product, 'Product created', 201);
});

const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await inventoryService.updateProduct(
    req.user!.orgId!,
    req.params.id,
    req.body,
    req.user!.userId
  );
  sendSuccess(res, product, 'Product updated');
});

const adjustStock = asyncHandler(async (req: Request, res: Response) => {
  const { type, quantity, reason } = z
    .object({
      type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
      quantity: z.number().positive(),
      reason: z.string().min(1),
    })
    .parse(req.body);
  const product = await inventoryService.adjustStock(
    req.user!.orgId!,
    req.params.id,
    type,
    quantity,
    reason,
    req.user!.userId
  );
  sendSuccess(res, product, 'Stock adjusted');
});

const updateImages = asyncHandler(async (req: Request, res: Response) => {
  const { images } = z
    .object({
      images: z.array(z.object({ fileId: z.string(), filePath: z.string() })),
    })
    .parse(req.body);
  const product = await inventoryService.updateProductImages(
    req.user!.orgId!,
    req.params.id,
    images
  );
  sendSuccess(res, product, 'Product images updated');
});

const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  await inventoryService.deleteProduct(req.user!.orgId!, req.params.id);
  sendSuccess(res, null, 'Product deleted');
});

const bulkImport = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new Error('CSV file is required');
  const result = await inventoryService.bulkImportProducts(
    req.user!.orgId!,
    req.file.buffer,
    req.user!.userId
  );
  sendSuccess(res, result, `Import complete: ${result.created} created, ${result.skipped} skipped`);
});

// ─── Router ───────────────────────────────────────────────────
// NOTE: Static routes MUST be registered before /:id to avoid shadowing
export const inventoryRouter = Router();
inventoryRouter.use(authenticate);

// Static GETs first
inventoryRouter.get('/', listProducts);
inventoryRouter.get('/categories', getCategories);
inventoryRouter.get('/low-stock', getLowStock);
inventoryRouter.get(
  '/export.csv',
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN, UserRole.ACCOUNTANT),
  exportCsv
);

// Dynamic GET after all statics
inventoryRouter.get('/:id', getProduct);

// POST
inventoryRouter.post(
  '/',
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN),
  idempotencyMiddleware(),
  createProduct
);
inventoryRouter.post(
  '/bulk-import',
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN),
  upload.single('file'),
  bulkImport
);
inventoryRouter.post(
  '/:id/stock-adjust',
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN),
  adjustStock
);

// PATCH
inventoryRouter.patch('/:id', authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN), updateProduct);
inventoryRouter.patch(
  '/:id/images',
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN),
  updateImages
);

// DELETE
inventoryRouter.delete('/:id', authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN), deleteProduct);

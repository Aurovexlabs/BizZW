import { Router, Request, Response } from 'express';
import mongoose, { Schema, Connection, Document } from 'mongoose';
import { z } from 'zod';
import { PurchaseOrderStatus, Currency, UserRole, AuditAction, NotificationType } from '../../shared/types';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { asyncHandler, sendSuccess, AppError } from '../../middleware/error.middleware';
import { getTenantDB } from '../../lib/db';
import { getProductModel } from '../inventory/product.model';
import { getCounterModel } from '../invoices/invoice.model';
import { logAudit } from '../audit/audit.router';
import { createSystemNotification } from '../notifications/notifications.router';

// ─── Schema ───────────────────────────────────────────────────

interface PurchaseOrderDocument extends Document {
  poNumber: string;
  sequence: number;
  supplierName: string;
  supplierEmail?: string;
  supplierPhone?: string;
  items: {
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unitCost: number;
    total: number;
    receivedQuantity: number;
  }[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: Currency;
  status: PurchaseOrderStatus;
  expectedDate?: Date;
  receivedDate?: Date;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseOrderSchema = new Schema<PurchaseOrderDocument>(
  {
    poNumber: { type: String, required: true, unique: true },
    sequence: { type: Number, required: true },
    supplierName: { type: String, required: true },
    supplierEmail: { type: String },
    supplierPhone: { type: String },
    items: [{
      productId: { type: String, required: true },
      productName: { type: String, required: true },
      sku: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      unitCost: { type: Number, required: true, min: 0 },
      total: { type: Number, required: true },
      receivedQuantity: { type: Number, default: 0 },
    }],
    subtotal: { type: Number, required: true },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, enum: Object.values(Currency), default: Currency.USD },
    status: { type: String, enum: Object.values(PurchaseOrderStatus), default: PurchaseOrderStatus.DRAFT },
    expectedDate: { type: Date },
    receivedDate: { type: Date },
    notes: { type: String },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

const poModels = new Map<string, mongoose.Model<PurchaseOrderDocument>>();

function getPOModel(db: Connection) {
  const key = db.name;
  if (!poModels.has(key)) {
    poModels.set(key, db.model<PurchaseOrderDocument>('PurchaseOrder', PurchaseOrderSchema));
  }
  return poModels.get(key)!;
}

// ─── Router ───────────────────────────────────────────────────

export const purchaseOrdersRouter = Router();
purchaseOrdersRouter.use(authenticate);

const createPOSchema = z.object({
  supplierName: z.string().min(1),
  supplierEmail: z.string().email().optional(),
  supplierPhone: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().positive(),
    unitCost: z.number().positive(),
  })).min(1),
  currency: z.nativeEnum(Currency).default(Currency.USD),
  taxRate: z.number().min(0).max(100).default(0),
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/v1/purchase-orders
purchaseOrdersRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { orgId } = req.user!;
  const { page = 1, limit = 20, status } = z.object({
    page: z.coerce.number().default(1),
    limit: z.coerce.number().default(20),
    status: z.nativeEnum(PurchaseOrderStatus).optional(),
  }).parse(req.query);

  const db = await getTenantDB(orgId!);
  const PO = getPOModel(db);

  const filter = status ? { status } : {};
  const [orders, total] = await Promise.all([
    PO.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    PO.countDocuments(filter),
  ]);

  sendSuccess(res, orders, 'Purchase orders retrieved', 200, {
    total, page, limit, totalPages: Math.ceil(total / limit),
  });
}));

// GET /api/v1/purchase-orders/:id
purchaseOrdersRouter.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const db = await getTenantDB(req.user!.orgId!);
  const PO = getPOModel(db);
  const order = await PO.findById(req.params.id);
  if (!order) throw new AppError('Purchase order not found', 404, 'NOT_FOUND');
  sendSuccess(res, order, 'Purchase order retrieved');
}));

// POST /api/v1/purchase-orders
purchaseOrdersRouter.post(
  '/',
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const { orgId, userId, name } = req.user!;
    const validated = createPOSchema.parse(req.body);

    const db = await getTenantDB(orgId!);
    const PO = getPOModel(db);
    const Product = getProductModel(db);
    const Counter = getCounterModel(db);

    // Resolve product details
    const resolvedItems = await Promise.all(
      validated.items.map(async (item) => {
        const product = await Product.findById(item.productId);
        if (!product) throw new AppError(`Product ${item.productId} not found`, 404, 'PRODUCT_NOT_FOUND');
        return {
          productId: item.productId,
          productName: product.name,
          sku: product.sku,
          quantity: item.quantity,
          unitCost: item.unitCost,
          total: item.quantity * item.unitCost,
          receivedQuantity: 0,
        };
      })
    );

    const subtotal = resolvedItems.reduce((sum, i) => sum + i.total, 0);
    const taxAmount = (subtotal * validated.taxRate) / 100;
    const total = subtotal + taxAmount;

    const seq = await Counter.findByIdAndUpdate('poSeq', { $inc: { seq: 1 } }, { upsert: true, new: true });
    const poNumber = `PO-${new Date().getFullYear()}-${String((seq as { seq: number }).seq).padStart(4, '0')}`;

    const order = await PO.create({
      poNumber,
      sequence: (seq as { seq: number }).seq,
      ...validated,
      items: resolvedItems,
      subtotal,
      taxAmount,
      total,
      status: PurchaseOrderStatus.DRAFT,
      createdBy: userId,
    });

    await logAudit(orgId!, userId, name || 'Unknown', AuditAction.CREATE, 'PurchaseOrder',
      `Created purchase order ${poNumber} from ${validated.supplierName}`,
      { resourceId: String(order._id), metadata: { total, items: resolvedItems.length } });

    sendSuccess(res, order, 'Purchase order created', 201);
  })
);

// PATCH /api/v1/purchase-orders/:id/status
purchaseOrdersRouter.patch(
  '/:id/status',
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const { status } = z.object({ status: z.nativeEnum(PurchaseOrderStatus) }).parse(req.body);
    const { orgId, userId, name } = req.user!;

    const db = await getTenantDB(orgId!);
    const PO = getPOModel(db);

    const order = await PO.findById(req.params.id);
    if (!order) throw new AppError('Purchase order not found', 404, 'NOT_FOUND');

    order.status = status;
    await order.save();

    await logAudit(orgId!, userId, name || 'Unknown', AuditAction.UPDATE, 'PurchaseOrder',
      `Status changed to ${status} for ${order.poNumber}`);

    sendSuccess(res, order, `Purchase order status updated to ${status}`);
  })
);

// POST /api/v1/purchase-orders/:id/receive — receive items and update stock
purchaseOrdersRouter.post(
  '/:id/receive',
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const { orgId, userId, name } = req.user!;
    const receiveSchema = z.object({
      items: z.array(z.object({
        productId: z.string(),
        receivedQuantity: z.number().int().min(0),
      })),
    });

    const { items } = receiveSchema.parse(req.body);
    const db = await getTenantDB(orgId!);
    const PO = getPOModel(db);
    const Product = getProductModel(db);

    const order = await PO.findById(req.params.id);
    if (!order) throw new AppError('Purchase order not found', 404, 'NOT_FOUND');
    if (order.status === PurchaseOrderStatus.CANCELLED) {
      throw new AppError('Cannot receive items for cancelled order', 400, 'INVALID_STATUS');
    }

    // Update received quantities and stock
    for (const received of items) {
      const orderItem = order.items.find(i => i.productId === received.productId);
      if (!orderItem) continue;

      const additionalQty = received.receivedQuantity - orderItem.receivedQuantity;
      if (additionalQty > 0) {
        await Product.findByIdAndUpdate(received.productId, {
          $inc: { quantity: additionalQty },
          $push: {
            stockHistory: {
              type: 'IN',
              quantity: additionalQty,
              reason: `Received from PO ${order.poNumber}`,
              userId,
              createdAt: new Date(),
            },
          },
        });
      }
      orderItem.receivedQuantity = received.receivedQuantity;
    }

    // Determine new status
    const allReceived = order.items.every(i => i.receivedQuantity >= i.quantity);
    const anyReceived = order.items.some(i => i.receivedQuantity > 0);
    order.status = allReceived ? PurchaseOrderStatus.RECEIVED : anyReceived ? PurchaseOrderStatus.PARTIAL : order.status;
    if (allReceived) order.receivedDate = new Date();

    await order.save();

    if (allReceived) {
      await createSystemNotification(orgId!, NotificationType.PURCHASE_ORDER_RECEIVED,
        'Purchase Order Fully Received', `All items for ${order.poNumber} have been received.`);
    }

    await logAudit(orgId!, userId, name || 'Unknown', AuditAction.UPDATE, 'PurchaseOrder',
      `Received items for ${order.poNumber}`, { resourceId: String(order._id) });

    sendSuccess(res, order, 'Items received and stock updated');
  })
);

// DELETE /api/v1/purchase-orders/:id
purchaseOrdersRouter.delete(
  '/:id',
  authorize(UserRole.ORG_OWNER),
  asyncHandler(async (req: Request, res: Response) => {
    const { orgId, userId, name } = req.user!;
    const db = await getTenantDB(orgId!);
    const PO = getPOModel(db);

    const order = await PO.findById(req.params.id);
    if (!order) throw new AppError('Purchase order not found', 404, 'NOT_FOUND');
    if (order.status === PurchaseOrderStatus.RECEIVED) {
      throw new AppError('Cannot delete a fully received order', 400, 'INVALID_STATUS');
    }

    await PO.findByIdAndUpdate(req.params.id, { status: PurchaseOrderStatus.CANCELLED });
    await logAudit(orgId!, userId, name || 'Unknown', AuditAction.DELETE, 'PurchaseOrder',
      `Cancelled purchase order ${order.poNumber}`);

    sendSuccess(res, null, 'Purchase order cancelled');
  })
);

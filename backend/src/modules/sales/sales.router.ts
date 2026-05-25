import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { getTenantDB } from '../../lib/db';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { asyncHandler, sendSuccess } from '../../middleware/error.middleware';
import { UserRole, WebhookEvent } from '../../shared/types';
import { buildCsv, csvHeaders, SALES_CSV_COLUMNS } from '../../utils/csv';
import { triggerWebhooks } from '../webhooks/webhooks.router';
import { getSaleModel } from './sale.model';
import * as salesService from './sales.service';

export const salesRouter = Router();
salesRouter.use(authenticate);

// ─── Static routes first (must come before /:id) ─────────────

salesRouter.get(
  '/today',
  asyncHandler(async (req: Request, res: Response) => {
    const summary = await salesService.getTodaySummary(req.user!.orgId!);
    sendSuccess(res, summary, "Today's summary retrieved");
  })
);

salesRouter.get(
  '/search-products',
  asyncHandler(async (req: Request, res: Response) => {
    const { q } = z.object({ q: z.string().min(1) }).parse(req.query);
    const products = await salesService.searchProductsForPOS(req.user!.orgId!, q);
    sendSuccess(res, products, 'Products found');
  })
);

// GET /api/v1/sales/export.csv — must be before /:id
salesRouter.get(
  '/export.csv',
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN, UserRole.ACCOUNTANT),
  asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = z
      .object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
      .parse(req.query);

    const db = await getTenantDB(req.user!.orgId!);
    const Sale = getSaleModel(db);

    const filter: Record<string, unknown> = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) (filter.createdAt as Record<string, unknown>).$gte = new Date(startDate);
      if (endDate)
        (filter.createdAt as Record<string, unknown>).$lte = new Date(endDate + 'T23:59:59Z');
    }

    const sales = await Sale.find(filter).sort({ createdAt: -1 }).lean();
    const csv = buildCsv(
      sales.map((s) => ({
        saleNumber: s.saleNumber,
        receiptNumber: s.receiptNumber,
        createdAt: new Date(s.createdAt).toISOString(),
        items: s.items.map((i) => `${i.productName} ×${i.quantity}`).join('; '),
        subtotal: s.subtotal,
        discount: s.discount,
        total: s.total,
        currency: s.currency,
        paymentMethod: s.paymentMethod,
        change: s.change,
      })),
      SALES_CSV_COLUMNS
    );

    const headers = csvHeaders(`sales-${new Date().toISOString().split('T')[0]}.csv`);
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    res.send(csv);
  })
);

salesRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = z
      .object({
        page: z.coerce.number().default(1),
        limit: z.coerce.number().default(20),
        cashierId: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        paymentMethod: z.string().optional(),
      })
      .parse(req.query);

    const result = await salesService.listSales(req.user!.orgId!, query);
    sendSuccess(res, result.sales, 'Sales retrieved', 200, result.meta);
  })
);

// ─── Dynamic routes after all statics ────────────────────────

salesRouter.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const sale = await salesService.getSale(req.user!.orgId!, req.params.id);
    sendSuccess(res, sale, 'Sale retrieved');
  })
);

salesRouter.post(
  '/',
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN, UserRole.CASHIER),
  asyncHandler(async (req: Request, res: Response) => {
    const sale = await salesService.createSale(req.user!.orgId!, req.body, req.user!.userId);

    void triggerWebhooks(req.user!.orgId!, WebhookEvent.SALE_CREATED, {
      saleId: sale._id,
      saleNumber: sale.saleNumber,
      total: sale.total,
      currency: sale.currency,
      paymentMethod: sale.paymentMethod,
      customerId: sale.customerId,
      createdAt: sale.createdAt,
    });

    void triggerWebhooks(req.user!.orgId!, WebhookEvent.PAYMENT_RECEIVED, {
      source: 'sale',
      saleId: sale._id,
      saleNumber: sale.saleNumber,
      amount: sale.total,
      currency: sale.currency,
      paymentMethod: sale.paymentMethod,
      receivedAt: sale.createdAt,
    });

    sendSuccess(res, sale, 'Sale completed', 201);
  })
);

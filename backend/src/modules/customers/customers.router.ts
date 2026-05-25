import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { getTenantDB } from '../../lib/db';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { AppError, asyncHandler, sendSuccess } from '../../middleware/error.middleware';
import { idempotencyMiddleware } from '../../middleware/idempotency.middleware';
import { UserRole, WebhookEvent } from '../../shared/types';
import { getInvoiceModel } from '../invoices/invoice.model';
import { getSaleModel } from '../sales/sale.model';
import { triggerWebhooks } from '../webhooks/webhooks.router';
import { getCustomerModel } from './customer.model';

const customerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

// ─── Service functions ────────────────────────────────────────

async function listCustomers(
  orgId: string,
  opts: { page: number; limit: number; search?: string }
) {
  const { page = 1, limit = 20, search } = opts;
  const db = await getTenantDB(orgId);
  const Customer = getCustomerModel(db);

  const query: Record<string, unknown> = {};
  if (search) query.$text = { $search: search };

  const [customers, total] = await Promise.all([
    Customer.find(query)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Customer.countDocuments(query),
  ]);

  return {
    customers,
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

async function getCustomerWithHistory(orgId: string, customerId: string) {
  const db = await getTenantDB(orgId);
  const Customer = getCustomerModel(db);
  const Invoice = getInvoiceModel(db);
  const Sale = getSaleModel(db);

  const [customer, invoices, sales] = await Promise.all([
    Customer.findById(customerId),
    Invoice.find({ customerId }).sort({ createdAt: -1 }).limit(10),
    Sale.find({ customerId }).sort({ createdAt: -1 }).limit(10),
  ]);

  if (!customer) throw new AppError('Customer not found', 404, 'NOT_FOUND');

  return { customer, invoices, sales };
}

// ─── Router ───────────────────────────────────────────────────

export const customersRouter = Router();
customersRouter.use(authenticate);

customersRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = z
      .object({
        page: z.coerce.number().default(1),
        limit: z.coerce.number().default(20),
        search: z.string().optional(),
      })
      .parse(req.query);

    const result = await listCustomers(req.user!.orgId!, query);
    sendSuccess(res, result.customers, 'Customers retrieved', 200, result.meta);
  })
);

customersRouter.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const result = await getCustomerWithHistory(req.user!.orgId!, req.params.id);
    sendSuccess(res, result, 'Customer retrieved');
  })
);

customersRouter.post(
  '/',
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN, UserRole.CASHIER),
  idempotencyMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const validated = customerSchema.parse(req.body);
    const db = await getTenantDB(req.user!.orgId!);
    const Customer = getCustomerModel(db);
    const customer = await Customer.create(validated);

    void triggerWebhooks(req.user!.orgId!, WebhookEvent.CUSTOMER_CREATED, {
      customerId: customer._id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      createdAt: customer.createdAt,
    });

    sendSuccess(res, customer, 'Customer created', 201);
  })
);

customersRouter.patch(
  '/:id',
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const validated = customerSchema.partial().parse(req.body);
    const db = await getTenantDB(req.user!.orgId!);
    const Customer = getCustomerModel(db);
    const customer = await Customer.findByIdAndUpdate(req.params.id, validated, { new: true });
    if (!customer) throw new AppError('Customer not found', 404, 'NOT_FOUND');
    sendSuccess(res, customer, 'Customer updated');
  })
);

customersRouter.delete(
  '/:id',
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const db = await getTenantDB(req.user!.orgId!);
    const Customer = getCustomerModel(db);
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) throw new AppError('Customer not found', 404, 'NOT_FOUND');
    sendSuccess(res, null, 'Customer deleted');
  })
);

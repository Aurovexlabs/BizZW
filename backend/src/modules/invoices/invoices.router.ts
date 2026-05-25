import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { asyncHandler, sendSuccess } from '../../middleware/error.middleware';
import { idempotencyMiddleware } from '../../middleware/idempotency.middleware';
import { InvoiceStatus, UserRole, WebhookEvent } from '../../shared/types';
import { triggerWebhooks } from '../webhooks/webhooks.router';
import * as invoicesService from './invoices.service';

export const invoicesRouter = Router();
invoicesRouter.use(authenticate);

invoicesRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = z
      .object({
        page: z.coerce.number().default(1),
        limit: z.coerce.number().default(20),
        status: z.nativeEnum(InvoiceStatus).optional(),
        customerId: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
      .parse(req.query);

    const result = await invoicesService.listInvoices(req.user!.orgId!, query);
    sendSuccess(res, result.invoices, 'Invoices retrieved', 200, result.meta);
  })
);

invoicesRouter.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const invoice = await invoicesService.getInvoice(req.user!.orgId!, req.params.id);
    sendSuccess(res, invoice, 'Invoice retrieved');
  })
);

invoicesRouter.post(
  '/',
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN, UserRole.ACCOUNTANT),
  idempotencyMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const invoice = await invoicesService.createInvoice(
      req.user!.orgId!,
      req.body,
      req.user!.userId
    );

    void triggerWebhooks(req.user!.orgId!, WebhookEvent.INVOICE_CREATED, {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      total: invoice.total,
      currency: invoice.currency,
      status: invoice.status,
      dueDate: invoice.dueDate,
      createdAt: invoice.createdAt,
    });

    sendSuccess(res, invoice, 'Invoice created', 201);
  })
);

invoicesRouter.patch(
  '/:id',
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN, UserRole.ACCOUNTANT),
  asyncHandler(async (req: Request, res: Response) => {
    const invoice = await invoicesService.updateInvoice(req.user!.orgId!, req.params.id, req.body);
    sendSuccess(res, invoice, 'Invoice updated');
  })
);

invoicesRouter.post(
  '/:id/send',
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN, UserRole.ACCOUNTANT),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await invoicesService.sendInvoiceEmail(req.user!.orgId!, req.params.id);
    sendSuccess(res, result, 'Invoice sent via email');
  })
);

invoicesRouter.post(
  '/:id/mark-paid',
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN, UserRole.ACCOUNTANT),
  asyncHandler(async (req: Request, res: Response) => {
    const { paynowRef } = z.object({ paynowRef: z.string().optional() }).parse(req.body);
    const invoice = await invoicesService.markInvoicePaid(
      req.user!.orgId!,
      req.params.id,
      paynowRef
    );

    void triggerWebhooks(req.user!.orgId!, WebhookEvent.INVOICE_PAID, {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      total: invoice.total,
      currency: invoice.currency,
      paidAt: invoice.paidAt,
      paynowRef: invoice.paynowRef,
    });

    void triggerWebhooks(req.user!.orgId!, WebhookEvent.PAYMENT_RECEIVED, {
      source: 'invoice',
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.total,
      currency: invoice.currency,
      receivedAt: invoice.paidAt,
      reference: invoice.paynowRef,
    });

    sendSuccess(res, invoice, 'Invoice marked as paid');
  })
);

invoicesRouter.delete(
  '/:id',
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN, UserRole.ACCOUNTANT),
  asyncHandler(async (req: Request, res: Response) => {
    await invoicesService.deleteInvoice(req.user!.orgId!, req.params.id);
    sendSuccess(res, null, 'Invoice deleted');
  })
);

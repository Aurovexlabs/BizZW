import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { asyncHandler, sendSuccess } from '../../middleware/error.middleware';
import { PlanType, UserRole } from '../../shared/types';
import { normalizePaynowPayload, paynowWebhookGuard } from '../../utils/paynow';
import * as subscriptionsService from './subscriptions.service';

export const subscriptionsRouter = Router();

// GET /api/v1/subscriptions — current plan + limits
subscriptionsRouter.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const data = await subscriptionsService.getCurrentSubscription(req.user!.orgId!);
    sendSuccess(res, data, 'Subscription info retrieved');
  })
);

// GET /api/v1/subscriptions/usage — current usage vs limits
subscriptionsRouter.get(
  '/usage',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const usage = await subscriptionsService.checkUsageLimits(req.user!.orgId!);
    sendSuccess(res, usage, 'Usage limits retrieved');
  })
);

// GET /api/v1/subscriptions/billing — billing history
subscriptionsRouter.get(
  '/billing',
  authenticate,
  authorize(UserRole.ORG_OWNER),
  asyncHandler(async (req: Request, res: Response) => {
    const history = await subscriptionsService.getBillingHistory(req.user!.orgId!);
    sendSuccess(res, history, 'Billing history retrieved');
  })
);

// POST /api/v1/subscriptions/upgrade — initiate Paynow payment
subscriptionsRouter.post(
  '/upgrade',
  authenticate,
  authorize(UserRole.ORG_OWNER),
  asyncHandler(async (req: Request, res: Response) => {
    const { plan } = z.object({ plan: z.nativeEnum(PlanType) }).parse(req.body);
    const result = await subscriptionsService.initiateUpgradePayment(req.user!.orgId!, plan);
    sendSuccess(res, result, 'Payment initiated. Redirecting to Paynow.');
  })
);

// POST /api/v1/subscriptions/cancel
subscriptionsRouter.post(
  '/cancel',
  authenticate,
  authorize(UserRole.ORG_OWNER),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await subscriptionsService.cancelSubscription(req.user!.orgId!);
    sendSuccess(res, result, result.message);
  })
);

// POST /api/v1/subscriptions/paynow-callback — Paynow webhook (no auth, verified by hash)
subscriptionsRouter.post(
  '/paynow-callback',
  paynowWebhookGuard,
  asyncHandler(async (req: Request, res: Response) => {
    const rawBody =
      typeof req.body === 'object' && req.body !== null
        ? (req.body as Record<string, unknown>)
        : {};

    const payload = normalizePaynowPayload(rawBody);
    const callback = z
      .object({
        reference: z.string().min(1),
        status: z.string().min(1),
        pollurl: z.string().url().optional(),
        paynowreference: z.string().optional(),
      })
      .parse(payload);

    await subscriptionsService.handlePaynowCallback({
      reference: callback.reference,
      status: callback.status,
      pollUrl: callback.pollurl,
      paynowReference: callback.paynowreference,
    });
    // Paynow expects a 200 plain-text response
    res.status(200).send('OK');
  })
);

// PATCH /api/v1/subscriptions/settings — update business settings
subscriptionsRouter.patch(
  '/settings',
  authenticate,
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const settingsSchema = z.object({
      currency: z.enum(['USD', 'ZiG']).optional(),
      taxRate: z.number().min(0).max(100).optional(),
      businessType: z.string().optional(),
      timezone: z.string().optional(),
      address: z.string().optional(),
      phone: z.string().optional(),
      logo: z.object({ fileId: z.string(), filePath: z.string() }).optional(),
    });
    const settings = settingsSchema.parse(req.body);
    const tenant = await subscriptionsService.updateBusinessSettings(req.user!.orgId!, settings);
    sendSuccess(res, tenant, 'Business settings updated');
  })
);

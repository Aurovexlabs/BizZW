import crypto from 'crypto';
import { Request, Response, Router } from 'express';
import mongoose, { Connection, Document, Schema } from 'mongoose';
import { z } from 'zod';
import { getTenantDB } from '../../lib/db';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { AppError, asyncHandler, sendSuccess } from '../../middleware/error.middleware';
import { UserRole, WebhookEvent } from '../../shared/types';

// ─── Schema ───────────────────────────────────────────────────

interface WebhookDocument extends Document {
  orgId: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  isActive: boolean;
  lastTriggered?: Date;
  failureCount: number;
  createdAt: Date;
}

const WebhookSchema = new Schema<WebhookDocument>(
  {
    orgId: { type: String, required: true, index: true },
    url: { type: String, required: true },
    events: [{ type: String, enum: Object.values(WebhookEvent) }],
    secret: { type: String, required: true, select: false },
    isActive: { type: Boolean, default: true },
    lastTriggered: { type: Date },
    failureCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const webhookModels = new Map<string, mongoose.Model<WebhookDocument>>();

function getWebhookModel(db: Connection) {
  const key = db.name;
  if (!webhookModels.has(key)) {
    webhookModels.set(key, db.model<WebhookDocument>('Webhook', WebhookSchema));
  }
  return webhookModels.get(key)!;
}

// ─── Webhook Delivery Service ─────────────────────────────────

async function deliverWebhook(
  Webhook: mongoose.Model<WebhookDocument>,
  webhook: WebhookDocument,
  event: WebhookEvent,
  payload: Record<string, unknown>
) {
  const timestamp = new Date().toISOString();
  const body = JSON.stringify({ event, data: payload, timestamp });
  const signature = crypto.createHmac('sha256', webhook.secret).update(body).digest('hex');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BizZW-Event': event,
        'X-BizZW-Signature': `sha256=${signature}`,
        'X-BizZW-Timestamp': timestamp,
        'User-Agent': 'BizZW-Webhooks/1.0',
      },
      body,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const nextFailureCount = res.ok ? 0 : webhook.failureCount + 1;
    await Webhook.findByIdAndUpdate(webhook._id, {
      lastTriggered: new Date(),
      failureCount: nextFailureCount,
      ...(nextFailureCount >= 10 ? { isActive: false } : {}),
    });
  } catch {
    const nextFailureCount = webhook.failureCount + 1;
    await Webhook.findByIdAndUpdate(webhook._id, {
      failureCount: nextFailureCount,
      ...(nextFailureCount >= 10 ? { isActive: false } : {}),
    });
  }
}

export async function triggerWebhooks(
  orgId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
) {
  try {
    const db = await getTenantDB(orgId);
    const Webhook = getWebhookModel(db);

    const webhooks = await Webhook.find({ orgId, isActive: true, events: event }).select('+secret');
    if (!webhooks.length) return;

    await Promise.allSettled(
      webhooks.map((webhook) => deliverWebhook(Webhook, webhook, event, payload))
    );
  } catch {
    // Never let webhook delivery block main operations
  }
}

export async function sendTestWebhook(orgId: string, webhookId: string) {
  const db = await getTenantDB(orgId);
  const Webhook = getWebhookModel(db);
  const webhook = await Webhook.findOne({ _id: webhookId, orgId }).select('+secret');
  if (!webhook) throw new AppError('Webhook not found', 404, 'NOT_FOUND');

  const event = webhook.events[0] || WebhookEvent.SALE_CREATED;
  await deliverWebhook(Webhook, webhook, event, {
    test: true,
    message: 'This is a test webhook from BizZW',
    orgId,
  });

  return { event };
}

// ─── Router ───────────────────────────────────────────────────

export const webhooksRouter = Router();
webhooksRouter.use(authenticate);
webhooksRouter.use(authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN));

// GET /api/v1/webhooks
webhooksRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const db = await getTenantDB(req.user!.orgId!);
    const Webhook = getWebhookModel(db);
    const webhooks = await Webhook.find({ orgId: req.user!.orgId });
    sendSuccess(res, webhooks, 'Webhooks retrieved');
  })
);

// POST /api/v1/webhooks
webhooksRouter.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { url, events } = z
      .object({
        url: z.string().url(),
        events: z.array(z.nativeEnum(WebhookEvent)).min(1),
      })
      .parse(req.body);

    const db = await getTenantDB(req.user!.orgId!);
    const Webhook = getWebhookModel(db);

    const secret = crypto.randomBytes(32).toString('hex');
    const webhook = await Webhook.create({
      orgId: req.user!.orgId,
      url,
      events,
      secret,
      isActive: true,
      failureCount: 0,
    });

    sendSuccess(
      res,
      {
        ...webhook.toObject(),
        secret, // only returned on creation
      },
      'Webhook created',
      201
    );
  })
);

// PATCH /api/v1/webhooks/:id
webhooksRouter.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { url, events, isActive } = z
      .object({
        url: z.string().url().optional(),
        events: z.array(z.nativeEnum(WebhookEvent)).optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);

    const db = await getTenantDB(req.user!.orgId!);
    const Webhook = getWebhookModel(db);
    const webhook = await Webhook.findOneAndUpdate(
      { _id: req.params.id, orgId: req.user!.orgId },
      {
        ...(url && { url }),
        ...(events && { events }),
        ...(isActive !== undefined && { isActive, failureCount: 0 }),
      },
      { new: true }
    );
    if (!webhook) throw new AppError('Webhook not found', 404, 'NOT_FOUND');
    sendSuccess(res, webhook, 'Webhook updated');
  })
);

// DELETE /api/v1/webhooks/:id
webhooksRouter.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const db = await getTenantDB(req.user!.orgId!);
    const Webhook = getWebhookModel(db);
    await Webhook.findOneAndDelete({ _id: req.params.id, orgId: req.user!.orgId });
    sendSuccess(res, null, 'Webhook deleted');
  })
);

// POST /api/v1/webhooks/:id/test — send a test event
webhooksRouter.post(
  '/:id/test',
  asyncHandler(async (req: Request, res: Response) => {
    const result = await sendTestWebhook(req.user!.orgId!, req.params.id);
    sendSuccess(res, result, 'Test webhook sent');
  })
);

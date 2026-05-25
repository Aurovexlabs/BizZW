import {
  contactAutoReplyTemplate,
  contactTeamNotificationTemplate,
  sendEmail,
} from '../../lib/resend';
import { asyncHandler, sendSuccess } from '../../middleware/error.middleware';

import { randomUUID } from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { idempotencyMiddleware } from '../../middleware/idempotency.middleware';
import { contactRateLimiter } from '../../middleware/rateLimiter.middleware';
import { validateBody } from '../../utils/validation';

const contactPayloadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  company: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(60).optional(),
  topic: z
    .enum(['sales', 'support', 'partnership', 'security', 'billing', 'general'])
    .optional()
    .default('general'),
  message: z.string().trim().min(12).max(2500),
  hp: z.string().max(0).optional(),
});

export const publicRouter = Router();

function toNumberOrDefault(rawValue: string | undefined, fallback: number): number {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

publicRouter.get(
  '/runtime-config',
  asyncHandler(async (req, res) => {
    const inferredApiBaseUrl = `${req.protocol}://${req.get('host')}`;

    const runtimeConfig = {
      appName: process.env.APP_NAME || 'BizZW',
      apiBaseUrl: process.env.PUBLIC_API_BASE_URL || inferredApiBaseUrl,
      apiVersionPath: '/api/v1',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@bizzw.dev',
      imagekit: {
        urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || '',
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
      },
      sentry: {
        dsn: process.env.CLIENT_SENTRY_DSN || process.env.SENTRY_DSN || '',
        tracesSampleRate: toNumberOrDefault(process.env.CLIENT_SENTRY_TRACES_SAMPLE_RATE, 0.1),
      },
      environment: process.env.NODE_ENV || 'development',
      generatedAt: new Date().toISOString(),
    };

    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    sendSuccess(res, runtimeConfig, 'Runtime config fetched successfully');
  })
);

publicRouter.post(
  '/contact',
  idempotencyMiddleware(),
  contactRateLimiter,
  validateBody(contactPayloadSchema),
  asyncHandler(async (req, res) => {
    const { name, email, company, phone, topic, message, hp } = req.body;

    // Honeypot trap: silently accept bot submissions without sending emails.
    if (hp) {
      sendSuccess(res, { accepted: true }, 'Message received');
      return;
    }

    const ticketId = `CT-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const submittedAtIso = new Date().toISOString();

    const supportInbox = process.env.SUPPORT_EMAIL || 'support@bizzw.dev';

    await Promise.all([
      sendEmail({
        to: supportInbox,
        subject: `[BizZW Contact] ${ticketId} • ${topic.toUpperCase()}`,
        html: contactTeamNotificationTemplate({
          ticketId,
          name,
          email,
          company,
          phone,
          topic,
          message,
          submittedAtIso,
        }),
      }),
      sendEmail({
        to: email,
        subject: `We received your BizZW message (${ticketId})`,
        html: contactAutoReplyTemplate({
          ticketId,
          name,
          topic,
        }),
      }),
    ]);

    sendSuccess(
      res,
      {
        ticketId,
        expectedResponseWindow: 'within 1 business day',
      },
      'Message received successfully',
      201
    );
  })
);

import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';

export type PaynowPayload = Record<string, string>;

export function normalizePaynowPayload(rawData: Record<string, unknown>): PaynowPayload {
  const normalized: PaynowPayload = {};

  for (const [key, value] of Object.entries(rawData)) {
    normalized[key.toLowerCase()] = value == null ? '' : String(value);
  }

  return normalized;
}

/**
 * Verifies a Paynow webhook request by checking the hash signature.
 * Paynow sends a SHA512 hash of all the response fields + integration key.
 */
export function verifyPaynowHash(data: PaynowPayload, integrationKey: string): boolean {
  const received = data.hash;
  if (!received) return false;

  // Paynow docs require concatenating inbound values in message order.
  const fields = Object.entries(data)
    .filter(([key]) => key !== 'hash')
    .map(([, value]) => value)
    .join('');

  const computed = crypto
    .createHash('sha512')
    .update(fields + integrationKey)
    .digest('hex')
    .toUpperCase();

  const normalizedReceived = received.toUpperCase();
  if (normalizedReceived.length !== computed.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(normalizedReceived));
}

/**
 * Express middleware that validates Paynow webhook signatures.
 * Only applies to the Paynow callback route.
 */
export function paynowWebhookGuard(req: Request, res: Response, next: NextFunction): void {
  const integrationKey = process.env.PAYNOW_INTEGRATION_KEY;
  if (!integrationKey) {
    res.status(503).json({
      success: false,
      message: 'Paynow webhook verification unavailable. Integration key is not configured.',
      errorCode: 'PAYNOW_NOT_CONFIGURED',
    });
    return;
  }

  const rawBody =
    typeof req.body === 'object' && req.body !== null ? (req.body as Record<string, unknown>) : {};

  const data = normalizePaynowPayload(rawBody);
  if (!verifyPaynowHash(data, integrationKey)) {
    res.status(400).json({
      success: false,
      message: 'Invalid Paynow webhook signature',
    });
    return;
  }

  next();
}

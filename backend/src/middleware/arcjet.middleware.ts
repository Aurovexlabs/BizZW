import arcjet, { detectBot, shield, tokenBucket } from '@arcjet/node';
import { NextFunction, Request, Response } from 'express';

import { logger } from '../lib/logger';

function isSystemStatusRoute(pathname: string): boolean {
  return pathname.endsWith('/system/status') || pathname.endsWith('/system/jobs/history');
}

function createArcjetClient(key: string) {
  return arcjet({
    key,
    characteristics: ['ip.src'],
    rules: [
      shield({ mode: 'LIVE' }),
      detectBot({ mode: 'LIVE', allow: ['CATEGORY:SEARCH_ENGINE'] }),
      tokenBucket({ mode: 'LIVE', refillRate: 30, interval: '1m', capacity: 120 }),
    ],
  });
}

let arcjetClient: ReturnType<typeof createArcjetClient> | null = null;

function shouldBypassArcjet(req: Request): boolean {
  const requestPath = req.originalUrl.split('?')[0] || req.url.split('?')[0] || req.path;

  if (req.method === 'POST' && requestPath.endsWith('/subscriptions/paynow-callback')) {
    return true;
  }

  // Public status endpoints are used for health checks and should never be denied by bot heuristics.
  return req.method === 'GET' && isSystemStatusRoute(requestPath);
}

function getArcjetClient(): ReturnType<typeof createArcjetClient> | null {
  const key = process.env.ARCJET_KEY;
  if (!key) {
    return null;
  }

  if (!arcjetClient) {
    arcjetClient = createArcjetClient(key);
  }

  return arcjetClient;
}

export async function arcjetMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (shouldBypassArcjet(req)) {
    next();
    return;
  }

  const client = getArcjetClient();
  if (!client) {
    next();
    return;
  }

  try {
    const decision = await client.protect(req, { requested: 1 });
    if (decision.isDenied()) {
      const isRateLimit = decision.reason.isRateLimit();
      res.status(isRateLimit ? 429 : 403).json({
        success: false,
        message: isRateLimit
          ? 'Too many requests, please try again later.'
          : 'Request blocked by security policy.',
        errorCode: isRateLimit ? 'RATE_LIMITED' : 'REQUEST_BLOCKED',
      });
      return;
    }
  } catch (error) {
    // Fail open to prevent Arcjet network errors from causing outages.
    logger.warn({ err: error }, 'Arcjet check failed; allowing request');
  }

  next();
}

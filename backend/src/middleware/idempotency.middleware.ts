import { NextFunction, Request, Response } from 'express';

import { createHash } from 'crypto';
import { getIdempotencyStore } from '../lib/idempotency-store';
import { logger } from '../lib/logger';
import { AppError } from './error.middleware';

interface IdempotencyOptions {
  ttlMs?: number;
  methods?: string[];
}

const IDEMPOTENCY_KEY_HEADER = 'x-idempotency-key';
const IDEMPOTENCY_REPLAY_HEADER = 'x-idempotency-replayed';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
const MAX_KEY_LENGTH = 128;
const MAX_STORED_PAYLOAD_BYTES = 128 * 1024;
const idempotencyStore = getIdempotencyStore();

function normalizeForHash(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeForHash(item));
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );

    return Object.fromEntries(entries.map(([key, nested]) => [key, normalizeForHash(nested)]));
  }

  return value;
}

function safeSerialize(input: unknown): string {
  try {
    return JSON.stringify(normalizeForHash(input));
  } catch {
    return String(input);
  }
}

function buildRequestFingerprint(req: Request): string {
  const routePath = req.originalUrl.split('?')[0];
  const method = req.method.toUpperCase();

  const scope = {
    orgId: req.user?.orgId || 'public',
    userId: req.user?.userId || req.ip || 'anonymous',
  };

  const scopeHash = createHash('sha256').update(safeSerialize(scope)).digest('hex');
  const bodyHash = createHash('sha256')
    .update(safeSerialize(req.body || {}))
    .digest('hex');

  return `${scopeHash}:${method}:${routePath}:${bodyHash}`;
}

function shouldPersistResponse(statusCode: number): boolean {
  return statusCode >= 200 && statusCode < 500;
}

export function idempotencyMiddleware(options: IdempotencyOptions = {}) {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const methods = new Set(
    (options.methods || DEFAULT_METHODS).map((method) => method.toUpperCase())
  );

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!methods.has(req.method.toUpperCase())) {
      next();
      return;
    }

    const rawKey = req.header(IDEMPOTENCY_KEY_HEADER);
    if (!rawKey) {
      next();
      return;
    }

    const key = rawKey.trim();
    if (!key || key.length > MAX_KEY_LENGTH) {
      next(new AppError('Invalid idempotency key', 400, 'INVALID_IDEMPOTENCY_KEY'));
      return;
    }

    const createdAt = Date.now();
    const fingerprint = buildRequestFingerprint(req);
    let reserved = false;

    try {
      reserved = await idempotencyStore.reservePending(key, fingerprint, ttlMs);
    } catch (error) {
      logger.error(
        { err: error, key, route: req.originalUrl },
        'Could not reserve idempotency key. Continuing without replay cache.'
      );
      next();
      return;
    }

    if (!reserved) {
      const existing = await idempotencyStore.get(key);

      if (!existing) {
        next(
          new AppError(
            'Idempotency key is temporarily unavailable. Please retry the request.',
            409,
            'IDEMPOTENCY_KEY_UNAVAILABLE'
          )
        );
        return;
      }

      if (existing.fingerprint !== fingerprint) {
        next(
          new AppError(
            'Idempotency key has already been used with a different request payload',
            409,
            'IDEMPOTENCY_KEY_CONFLICT'
          )
        );
        return;
      }

      if (existing.state === 'pending') {
        next(
          new AppError(
            'A request with this idempotency key is still being processed',
            409,
            'IDEMPOTENCY_KEY_IN_PROGRESS'
          )
        );
        return;
      }

      res.setHeader(IDEMPOTENCY_REPLAY_HEADER, '1');
      res.status(existing.statusCode).json(existing.payload);
      return;
    }

    const originalJson = res.json.bind(res);
    let finalized = false;

    const finalizeAsReleased = () => {
      if (finalized) {
        return;
      }

      finalized = true;
      void idempotencyStore.release(key, fingerprint).catch((error) => {
        logger.warn(
          { err: error, key, route: req.originalUrl },
          'Failed to release pending idempotency key'
        );
      });
    };

    const finalizeAsCompleted = (body: unknown, statusCode: number) => {
      if (finalized) {
        return;
      }

      finalized = true;

      void idempotencyStore
        .complete(key, {
          fingerprint,
          statusCode,
          payload: body,
          ttlMs,
          createdAt,
        })
        .catch((error) => {
          logger.warn(
            { err: error, key, route: req.originalUrl },
            'Failed to persist idempotent response'
          );
          void idempotencyStore.release(key, fingerprint).catch(() => undefined);
        });
    };

    res.json = ((body: unknown) => {
      if (!finalized && shouldPersistResponse(res.statusCode)) {
        const serialized = safeSerialize(body);
        const payloadSize = Buffer.byteLength(serialized, 'utf8');

        if (payloadSize <= MAX_STORED_PAYLOAD_BYTES) {
          finalizeAsCompleted(body, res.statusCode);
        } else {
          logger.warn(
            {
              key,
              payloadSize,
              maxBytes: MAX_STORED_PAYLOAD_BYTES,
              route: req.originalUrl,
            },
            'Skipping idempotency response persistence because payload is too large'
          );
          finalizeAsReleased();
        }
      } else {
        finalizeAsReleased();
      }

      return originalJson(body);
    }) as Response['json'];

    res.on('close', () => {
      finalizeAsReleased();
    });

    next();
  };
}

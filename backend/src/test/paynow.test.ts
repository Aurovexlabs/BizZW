import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { normalizePaynowPayload, paynowWebhookGuard, verifyPaynowHash } from '../utils/paynow';

function buildHash(valuesInOrder: string[], integrationKey: string): string {
  return crypto
    .createHash('sha512')
    .update(`${valuesInOrder.join('')}${integrationKey}`)
    .digest('hex')
    .toUpperCase();
}

describe('Paynow utilities', () => {
  it('normalizes callback keys to lowercase strings', () => {
    const normalized = normalizePaynowPayload({
      Reference: 'INV-100',
      Status: 'Paid',
      Amount: 12.34,
    });

    expect(normalized).toEqual({
      reference: 'INV-100',
      status: 'Paid',
      amount: '12.34',
    });
  });

  it('verifies Paynow hash using inbound field order', () => {
    const integrationKey = 'test_key';
    const payload = {
      status: 'Paid',
      pollurl: 'https://paynow.example/poll/abc',
      reference: 'INV-100',
    };

    const hash = buildHash([payload.status, payload.pollurl, payload.reference], integrationKey);

    expect(verifyPaynowHash({ ...payload, hash }, integrationKey)).toBe(true);
  });

  it('rejects hash when field order does not match inbound payload order', () => {
    const integrationKey = 'test_key';

    const hashFromDifferentOrder = buildHash(
      ['INV-100', 'Paid', 'https://paynow.example/poll/abc'],
      integrationKey
    );

    const payload = {
      status: 'Paid',
      pollurl: 'https://paynow.example/poll/abc',
      reference: 'INV-100',
      hash: hashFromDifferentOrder,
    };

    expect(verifyPaynowHash(payload, integrationKey)).toBe(false);
  });

  it('webhook guard fails closed when integration key is missing', () => {
    const previous = process.env.PAYNOW_INTEGRATION_KEY;
    delete process.env.PAYNOW_INTEGRATION_KEY;

    const req = { body: {} } as Request;
    const status = vi.fn().mockReturnThis();
    const json = vi.fn().mockReturnThis();
    const res = { status, json } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    paynowWebhookGuard(req, res, next);

    expect(status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();

    if (previous) {
      process.env.PAYNOW_INTEGRATION_KEY = previous;
    }
  });

  it('webhook guard accepts valid signatures with mixed-case payload keys', () => {
    const previous = process.env.PAYNOW_INTEGRATION_KEY;
    const integrationKey = 'test_key';
    process.env.PAYNOW_INTEGRATION_KEY = integrationKey;

    const payload = {
      Status: 'Paid',
      Reference: 'INV-101',
      PollUrl: 'https://paynow.example/poll/xyz',
    };

    const hash = buildHash([payload.Status, payload.Reference, payload.PollUrl], integrationKey);

    const req = {
      body: {
        ...payload,
        Hash: hash,
      },
    } as unknown as Request;

    const status = vi.fn().mockReturnThis();
    const json = vi.fn().mockReturnThis();
    const res = { status, json } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    paynowWebhookGuard(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(status).not.toHaveBeenCalled();

    if (previous) {
      process.env.PAYNOW_INTEGRATION_KEY = previous;
    } else {
      delete process.env.PAYNOW_INTEGRATION_KEY;
    }
  });
});

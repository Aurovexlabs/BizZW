import { afterEach, describe, expect, it, vi } from 'vitest';

import request from 'supertest';
import app from '../app';
import { WebhookEvent } from '../shared/types';

const skipIfNoMongo = process.env.RUN_MONGO_TESTS === '1' ? describe : describe.skip;

skipIfNoMongo('API Keys + Webhooks', () => {
  const testBusiness = {
    businessName: 'Integrations Test Store',
    ownerName: 'Integration Owner',
    email: 'integrations@teststore.co.zw',
    password: 'SecurePass123!',
  };

  async function registerAndLogin() {
    const res = await request(app).post('/api/v1/auth/register').send(testBusiness).expect(201);
    return res.body.data.accessToken as string;
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows API key read access but blocks missing write permission', async () => {
    const accessToken = await registerAndLogin();

    await request(app)
      .post('/api/v1/inventory')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Existing Product',
        sku: 'EXIST-001',
        category: 'General',
        costPrice: 2,
        sellPrice: 4,
        quantity: 20,
      })
      .expect(201);

    const keyRes = await request(app)
      .post('/api/v1/api-keys')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Inventory Read Key',
        permissions: ['inventory:read'],
      })
      .expect(201);

    const apiKey = keyRes.body.data.key as string;
    expect(apiKey.startsWith('bz_live_')).toBe(true);

    await request(app)
      .get('/api/v1/inventory')
      .set('Authorization', `Bearer ${apiKey}`)
      .expect(200);

    const writeRes = await request(app)
      .post('/api/v1/inventory')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        name: 'Should Fail',
        sku: 'FAIL-001',
        category: 'General',
        costPrice: 1,
        sellPrice: 2,
        quantity: 5,
      })
      .expect(403);

    expect(writeRes.body.errorCode).toBe('API_KEY_PERMISSION_DENIED');
  });

  it('sends test webhook only to the selected webhook endpoint', async () => {
    const accessToken = await registerAndLogin();

    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const wh1 = await request(app)
      .post('/api/v1/webhooks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        url: 'https://example.com/first',
        events: [WebhookEvent.SALE_CREATED],
      })
      .expect(201);

    const wh2 = await request(app)
      .post('/api/v1/webhooks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        url: 'https://example.com/second',
        events: [WebhookEvent.CUSTOMER_CREATED],
      })
      .expect(201);

    const testRes = await request(app)
      .post(`/api/v1/webhooks/${wh2.body.data._id}/test`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(testRes.body.data.event).toBe(WebhookEvent.CUSTOMER_CREATED);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [targetUrl, init] = fetchMock.mock.calls[0] as [
      string,
      { headers?: Record<string, string> },
    ];
    expect(targetUrl).toBe('https://example.com/second');
    expect(init.headers?.['X-BizZW-Signature']).toContain('sha256=');

    await request(app)
      .post(`/api/v1/webhooks/${wh1.body.data._id}/test`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('emits sale.created and payment.received webhook events on POS sale', async () => {
    const accessToken = await registerAndLogin();

    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const productRes = await request(app)
      .post('/api/v1/inventory')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Webhook Product',
        sku: 'WH-PRD-001',
        category: 'General',
        costPrice: 3,
        sellPrice: 6,
        quantity: 25,
      })
      .expect(201);

    await request(app)
      .post('/api/v1/webhooks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        url: 'https://example.com/sales-webhook',
        events: [WebhookEvent.SALE_CREATED, WebhookEvent.PAYMENT_RECEIVED],
      })
      .expect(201);

    await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        items: [{ productId: productRes.body.data._id, quantity: 2 }],
        discount: 0,
        currency: 'USD',
        paymentMethod: 'CASH',
        amountPaid: 12,
      })
      .expect(201);

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const events = fetchMock.mock.calls.map(([, init]) => {
      const headers = init?.headers as Record<string, string> | undefined;
      return headers?.['X-BizZW-Event'];
    });

    expect(events).toContain(WebhookEvent.SALE_CREATED);
    expect(events).toContain(WebhookEvent.PAYMENT_RECEIVED);
  });
});

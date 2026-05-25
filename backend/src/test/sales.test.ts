import mongoose from 'mongoose';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../app';

const skipIfNoMongo = process.env.RUN_MONGO_TESTS === '1' ? describe : describe.skip;

skipIfNoMongo('Sales / POS Module', () => {
  let accessToken: string;
  let productId: string;

  const testBusiness = {
    businessName: 'POS Test Store',
    ownerName: 'Cashier Boss',
    email: 'pos@teststore.co.zw',
    password: 'SecurePass123!',
  };

  beforeEach(async () => {
    // Register business
    const regRes = await request(app).post('/api/v1/auth/register').send(testBusiness);
    accessToken = regRes.body.data.accessToken;

    // Create a product
    const prodRes = await request(app)
      .post('/api/v1/inventory')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Test Widget',
        sku: 'WIDGET-001',
        category: 'Widgets',
        costPrice: 5.0,
        sellPrice: 10.0,
        quantity: 50,
        lowStockThreshold: 5,
      });
    productId = prodRes.body.data._id;
  });

  describe('POST /api/v1/sales', () => {
    it('creates a sale and deducts stock', async () => {
      const saleData = {
        items: [{ productId, quantity: 3 }],
        discount: 0,
        currency: 'USD',
        paymentMethod: 'CASH',
        amountPaid: 30.0,
      };

      const res = await request(app)
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(saleData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(30.0);
      expect(res.body.data.change).toBe(0);
      expect(res.body.data.saleNumber).toMatch(/^SALE-/);
      expect(res.body.data.receiptNumber).toMatch(/^RCP-/);

      // Verify stock was deducted
      const productRes = await request(app)
        .get(`/api/v1/inventory/${productId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(productRes.body.data.quantity).toBe(47); // 50 - 3
    });

    it('calculates change correctly', async () => {
      const res = await request(app)
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          items: [{ productId, quantity: 2 }],
          discount: 0,
          currency: 'USD',
          paymentMethod: 'CASH',
          amountPaid: 25.0, // Total is $20, paid $25
        })
        .expect(201);

      expect(res.body.data.total).toBe(20.0);
      expect(res.body.data.change).toBe(5.0);
    });

    it('applies discounts correctly', async () => {
      const res = await request(app)
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          items: [{ productId, quantity: 2 }], // $20
          discount: 5.0,
          currency: 'USD',
          paymentMethod: 'ECOCASH',
          amountPaid: 15.0,
        })
        .expect(201);

      expect(res.body.data.subtotal).toBe(20.0);
      expect(res.body.data.discount).toBe(5.0);
      expect(res.body.data.total).toBe(15.0);
    });

    it('rejects insufficient stock', async () => {
      const res = await request(app)
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          items: [{ productId, quantity: 999 }],
          discount: 0,
          currency: 'USD',
          paymentMethod: 'CASH',
          amountPaid: 9990.0,
        })
        .expect(400);

      expect(res.body.errorCode).toBe('INSUFFICIENT_STOCK');
    });

    it('rejects underpayment', async () => {
      const res = await request(app)
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          items: [{ productId, quantity: 5 }], // $50
          discount: 0,
          currency: 'USD',
          paymentMethod: 'CASH',
          amountPaid: 20.0, // Not enough
        })
        .expect(400);

      expect(res.body.errorCode).toBe('INSUFFICIENT_PAYMENT');
    });

    it('rejects non-existent product', async () => {
      const res = await request(app)
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          items: [{ productId: new mongoose.Types.ObjectId().toString(), quantity: 1 }],
          discount: 0,
          currency: 'USD',
          paymentMethod: 'CASH',
          amountPaid: 10,
        })
        .expect(404);

      expect(res.body.errorCode).toBe('PRODUCT_NOT_FOUND');
    });
  });

  describe('GET /api/v1/sales', () => {
    beforeEach(async () => {
      // Create two sales
      for (let i = 0; i < 2; i++) {
        await request(app)
          .post('/api/v1/sales')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            items: [{ productId, quantity: 1 }],
            discount: 0,
            currency: 'USD',
            paymentMethod: 'CASH',
            amountPaid: 10.0,
          });
      }
    });

    it('returns sales list with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.total).toBe(2);
    });
  });

  describe('GET /api/v1/sales/today', () => {
    it('returns today summary', async () => {
      await request(app)
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          items: [{ productId, quantity: 2 }],
          discount: 0,
          currency: 'USD',
          paymentMethod: 'ECOCASH',
          amountPaid: 20,
        });

      const res = await request(app)
        .get('/api/v1/sales/today')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.totalRevenue).toBe(20);
      expect(res.body.data.totalTransactions).toBe(1);
      expect(res.body.data.byMethod.ECOCASH).toBe(20);
    });
  });

  describe('GET /api/v1/sales/search-products', () => {
    it('finds products by name', async () => {
      const res = await request(app)
        .get('/api/v1/sales/search-products?q=widget')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Test Widget');
    });

    it('finds products by SKU', async () => {
      const res = await request(app)
        .get('/api/v1/sales/search-products?q=WIDGET-001')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
    });
  });
});

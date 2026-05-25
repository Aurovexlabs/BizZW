import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../app';

const skipIfNoMongo = process.env.RUN_MONGO_TESTS === '1' ? describe : describe.skip;

skipIfNoMongo('Inventory Module', () => {
  let accessToken: string;

  const testBusiness = {
    businessName: 'Test Store',
    ownerName: 'Test Owner',
    email: 'owner@teststore.co.zw',
    password: 'SecurePass123!',
  };

  const testProduct = {
    name: 'Coca-Cola 500ml',
    sku: 'COKE-500ML',
    category: 'Beverages',
    costPrice: 0.8,
    sellPrice: 1.2,
    quantity: 100,
    lowStockThreshold: 10,
  };

  beforeEach(async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testBusiness);
    accessToken = res.body.data.accessToken;
  });

  describe('POST /api/v1/inventory', () => {
    it('creates a product successfully', async () => {
      const res = await request(app)
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testProduct)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(testProduct.name);
      expect(res.body.data.sku).toBe(testProduct.sku.toUpperCase());
      expect(res.body.data.quantity).toBe(testProduct.quantity);
      // Initial stock creates a history entry
      expect(res.body.data.stockHistory).toHaveLength(1);
      expect(res.body.data.stockHistory[0].type).toBe('IN');
    });

    it('rejects duplicate SKU', async () => {
      await request(app)
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testProduct);

      const res = await request(app)
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...testProduct, name: 'Different Name' })
        .expect(409);

      expect(res.body.errorCode).toBe('DUPLICATE_SKU');
    });

    it('requires authentication', async () => {
      await request(app).post('/api/v1/inventory').send(testProduct).expect(401);
    });
  });

  describe('GET /api/v1/inventory', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testProduct);
    });

    it('returns paginated product list', async () => {
      const res = await request(app)
        .get('/api/v1/inventory')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.total).toBe(1);
    });

    it('filters by search query', async () => {
      // Add a second product
      await request(app)
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...testProduct, name: 'Pepsi 500ml', sku: 'PEPSI-500ML' });

      const res = await request(app)
        .get('/api/v1/inventory?search=coca')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe(testProduct.name);
    });

    it('filters low stock products', async () => {
      // Create a low stock product
      await request(app)
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...testProduct, sku: 'LOW-SKU', quantity: 3, lowStockThreshold: 5 });

      const res = await request(app)
        .get('/api/v1/inventory?lowStock=true')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].sku).toBe('LOW-SKU');
    });
  });

  describe('POST /api/v1/inventory/:id/stock-adjust', () => {
    let productId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testProduct);
      productId = res.body.data._id;
    });

    it('adds stock successfully', async () => {
      const res = await request(app)
        .post(`/api/v1/inventory/${productId}/stock-adjust`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: 'IN', quantity: 50, reason: 'New delivery' })
        .expect(200);

      expect(res.body.data.quantity).toBe(testProduct.quantity + 50);
    });

    it('removes stock successfully', async () => {
      const res = await request(app)
        .post(`/api/v1/inventory/${productId}/stock-adjust`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: 'OUT', quantity: 20, reason: 'Damaged goods' })
        .expect(200);

      expect(res.body.data.quantity).toBe(testProduct.quantity - 20);
    });

    it('prevents stock going negative', async () => {
      const res = await request(app)
        .post(`/api/v1/inventory/${productId}/stock-adjust`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: 'OUT', quantity: 999, reason: 'Over-removal' })
        .expect(400);

      expect(res.body.errorCode).toBe('INSUFFICIENT_STOCK');
    });
  });

  describe('GET /api/v1/inventory/low-stock', () => {
    it('returns products below threshold', async () => {
      await request(app)
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...testProduct, sku: 'LOWQ', quantity: 2, lowStockThreshold: 10 });

      const res = await request(app)
        .get('/api/v1/inventory/low-stock')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].quantity).toBeLessThanOrEqual(res.body.data[0].lowStockThreshold);
    });
  });

  describe('DELETE /api/v1/inventory/:id', () => {
    it('soft-deletes a product', async () => {
      const createRes = await request(app)
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testProduct);

      const productId = createRes.body.data._id;

      await request(app)
        .delete(`/api/v1/inventory/${productId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Product should not appear in list (isActive: false)
      const listRes = await request(app)
        .get('/api/v1/inventory')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(listRes.body.data.find((p: { _id: string }) => p._id === productId)).toBeUndefined();
    });
  });
});

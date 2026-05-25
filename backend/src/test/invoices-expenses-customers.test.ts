import mongoose from 'mongoose';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../app';

const skipIfNoMongo = process.env.RUN_MONGO_TESTS === '1' ? describe : describe.skip;

skipIfNoMongo('Invoices Module', () => {
  let accessToken: string;
  let customerId: string;

  const testBusiness = {
    businessName: 'Invoice Test Co',
    ownerName: 'Invoice Owner',
    email: 'invoices@testco.co.zw',
    password: 'SecurePass123!',
  };

  beforeEach(async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send(testBusiness);
    accessToken = regRes.body.data.accessToken;

    const custRes = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Test Customer', email: 'customer@test.com', phone: '+263771234567' });
    customerId = custRes.body.data._id;
  });

  describe('POST /api/v1/invoices', () => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    it('creates an invoice with correct totals', async () => {
      const res = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          customerId,
          lineItems: [
            { productId: 'prod1', productName: 'Widget A', quantity: 2, unitPrice: 15.0 },
            { productId: 'prod2', productName: 'Widget B', quantity: 1, unitPrice: 25.0 },
          ],
          taxRate: 15,
          discount: 5,
          currency: 'USD',
          dueDate: dueDate.toISOString(),
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.subtotal).toBe(55.0); // 2×15 + 1×25
      expect(res.body.data.tax).toBeCloseTo(8.25, 2); // 15% of 55
      expect(res.body.data.discount).toBe(5.0);
      expect(res.body.data.total).toBeCloseTo(58.25, 2); // 55 + 8.25 - 5
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.invoiceNumber).toMatch(/^INV-\d{4}-\d{4}$/);
    });

    it('rejects invoice with non-existent customer', async () => {
      const res = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          customerId: new mongoose.Types.ObjectId().toString(),
          lineItems: [{ productId: 'p1', productName: 'Item', quantity: 1, unitPrice: 10 }],
          taxRate: 0,
          discount: 0,
          currency: 'USD',
          dueDate: dueDate.toISOString(),
        })
        .expect(404);

      expect(res.body.errorCode).toBe('CUSTOMER_NOT_FOUND');
    });
  });

  describe('POST /api/v1/invoices/:id/mark-paid', () => {
    it('marks an invoice as paid', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const createRes = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          customerId,
          lineItems: [{ productId: 'p1', productName: 'Test', quantity: 1, unitPrice: 50 }],
          taxRate: 0,
          discount: 0,
          currency: 'USD',
          dueDate: dueDate.toISOString(),
        });

      const invoiceId = createRes.body.data._id;

      const paidRes = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/mark-paid`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(200);

      expect(paidRes.body.data.status).toBe('PAID');
      expect(paidRes.body.data.paidAt).toBeTruthy();
    });

    it('prevents double-paying an invoice', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const createRes = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          customerId,
          lineItems: [{ productId: 'p1', productName: 'Test', quantity: 1, unitPrice: 50 }],
          taxRate: 0,
          discount: 0,
          currency: 'USD',
          dueDate: dueDate.toISOString(),
        });

      const invoiceId = createRes.body.data._id;
      await request(app)
        .post(`/api/v1/invoices/${invoiceId}/mark-paid`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      const res = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/mark-paid`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);

      expect(res.body.errorCode).toBe('ALREADY_PAID');
    });
  });

  describe('DELETE /api/v1/invoices/:id', () => {
    it('deletes a DRAFT invoice', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      const createRes = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          customerId,
          lineItems: [{ productId: 'p1', productName: 'Test', quantity: 1, unitPrice: 10 }],
          taxRate: 0,
          discount: 0,
          currency: 'USD',
          dueDate: dueDate.toISOString(),
        });
      const invoiceId = createRes.body.data._id;

      await request(app)
        .delete(`/api/v1/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify gone
      await request(app)
        .get(`/api/v1/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});

skipIfNoMongo('Expenses Module', () => {
  let accessToken: string;

  beforeEach(async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send({
      businessName: 'Expense Test Co',
      ownerName: 'Expense Owner',
      email: 'expenses@testco.co.zw',
      password: 'SecurePass123!',
    });
    accessToken = regRes.body.data.accessToken;
  });

  describe('POST /api/v1/expenses', () => {
    it('creates an expense', async () => {
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Office Rent - Jan 2025',
          category: 'RENT',
          amount: 500.0,
          currency: 'USD',
          date: '2025-01-01',
          notes: 'Monthly office rent payment',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Office Rent - Jan 2025');
      expect(res.body.data.amount).toBe(500);
      expect(res.body.data.category).toBe('RENT');
    });

    it('validates required fields', async () => {
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ amount: -100 }) // Invalid: missing title, category, negative amount
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/expenses/summary', () => {
    it('returns monthly expense summary by category', async () => {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();

      await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Rent',
          category: 'RENT',
          amount: 400,
          currency: 'USD',
          date: `${year}-${String(month).padStart(2, '0')}-01`,
        });

      await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Internet',
          category: 'UTILITIES',
          amount: 50,
          currency: 'USD',
          date: `${year}-${String(month).padStart(2, '0')}-05`,
        });

      const res = await request(app)
        .get(`/api/v1/expenses/summary?month=${month}&year=${year}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.totalAmount).toBe(450);
      expect(res.body.data.byCategory.RENT).toBe(400);
      expect(res.body.data.byCategory.UTILITIES).toBe(50);
      expect(res.body.data.count).toBe(2);
    });
  });

  describe('DELETE /api/v1/expenses/:id', () => {
    it('deletes an expense', async () => {
      const createRes = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'To Delete',
          category: 'OTHER',
          amount: 10,
          currency: 'USD',
          date: '2025-01-01',
        });

      const expenseId = createRes.body.data._id;

      await request(app)
        .delete(`/api/v1/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      await request(app)
        .get(`/api/v1/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});

skipIfNoMongo('Customers Module', () => {
  let accessToken: string;

  beforeEach(async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send({
      businessName: 'Customer Test Co',
      ownerName: 'Customer Owner',
      email: 'custtest@testco.co.zw',
      password: 'SecurePass123!',
    });
    accessToken = regRes.body.data.accessToken;
  });

  describe('POST /api/v1/customers', () => {
    it('creates a customer', async () => {
      const res = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Tinashe Mhlanga', email: 'tinashe@example.com', phone: '+263777123456' })
        .expect(201);

      expect(res.body.data.name).toBe('Tinashe Mhlanga');
      expect(res.body.data.totalPurchases).toBe(0);
      expect(res.body.data.outstandingBalance).toBe(0);
    });
  });

  describe('GET /api/v1/customers/:id', () => {
    it('returns customer with purchase history', async () => {
      const createRes = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Chiedza Nhira', email: 'chiedza@test.com' });

      const customerId = createRes.body.data._id;
      const res = await request(app)
        .get(`/api/v1/customers/${customerId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.customer.name).toBe('Chiedza Nhira');
      expect(res.body.data.invoices).toBeInstanceOf(Array);
      expect(res.body.data.sales).toBeInstanceOf(Array);
    });
  });

  describe('PATCH /api/v1/customers/:id', () => {
    it('updates customer details', async () => {
      const createRes = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Old Name' });

      const customerId = createRes.body.data._id;
      const res = await request(app)
        .patch(`/api/v1/customers/${customerId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'New Name', phone: '+263712345678' })
        .expect(200);

      expect(res.body.data.name).toBe('New Name');
      expect(res.body.data.phone).toBe('+263712345678');
    });
  });
});

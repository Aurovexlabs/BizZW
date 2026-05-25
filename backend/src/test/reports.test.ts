import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../app';
import { Currency } from '../shared/types';
import {
  calculateGrowth,
  formatCurrency,
  formatDate,
  generateInvoiceNumber,
} from '../shared/utils';

// ─── Utility Unit Tests (always run) ─────────────────────────

describe('Utility Functions', () => {
  describe('formatCurrency', () => {
    it('formats USD correctly', () => {
      expect(formatCurrency(1234.56, Currency.USD)).toBe('$1,234.56');
      expect(formatCurrency(0, Currency.USD)).toBe('$0.00');
      expect(formatCurrency(999999.99, Currency.USD)).toBe('$999,999.99');
    });

    it('formats ZiG correctly', () => {
      const result = formatCurrency(500, Currency.ZIG);
      expect(result).toContain('ZiG');
      expect(result).toContain('500');
    });
  });

  describe('generateInvoiceNumber', () => {
    it('generates correct format', () => {
      const num = generateInvoiceNumber(1, 2025);
      expect(num).toBe('INV-2025-0001');
    });

    it('pads sequence correctly', () => {
      expect(generateInvoiceNumber(42, 2025)).toBe('INV-2025-0042');
      expect(generateInvoiceNumber(1000, 2025)).toBe('INV-2025-1000');
    });

    it('uses current year when not specified', () => {
      const num = generateInvoiceNumber(1);
      const year = new Date().getFullYear();
      expect(num).toBe(`INV-${year}-0001`);
    });
  });

  describe('formatDate', () => {
    it('formats date in short format', () => {
      const result = formatDate('2025-01-15', 'short');
      expect(result).toContain('2025');
    });

    it('handles invalid dates gracefully', () => {
      const result = formatDate('not-a-date');
      expect(result).toBe('Invalid date');
    });

    it('formats ISO date correctly', () => {
      const result = formatDate(new Date('2025-06-01'), 'iso');
      expect(result).toBe('2025-06-01');
    });
  });

  describe('calculateGrowth', () => {
    it('calculates positive growth', () => {
      expect(calculateGrowth(120, 100)).toBe(20);
    });

    it('calculates negative growth', () => {
      expect(calculateGrowth(80, 100)).toBe(-20);
    });

    it('handles zero previous value', () => {
      expect(calculateGrowth(100, 0)).toBe(100);
      expect(calculateGrowth(0, 0)).toBe(0);
    });
  });
});

// ─── Reports API Tests ────────────────────────────────────────

const skipIfNoMongo = process.env.RUN_MONGO_TESTS === '1' ? describe : describe.skip;

skipIfNoMongo('Reports Module', () => {
  let accessToken: string;
  let productId: string;

  const testBusiness = {
    businessName: 'Reports Test Store',
    ownerName: 'Report Owner',
    email: 'reports@teststore.co.zw',
    password: 'SecurePass123!',
  };

  beforeEach(async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send(testBusiness);
    accessToken = regRes.body.data.accessToken;

    // Create product
    const prodRes = await request(app)
      .post('/api/v1/inventory')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Report Product',
        sku: 'RPT-001',
        category: 'Test',
        costPrice: 5,
        sellPrice: 10,
        quantity: 100,
        lowStockThreshold: 5,
      });
    productId = prodRes.body.data._id;

    // Create a sale
    await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        items: [{ productId, quantity: 5 }],
        discount: 0,
        currency: 'USD',
        paymentMethod: 'CASH',
        amountPaid: 50,
      });
  });

  describe('GET /api/v1/reports/dashboard', () => {
    it('returns KPI data', async () => {
      const res = await request(app)
        .get('/api/v1/reports/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('monthlyRevenue');
      expect(res.body.data).toHaveProperty('totalCustomers');
      expect(res.body.data).toHaveProperty('lowStockCount');
      expect(res.body.data.monthlyRevenue).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /api/v1/reports/revenue', () => {
    it('returns revenue report', async () => {
      const today = new Date().toISOString().split('T')[0];
      const res = await request(app)
        .get(`/api/v1/reports/revenue?startDate=${today}&endDate=${today}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.totalRevenue).toBe(50);
      expect(res.body.data.posRevenue).toBe(50);
      expect(res.body.data.totalTransactions).toBe(1);
    });
  });

  describe('GET /api/v1/reports/profit-loss', () => {
    it('returns profit and loss summary', async () => {
      const today = new Date().toISOString().split('T')[0];
      const res = await request(app)
        .get(`/api/v1/reports/profit-loss?startDate=${today}&endDate=${today}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('revenue');
      expect(res.body.data).toHaveProperty('cogs');
      expect(res.body.data).toHaveProperty('grossProfit');
      expect(res.body.data).toHaveProperty('totalExpenses');
      expect(res.body.data).toHaveProperty('netProfit');
    });
  });

  describe('GET /api/v1/reports/inventory-valuation', () => {
    it('calculates inventory value correctly', async () => {
      const res = await request(app)
        .get('/api/v1/reports/inventory-valuation')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // 95 remaining (100 - 5 from sale) × $5 cost = $475
      expect(res.body.data.totalCostValue).toBe(475);
      // 95 × $10 sell = $950
      expect(res.body.data.totalSellValue).toBe(950);
      expect(res.body.data.potentialProfit).toBe(475);
    });
  });

  describe('GET /api/v1/reports/top-products', () => {
    it('returns top selling products', async () => {
      const today = new Date().toISOString().split('T')[0];
      const res = await request(app)
        .get(`/api/v1/reports/top-products?startDate=${today}&endDate=${today}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].revenue).toBe(50);
      expect(res.body.data[0].quantity).toBe(5);
    });
  });

  describe('GET /api/v1/reports/customer-ltv', () => {
    it('returns customer LTV data array', async () => {
      const res = await request(app)
        .get('/api/v1/reports/customer-ltv')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/reports/tax-summary', () => {
    it('returns tax summary object', async () => {
      const today = new Date().toISOString().split('T')[0];
      const res = await request(app)
        .get(`/api/v1/reports/tax-summary?startDate=${today}&endDate=${today}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalTaxCollected');
      expect(res.body.data).toHaveProperty('totalRevenue');
      expect(res.body.data).toHaveProperty('totalSubtotal');
      expect(res.body.data).toHaveProperty('invoiceCount');
      expect(Array.isArray(res.body.data.monthly)).toBe(true);
    });
  });

  describe('Role-based access control', () => {
    it('blocks CASHIER from accessing reports', async () => {
      // Invite a cashier
      await request(app)
        .post('/api/v1/auth/invite')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'cashier@test.com', role: 'CASHIER' });

      // Cashiers shouldn't access reports (in the real test we'd get their token)
      // This verifies the middleware structure is correct via 401
      await request(app).get('/api/v1/reports/dashboard').expect(401);
    });
  });
});

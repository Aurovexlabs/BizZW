import {
  buildTenantScopedCacheKey,
  getCachedJson,
  getTenantDataVersion,
  setCachedJson,
} from '../../lib/cache';
import { getTenantDB } from '../../lib/db';
import { InvoiceStatus } from '../../shared/types';
import { getCustomerModel } from '../customers/customer.model';
import { getExpenseModel } from '../expenses/expense.model';
import { getProductModel } from '../inventory/product.model';
import { getInvoiceModel } from '../invoices/invoice.model';
import { getSaleModel } from '../sales/sale.model';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

const reportCacheTtlSeconds = toPositiveInt(process.env.REPORT_CACHE_TTL_SECONDS, 120);
const dashboardCacheTtlSeconds = toPositiveInt(process.env.REPORT_DASHBOARD_CACHE_TTL_SECONDS, 30);

function toPositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function serializeDateRange(range: DateRange): { startDate: string; endDate: string } {
  return {
    startDate: range.startDate.toISOString(),
    endDate: range.endDate.toISOString(),
  };
}

async function withReportCache<T>(
  orgId: string,
  namespace: string,
  cacheInput: Record<string, unknown>,
  ttlSeconds: number,
  resolver: () => Promise<T>
): Promise<T> {
  const version = await getTenantDataVersion(orgId);
  const key = buildTenantScopedCacheKey(orgId, namespace, version, cacheInput);
  const cached = await getCachedJson<T>(key);
  if (cached !== null) {
    return cached;
  }

  const fresh = await resolver();
  await setCachedJson(key, fresh, ttlSeconds);
  return fresh;
}

// ─── Revenue Report ───────────────────────────────────────────

export async function getRevenueReport(orgId: string, range: DateRange) {
  return withReportCache(
    orgId,
    'reports:revenue',
    { range: serializeDateRange(range) },
    reportCacheTtlSeconds,
    async () => {
      const db = await getTenantDB(orgId);
      const Sale = getSaleModel(db);
      const Invoice = getInvoiceModel(db);

      const [sales, paidInvoices] = await Promise.all([
        Sale.find({ createdAt: { $gte: range.startDate, $lte: range.endDate } }),
        Invoice.find({
          status: InvoiceStatus.PAID,
          paidAt: { $gte: range.startDate, $lte: range.endDate },
        }),
      ]);

      const posRevenue = sales.reduce((sum, s) => sum + s.total, 0);
      const invoiceRevenue = paidInvoices.reduce((sum, i) => sum + i.total, 0);
      const totalRevenue = posRevenue + invoiceRevenue;
      const totalTransactions = sales.length + paidInvoices.length;

      // Daily breakdown
      const dailyMap = new Map<string, number>();
      const allTransactions = [
        ...sales.map((s) => ({ date: s.createdAt, amount: s.total })),
        ...paidInvoices.map((i) => ({ date: i.paidAt!, amount: i.total })),
      ];

      for (const tx of allTransactions) {
        const key = new Date(tx.date).toISOString().split('T')[0];
        dailyMap.set(key, (dailyMap.get(key) || 0) + tx.amount);
      }

      const daily = Array.from(dailyMap.entries())
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Payment method breakdown
      const byPaymentMethod = sales.reduce(
        (acc, s) => {
          acc[s.paymentMethod] = (acc[s.paymentMethod] || 0) + s.total;
          return acc;
        },
        {} as Record<string, number>
      );

      return {
        totalRevenue,
        posRevenue,
        invoiceRevenue,
        totalTransactions,
        daily,
        byPaymentMethod,
      };
    }
  );
}

// ─── Profit & Loss ────────────────────────────────────────────

export async function getProfitLossReport(orgId: string, range: DateRange) {
  return withReportCache(
    orgId,
    'reports:profit-loss',
    { range: serializeDateRange(range) },
    reportCacheTtlSeconds,
    async () => {
      const db = await getTenantDB(orgId);
      const Sale = getSaleModel(db);
      const Expense = getExpenseModel(db);
      const Product = getProductModel(db);
      const Invoice = getInvoiceModel(db);

      const [sales, expenses, paidInvoices] = await Promise.all([
        Sale.find({ createdAt: { $gte: range.startDate, $lte: range.endDate } }),
        Expense.find({ date: { $gte: range.startDate, $lte: range.endDate } }),
        Invoice.find({
          status: InvoiceStatus.PAID,
          paidAt: { $gte: range.startDate, $lte: range.endDate },
        }),
      ]);

      // Revenue
      const salesRevenue = sales.reduce((sum, s) => sum + s.total, 0);
      const invoiceRevenue = paidInvoices.reduce((sum, i) => sum + i.total, 0);
      const totalRevenue = salesRevenue + invoiceRevenue;

      // Cost of Goods Sold (COGS)
      const allItems = [...sales.flatMap((s) => s.items)];

      // We need cost prices — fetch products
      const productIds = [...new Set(allItems.map((i) => i.productId))];
      const products = await Product.find({ _id: { $in: productIds } }).select('_id costPrice');
      const costMap = new Map(products.map((p) => [p._id.toString(), p.costPrice]));

      const cogs = allItems.reduce((sum, item) => {
        const costPrice = costMap.get(item.productId) || 0;
        return sum + costPrice * item.quantity;
      }, 0);

      const grossProfit = totalRevenue - cogs;
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const netProfit = grossProfit - totalExpenses;
      const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
      const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      // Expense breakdown by category
      const expenseByCategory = expenses.reduce(
        (acc, e) => {
          acc[e.category] = (acc[e.category] || 0) + e.amount;
          return acc;
        },
        {} as Record<string, number>
      );

      return {
        revenue: { total: totalRevenue, sales: salesRevenue, invoices: invoiceRevenue },
        cogs,
        grossProfit,
        grossMargin,
        totalExpenses,
        expenseByCategory,
        netProfit,
        netMargin,
      };
    }
  );
}

// ─── Top Selling Products ─────────────────────────────────────

export async function getTopSellingProducts(orgId: string, range: DateRange, limit = 10) {
  return withReportCache(
    orgId,
    'reports:top-products',
    { range: serializeDateRange(range), limit },
    reportCacheTtlSeconds,
    async () => {
      const db = await getTenantDB(orgId);
      const Sale = getSaleModel(db);

      const sales = await Sale.find({
        createdAt: { $gte: range.startDate, $lte: range.endDate },
      });

      // Aggregate product totals from sale items
      const productTotals = new Map<string, { name: string; quantity: number; revenue: number }>();
      for (const sale of sales) {
        for (const item of sale.items) {
          const existing = productTotals.get(item.productId) || {
            name: item.productName,
            quantity: 0,
            revenue: 0,
          };
          existing.quantity += item.quantity;
          existing.revenue += item.total;
          productTotals.set(item.productId, existing);
        }
      }

      return Array.from(productTotals.entries())
        .map(([productId, data]) => ({ productId, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);
    }
  );
}

// ─── Inventory Valuation ──────────────────────────────────────

export async function getInventoryValuation(orgId: string) {
  return withReportCache(
    orgId,
    'reports:inventory-valuation',
    {},
    reportCacheTtlSeconds,
    async () => {
      const db = await getTenantDB(orgId);
      const Product = getProductModel(db);

      const products = await Product.find({ isActive: true }).select(
        'name category quantity costPrice sellPrice'
      );

      const byCategory: Record<string, { costValue: number; sellValue: number; items: number }> =
        {};
      let totalCostValue = 0;
      let totalSellValue = 0;

      for (const p of products) {
        const costValue = p.quantity * p.costPrice;
        const sellValue = p.quantity * p.sellPrice;
        totalCostValue += costValue;
        totalSellValue += sellValue;

        if (!byCategory[p.category]) {
          byCategory[p.category] = { costValue: 0, sellValue: 0, items: 0 };
        }
        byCategory[p.category].costValue += costValue;
        byCategory[p.category].sellValue += sellValue;
        byCategory[p.category].items += 1;
      }

      return {
        totalCostValue,
        totalSellValue,
        potentialProfit: totalSellValue - totalCostValue,
        totalProducts: products.length,
        byCategory,
        products: products.map((p) => ({
          _id: p._id,
          name: p.name,
          category: p.category,
          quantity: p.quantity,
          costPrice: p.costPrice,
          sellPrice: p.sellPrice,
          costValue: p.quantity * p.costPrice,
          sellValue: p.quantity * p.sellPrice,
        })),
      };
    }
  );
}

// ─── Customer LTV ─────────────────────────────────────────────

export async function getCustomerLTV(orgId: string, limit = 10) {
  return withReportCache(
    orgId,
    'reports:customer-ltv',
    { limit },
    reportCacheTtlSeconds,
    async () => {
      const db = await getTenantDB(orgId);
      const Customer = getCustomerModel(db);

      return Customer.find({})
        .sort({ totalPurchases: -1 })
        .limit(limit)
        .select('name email phone totalPurchases outstandingBalance createdAt');
    }
  );
}

// ─── Tax Summary ──────────────────────────────────────────────

export async function getTaxSummary(orgId: string, range: DateRange) {
  return withReportCache(
    orgId,
    'reports:tax-summary',
    { range: serializeDateRange(range) },
    reportCacheTtlSeconds,
    async () => {
      const db = await getTenantDB(orgId);
      const Invoice = getInvoiceModel(db);

      const paidInvoices = await Invoice.find({
        status: InvoiceStatus.PAID,
        paidAt: { $gte: range.startDate, $lte: range.endDate },
      });

      const totalTaxCollected = paidInvoices.reduce((sum, i) => sum + i.tax, 0);
      const totalRevenue = paidInvoices.reduce((sum, i) => sum + i.total, 0);
      const totalSubtotal = paidInvoices.reduce((sum, i) => sum + i.subtotal, 0);

      // Monthly breakdown
      const monthlyMap = new Map<string, { revenue: number; tax: number }>();
      for (const invoice of paidInvoices) {
        const key = invoice.paidAt!.toISOString().substring(0, 7); // YYYY-MM
        const existing = monthlyMap.get(key) || { revenue: 0, tax: 0 };
        existing.revenue += invoice.total;
        existing.tax += invoice.tax;
        monthlyMap.set(key, existing);
      }

      const monthly = Array.from(monthlyMap.entries())
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month));

      return {
        totalTaxCollected,
        totalRevenue,
        totalSubtotal,
        invoiceCount: paidInvoices.length,
        monthly,
      };
    }
  );
}

// ─── Dashboard KPIs ───────────────────────────────────────────

export async function getDashboardKPIs(orgId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  return withReportCache(
    orgId,
    'reports:dashboard',
    {
      monthAnchor: `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`,
      dayAnchor: now.getUTCDate(),
    },
    dashboardCacheTtlSeconds,
    async () => {
      const db = await getTenantDB(orgId);
      const Sale = getSaleModel(db);
      const Invoice = getInvoiceModel(db);
      const Customer = getCustomerModel(db);
      const Product = getProductModel(db);
      const Expense = getExpenseModel(db);

      const [
        monthlySales,
        lastMonthSales,
        overdueInvoices,
        totalCustomers,
        lowStockCount,
        monthlyExpenses,
      ] = await Promise.all([
        Sale.aggregate([
          { $match: { createdAt: { $gte: startOfMonth } } },
          { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
        ]),
        Sale.aggregate([
          { $match: { createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
          { $group: { _id: null, total: { $sum: '$total' } } },
        ]),
        Invoice.countDocuments({ status: InvoiceStatus.OVERDUE }),
        Customer.countDocuments({}),
        Product.countDocuments({
          isActive: true,
          $expr: { $lte: ['$quantity', '$lowStockThreshold'] },
        }),
        Expense.aggregate([
          { $match: { date: { $gte: startOfMonth } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);

      const currentRevenue = monthlySales[0]?.total || 0;
      const lastRevenue = lastMonthSales[0]?.total || 0;
      const revenueGrowth =
        lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0;

      return {
        monthlyRevenue: currentRevenue,
        revenueGrowth,
        monthlySalesCount: monthlySales[0]?.count || 0,
        overdueInvoices,
        totalCustomers,
        lowStockCount,
        monthlyExpenses: monthlyExpenses[0]?.total || 0,
      };
    }
  );
}

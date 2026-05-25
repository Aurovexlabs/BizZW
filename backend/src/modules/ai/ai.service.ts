import { GoogleGenerativeAI } from '@google/generative-ai';
import { Response } from 'express';
import { getTenantDB } from '../../lib/db';
import { getSaleModel } from '../sales/sale.model';
import { getProductModel } from '../inventory/product.model';
import { getExpenseModel } from '../expenses/expense.model';
import { getInvoiceModel } from '../invoices/invoice.model';
import { getCustomerModel } from '../customers/customer.model';
import { Tenant } from '../auth/tenant.model';
import { InvoiceStatus } from '../../shared/types';
import { AppError } from '../../middleware/error.middleware';

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new AppError('Gemini API key not configured', 500, 'AI_NOT_CONFIGURED');
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

// ─── SSE Helper ───────────────────────────────────────────────

export function initSSE(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

export function sendSSEChunk(res: Response, data: string): void {
  res.write(`data: ${JSON.stringify({ chunk: data })}\n\n`);
}

export function sendSSEDone(res: Response, meta?: object): void {
  res.write(`data: ${JSON.stringify({ done: true, ...(meta || {}) })}\n\n`);
  res.end();
}

export function sendSSEError(res: Response, message: string): void {
  res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
  res.end();
}

// ─── Context Builders ─────────────────────────────────────────

async function buildSalesContext(orgId: string, days = 90) {
  const db = await getTenantDB(orgId);
  const Sale = getSaleModel(db);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const sales = await Sale.find({ createdAt: { $gte: startDate } }).sort({ createdAt: -1 });

  // Daily aggregates
  const dailyMap = new Map<string, number>();
  for (const sale of sales) {
    const key = sale.createdAt.toISOString().split('T')[0];
    dailyMap.set(key, (dailyMap.get(key) || 0) + sale.total);
  }

  const dailySales = Array.from(dailyMap.entries())
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalRevenue = sales.reduce((s, x) => s + x.total, 0);
  const avgDailyRevenue = totalRevenue / Math.max(dailySales.length, 1);

  return { dailySales, totalRevenue, avgDailyRevenue, saleCount: sales.length };
}

async function buildInventoryContext(orgId: string) {
  const db = await getTenantDB(orgId);
  const Product = getProductModel(db);
  const products = await Product.find({ isActive: true })
    .select('name category quantity lowStockThreshold costPrice sellPrice')
    .limit(100);

  return products.map((p) => ({
    name: p.name,
    category: p.category,
    stock: p.quantity,
    threshold: p.lowStockThreshold,
    isLow: p.quantity <= p.lowStockThreshold,
    costPrice: p.costPrice,
    sellPrice: p.sellPrice,
    margin: p.sellPrice > 0 ? (((p.sellPrice - p.costPrice) / p.sellPrice) * 100).toFixed(1) + '%' : '0%',
  }));
}

async function buildExpenseContext(orgId: string, days = 90) {
  const db = await getTenantDB(orgId);
  const Expense = getExpenseModel(db);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const expenses = await Expense.find({ date: { $gte: startDate } });
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const byCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  return { totalExpenses, byCategory, count: expenses.length };
}

async function buildBusinessContext(orgId: string) {
  const tenant = await Tenant.findOne({ orgId });
  return {
    businessName: tenant?.name || 'Your Business',
    plan: tenant?.plan,
    currency: tenant?.settings?.currency || 'USD',
    taxRate: tenant?.settings?.taxRate || 15,
  };
}

// ─── 1. Revenue Forecast ──────────────────────────────────────

export async function streamRevenueForecast(orgId: string, res: Response): Promise<void> {
  try {
    const [salesCtx, bizCtx] = await Promise.all([
      buildSalesContext(orgId, 90),
      buildBusinessContext(orgId),
    ]);

    const prompt = `You are a financial analyst specializing in Zimbabwean SMEs. 
Analyze this sales data for ${bizCtx.businessName} and provide a 30-day revenue forecast.

BUSINESS: ${bizCtx.businessName} | Currency: ${bizCtx.currency}
LAST 90 DAYS:
- Total Revenue: ${bizCtx.currency} ${salesCtx.totalRevenue.toFixed(2)}
- Total Transactions: ${salesCtx.saleCount}
- Average Daily Revenue: ${bizCtx.currency} ${salesCtx.avgDailyRevenue.toFixed(2)}
- Daily breakdown (last 30 entries): ${JSON.stringify(salesCtx.dailySales.slice(-30))}

Provide:
1. **30-Day Revenue Forecast** with best case, expected, and worst case scenarios in ${bizCtx.currency}
2. **Key Trends** you identified in the data (2-3 bullet points)
3. **Seasonal Factors** relevant to Zimbabwe (holidays, pay cycles, agricultural seasons)
4. **Recommended Actions** to maximize revenue in the next 30 days (3 specific, actionable steps)

Be specific, use the actual numbers, and keep it practical for a small Zimbabwean business owner.`;

    const model = getGenAI().getGenerativeModel({ model: 'gemini-1.5-flash' });
    const streamResult = await model.generateContentStream(prompt);

    for await (const chunk of streamResult.stream) {
      const text = chunk.text();
      if (text) sendSSEChunk(res, text);
    }

    sendSSEDone(res, { type: 'forecast', generatedAt: new Date().toISOString() });
  } catch (err) {
    sendSSEError(res, (err as Error).message);
  }
}

// ─── 2. Smart Restock Recommendations ────────────────────────

export async function streamRestockRecommendations(orgId: string, res: Response): Promise<void> {
  try {
    const [inventory, salesCtx, bizCtx] = await Promise.all([
      buildInventoryContext(orgId),
      buildSalesContext(orgId, 30),
      buildBusinessContext(orgId),
    ]);

    const lowStockItems = inventory.filter((p) => p.isLow);
    const normalItems = inventory.filter((p) => !p.isLow).slice(0, 20);

    const prompt = `You are an inventory management expert for Zimbabwean SMEs.
Analyze this inventory data and provide smart restock recommendations.

BUSINESS: ${bizCtx.businessName}
CURRENCY: ${bizCtx.currency}

LOW STOCK ITEMS (${lowStockItems.length} items):
${JSON.stringify(lowStockItems, null, 2)}

NORMAL STOCK SAMPLE:
${JSON.stringify(normalItems, null, 2)}

RECENT SALES CONTEXT (30 days):
- Total Revenue: ${bizCtx.currency} ${salesCtx.totalRevenue.toFixed(2)}
- Daily Average: ${bizCtx.currency} ${salesCtx.avgDailyRevenue.toFixed(2)}

Provide:
1. **Urgent Restock** — items that need immediate restocking (ranked by urgency)
2. **Recommended Order Quantities** for each urgent item (based on sales velocity)
3. **High-Margin Opportunities** — items with good margins worth stocking more of
4. **Slow Movers** — items that might be overstocked or need promotion
5. **Budget Estimate** — estimated cost to restock urgent items

Be specific with quantities and prioritize by business impact.`;

    const model = getGenAI().getGenerativeModel({ model: 'gemini-1.5-flash' });
    const streamResult = await model.generateContentStream(prompt);

    for await (const chunk of streamResult.stream) {
      const text = chunk.text();
      if (text) sendSSEChunk(res, text);
    }

    sendSSEDone(res, { type: 'restock', generatedAt: new Date().toISOString() });
  } catch (err) {
    sendSSEError(res, (err as Error).message);
  }
}

// ─── 3. Business Health Insights ─────────────────────────────

export async function streamBusinessInsights(orgId: string, res: Response): Promise<void> {
  try {
    const db = await getTenantDB(orgId);
    const Invoice = getInvoiceModel(db);
    const Customer = getCustomerModel(db);

    const [salesCtx, expenseCtx, inventory, bizCtx] = await Promise.all([
      buildSalesContext(orgId, 30),
      buildExpenseContext(orgId, 30),
      buildInventoryContext(orgId),
      buildBusinessContext(orgId),
    ]);

    const [overdueInvoices, topCustomers] = await Promise.all([
      Invoice.countDocuments({ status: InvoiceStatus.OVERDUE }),
      Customer.find({}).sort({ totalPurchases: -1 }).limit(5).select('name totalPurchases outstandingBalance'),
    ]);

    const grossProfit = salesCtx.totalRevenue - expenseCtx.totalExpenses;
    const profitMargin = salesCtx.totalRevenue > 0
      ? ((grossProfit / salesCtx.totalRevenue) * 100).toFixed(1)
      : '0';

    const prompt = `You are a business advisor specializing in Zimbabwean SMEs.
Provide a comprehensive business health summary for ${bizCtx.businessName}.

LAST 30 DAYS PERFORMANCE:
Revenue: ${bizCtx.currency} ${salesCtx.totalRevenue.toFixed(2)} (${salesCtx.saleCount} transactions)
Expenses: ${bizCtx.currency} ${expenseCtx.totalExpenses.toFixed(2)}
Net Profit: ${bizCtx.currency} ${grossProfit.toFixed(2)} (${profitMargin}% margin)
Overdue Invoices: ${overdueInvoices}
Expense Breakdown: ${JSON.stringify(expenseCtx.byCategory)}

INVENTORY HEALTH:
Total Products: ${inventory.length}
Low Stock Items: ${inventory.filter((p) => p.isLow).length}
Avg Margin: ${inventory.length > 0 ? inventory.map((p) => parseFloat(p.margin)).reduce((a, b) => a + b, 0) / inventory.length : 0}%

TOP CUSTOMERS:
${JSON.stringify(topCustomers, null, 2)}

Write a plain-English business health report covering:
1. **Overall Health Score** (1-10 with explanation)
2. **What's Working Well** (2-3 positives)
3. **Areas of Concern** (2-3 issues needing attention)  
4. **Cash Flow Assessment**
5. **Top 3 Priority Actions** for the next 2 weeks
6. **One Encouraging Note** — end on a positive, motivational note

Write as if speaking directly to the business owner. Be honest but supportive.`;

    const model = getGenAI().getGenerativeModel({ model: 'gemini-1.5-flash' });
    const streamResult = await model.generateContentStream(prompt);

    for await (const chunk of streamResult.stream) {
      const text = chunk.text();
      if (text) sendSSEChunk(res, text);
    }

    sendSSEDone(res, { type: 'insights', generatedAt: new Date().toISOString() });
  } catch (err) {
    sendSSEError(res, (err as Error).message);
  }
}

// ─── 4. Anomaly Detection ─────────────────────────────────────

export async function streamAnomalyDetection(orgId: string, res: Response): Promise<void> {
  try {
    const [salesCtx, expenseCtx, bizCtx] = await Promise.all([
      buildSalesContext(orgId, 60),
      buildExpenseContext(orgId, 60),
      buildBusinessContext(orgId),
    ]);

    // Calculate statistical baselines
    const revenues = salesCtx.dailySales.map((d) => d.revenue);
    const avgRevenue = revenues.reduce((a, b) => a + b, 0) / Math.max(revenues.length, 1);
    const stdDev = Math.sqrt(
      revenues.reduce((sum, r) => sum + Math.pow(r - avgRevenue, 2), 0) / Math.max(revenues.length, 1)
    );

    // Flag days > 2 standard deviations from mean
    const anomalousdays = salesCtx.dailySales.filter(
      (d) => Math.abs(d.revenue - avgRevenue) > 2 * stdDev
    );

    const prompt = `You are a financial fraud and anomaly detection expert.
Analyze this business data and identify unusual patterns that require attention.

BUSINESS: ${bizCtx.businessName} | Currency: ${bizCtx.currency}

SALES STATISTICS (60 days):
- Average Daily Revenue: ${bizCtx.currency} ${avgRevenue.toFixed(2)}
- Standard Deviation: ${bizCtx.currency} ${stdDev.toFixed(2)}
- Statistically Anomalous Days: ${JSON.stringify(anomalousdays)}
- Full Daily Sales: ${JSON.stringify(salesCtx.dailySales)}

EXPENSE PATTERNS:
- Total: ${bizCtx.currency} ${expenseCtx.totalExpenses.toFixed(2)}
- By Category: ${JSON.stringify(expenseCtx.byCategory)}

Identify and explain:
1. **Revenue Anomalies** — unusual spikes or drops with possible explanations
2. **Expense Anomalies** — categories that seem unusually high or irregular
3. **Pattern Concerns** — any suspicious patterns that could indicate issues (theft, data entry errors, unusual customer behavior)
4. **Positive Anomalies** — unusually good performance worth understanding and replicating
5. **Recommended Investigations** — specific things the owner should check

For each anomaly, provide: what was detected, why it's unusual, possible causes, and suggested next steps.`;

    const model = getGenAI().getGenerativeModel({ model: 'gemini-1.5-flash' });
    const streamResult = await model.generateContentStream(prompt);

    for await (const chunk of streamResult.stream) {
      const text = chunk.text();
      if (text) sendSSEChunk(res, text);
    }

    sendSSEDone(res, { type: 'anomalies', generatedAt: new Date().toISOString() });
  } catch (err) {
    sendSSEError(res, (err as Error).message);
  }
}

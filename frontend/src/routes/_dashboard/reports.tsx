import { createFileRoute, Link } from '@tanstack/react-router';
import { DollarSign, ExternalLink, ListChecks, Package, Sparkles, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge, Card, Skeleton } from '../../components/ui';
import {
  useCustomerLTV,
  useInventoryValuation,
  useProfitLoss,
  useRevenueReport,
  useTopProducts,
} from '../../hooks/useApi';
import {
  CHART_AXIS_TICK,
  CHART_COLORS,
  CHART_GRID,
  CHART_LEGEND_STYLE,
  CHART_SERIES,
  CHART_TOOLTIP,
} from '../../lib/chartTheme';
import { Currency } from '../../shared/types';
import { formatCurrency, formatPercent } from '../../shared/utils';
import { useAuthStore } from '../../store/auth.store';

export const Route = createFileRoute('/_dashboard/reports')({
  component: ReportsPage,
});

type DateRange = { startDate: string; endDate: string };

function getDefaultRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(1);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

function ReportsPage() {
  const { tenant } = useAuthStore();
  const currency = (tenant?.settings?.currency as Currency) || Currency.USD;
  const [range, setRange] = useState<DateRange>(getDefaultRange());
  const [activeTab, setActiveTab] = useState<'revenue' | 'pnl' | 'inventory' | 'customers'>(
    'revenue'
  );

  const { data: revenue, isLoading: revLoading } = useRevenueReport(range);
  const { data: pnl, isLoading: pnlLoading } = useProfitLoss(range);
  const { data: topProducts } = useTopProducts(range);
  const { data: inventoryVal } = useInventoryValuation();
  const { data: customerLTV } = useCustomerLTV();

  const rev = revenue as
    | {
        totalRevenue?: number;
        posRevenue?: number;
        invoiceRevenue?: number;
        totalTransactions?: number;
        daily?: { date: string; revenue: number }[];
        byPaymentMethod?: Record<string, number>;
      }
    | undefined;

  const pl = pnl as
    | {
        revenue?: { total: number };
        cogs?: number;
        grossProfit?: number;
        grossMargin?: number;
        totalExpenses?: number;
        netProfit?: number;
        netMargin?: number;
        expenseByCategory?: Record<string, number>;
      }
    | undefined;

  const iv = inventoryVal as
    | {
        totalCostValue?: number;
        totalSellValue?: number;
        potentialProfit?: number;
        totalProducts?: number;
        byCategory?: Record<string, { costValue: number; sellValue: number; items: number }>;
      }
    | undefined;

  const customerInsights =
    (customerLTV as {
      _id: string;
      name: string;
      email?: string;
      totalPurchases: number;
      outstandingBalance: number;
    }[]) || [];

  const tabs = [
    { key: 'revenue', label: 'Revenue' },
    { key: 'pnl', label: 'Profit & Loss' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'customers', label: 'Customers' },
  ] as const;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-sm text-slate-500">Business intelligence for {tenant?.name}</p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={range.startDate}
            onChange={(e) => setRange((r) => ({ ...r, startDate: e.target.value }))}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={range.endDate}
            onChange={(e) => setRange((r) => ({ ...r, endDate: e.target.value }))}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-primary-100 bg-primary-50/40">
          <h2 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary-800">
            <Sparkles className="h-3.5 w-3.5" /> Quick actions
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Move from analysis to execution with one-click jumps into related modules.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link to="/dashboard" className="block">
              <button className="inline-flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Executive dashboard
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </Link>
            <Link to="/inventory" className="block">
              <button className="inline-flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Inventory operations
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </Link>
            <Link to="/invoices" className="block">
              <button className="inline-flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Receivables follow-up
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </Link>
            <Link to="/help" className="block">
              <button className="inline-flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Reporting playbook
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </Link>
          </div>
        </Card>

        <Card>
          <h2 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-700">
            <ListChecks className="h-3.5 w-3.5" /> Example workflow
          </h2>
          <ol className="mt-3 space-y-2">
            {[
              'Choose a date range, then review Revenue before switching tabs.',
              'Use P and L to isolate margin pressure from COGS versus expenses.',
              'Check Inventory valuation by category to find tied-up capital.',
              'Review top customers and products, then assign owners for next actions.',
            ].map((step, index) => (
              <li key={step} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Revenue Tab */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Total Revenue',
                value: formatCurrency(rev?.totalRevenue || 0, currency),
                icon: DollarSign,
                color: 'text-primary-700',
                bg: 'bg-primary-50',
              },
              {
                label: 'POS Sales',
                value: formatCurrency(rev?.posRevenue || 0, currency),
                icon: DollarSign,
                color: 'text-accent-700',
                bg: 'bg-accent-50',
              },
              {
                label: 'Invoice Revenue',
                value: formatCurrency(rev?.invoiceRevenue || 0, currency),
                icon: TrendingUp,
                color: 'text-purple-600',
                bg: 'bg-purple-50',
              },
              {
                label: 'Transactions',
                value: rev?.totalTransactions || 0,
                icon: Package,
                color: 'text-amber-600',
                bg: 'bg-amber-50',
              },
            ].map((s) => (
              <Card key={s.label}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-500">{s.label}</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">
                      {revLoading ? <Skeleton className="h-6 w-24" /> : s.value}
                    </p>
                  </div>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.bg}`}>
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card padding={false}>
            <div className="p-6 pb-2">
              <h2 className="font-semibold text-slate-900">Daily Revenue</h2>
            </div>
            <div className="h-64 px-4 pb-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rev?.daily || []}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis
                    dataKey="date"
                    tick={CHART_AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(d) =>
                      new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })
                    }
                  />
                  <YAxis
                    tick={CHART_AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    {...CHART_TOOLTIP}
                    formatter={(v: number) => [formatCurrency(v, currency), 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={CHART_COLORS.primary}
                    strokeWidth={2.5}
                    fill="url(#revGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Top products */}
            <Card>
              <h2 className="font-semibold text-slate-900 mb-4">Top Selling Products</h2>
              <div className="space-y-3">
                {(
                  (topProducts as {
                    productId: string;
                    name: string;
                    revenue: number;
                    quantity: number;
                  }[]) || []
                )
                  .slice(0, 8)
                  .map((p, i) => (
                    <div key={p.productId} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.quantity} units sold</p>
                      </div>
                      <span className="text-sm font-bold text-slate-900">
                        {formatCurrency(p.revenue, currency)}
                      </span>
                    </div>
                  ))}
                {!topProducts && <Skeleton className="h-48 w-full" />}
              </div>
            </Card>

            {/* Payment methods */}
            <Card>
              <h2 className="font-semibold text-slate-900 mb-4">Revenue by Payment Method</h2>
              {rev?.byPaymentMethod && Object.keys(rev.byPaymentMethod).length > 0 ? (
                <>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(rev.byPaymentMethod).map(([k, v]) => ({
                            name: k,
                            value: v,
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={65}
                          dataKey="value"
                        >
                          {Object.keys(rev.byPaymentMethod).map((_, i) => (
                            <Cell key={i} fill={CHART_SERIES[i % CHART_SERIES.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          {...CHART_TOOLTIP}
                          formatter={(v: number) => formatCurrency(v, currency)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-2">
                    {Object.entries(rev.byPaymentMethod).map(([method, amount], i) => (
                      <div key={method} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ background: CHART_SERIES[i % CHART_SERIES.length] }}
                          />
                          <span className="text-slate-600">{method}</span>
                        </div>
                        <span className="font-semibold">{formatCurrency(amount, currency)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center">
                  <p className="text-sm font-semibold text-slate-700">No data for this period</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Expand the date range or complete a few POS/invoice transactions to populate
                    payment analytics.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <Link
                      to="/pos"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Open POS
                    </Link>
                    <Link
                      to="/invoices/new"
                      className="rounded-lg bg-primary-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-600"
                    >
                      Create invoice
                    </Link>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* P&L Tab */}
      {activeTab === 'pnl' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Revenue',
                value: formatCurrency(pl?.revenue?.total || 0, currency),
                positive: true,
              },
              {
                label: 'Gross Profit',
                value: formatCurrency(pl?.grossProfit || 0, currency),
                sub: formatPercent(pl?.grossMargin || 0) + ' margin',
                positive: (pl?.grossProfit || 0) >= 0,
              },
              {
                label: 'Total Expenses',
                value: formatCurrency(pl?.totalExpenses || 0, currency),
                positive: false,
              },
              {
                label: 'Net Profit',
                value: formatCurrency(pl?.netProfit || 0, currency),
                sub: formatPercent(pl?.netMargin || 0) + ' margin',
                positive: (pl?.netProfit || 0) >= 0,
              },
            ].map((s) => (
              <Card key={s.label}>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p
                  className={`text-xl font-bold mt-1 ${s.positive ? 'text-slate-900' : 'text-red-600'}`}
                >
                  {pnlLoading ? <Skeleton className="h-6 w-24 inline-block" /> : s.value}
                </p>
                {s.sub && <p className="text-xs text-slate-400 mt-1">{s.sub}</p>}
              </Card>
            ))}
          </div>

          <Card>
            <h2 className="font-semibold text-slate-900 mb-4">Expenses by Category</h2>
            {pl?.expenseByCategory && Object.keys(pl.expenseByCategory).length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.entries(pl.expenseByCategory).map(([cat, amt]) => ({
                      category: cat,
                      amount: amt,
                    }))}
                  >
                    <CartesianGrid {...CHART_GRID} />
                    <XAxis dataKey="category" tick={CHART_AXIS_TICK} />
                    <YAxis tick={CHART_AXIS_TICK} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      {...CHART_TOOLTIP}
                      formatter={(v: number) => [formatCurrency(v, currency), 'Amount']}
                    />
                    <Bar dataKey="amount" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center">
                <p className="text-sm font-semibold text-slate-700">
                  No expense data for this period
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Add expenses or expand your range to visualize category-level cost pressure.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <Link
                    to="/expenses"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Record expense
                  </Link>
                  <Link
                    to="/help"
                    className="rounded-lg bg-primary-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-600"
                  >
                    Open reporting guide
                  </Link>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Products', value: iv?.totalProducts || 0 },
              {
                label: 'Stock Cost Value',
                value: formatCurrency(iv?.totalCostValue || 0, currency),
              },
              {
                label: 'Stock Sell Value',
                value: formatCurrency(iv?.totalSellValue || 0, currency),
              },
              {
                label: 'Potential Profit',
                value: formatCurrency(iv?.potentialProfit || 0, currency),
              },
            ].map((s) => (
              <Card key={s.label}>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{s.value}</p>
              </Card>
            ))}
          </div>

          <Card>
            <h2 className="font-semibold text-slate-900 mb-4">Inventory Value by Category</h2>
            {iv?.byCategory && Object.keys(iv.byCategory).length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.entries(iv.byCategory).map(([cat, d]) => ({
                      category: cat,
                      cost: d.costValue,
                      sell: d.sellValue,
                    }))}
                  >
                    <CartesianGrid {...CHART_GRID} />
                    <XAxis dataKey="category" tick={CHART_AXIS_TICK} />
                    <YAxis
                      tick={CHART_AXIS_TICK}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      {...CHART_TOOLTIP}
                      formatter={(v: number) => formatCurrency(v, currency)}
                    />
                    <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                    <Bar
                      dataKey="cost"
                      name="Cost Value"
                      fill={CHART_COLORS.slateBar}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="sell"
                      name="Sell Value"
                      fill={CHART_COLORS.primary}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center">
                <p className="text-sm font-semibold text-slate-700">
                  No inventory data in this range
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Add products or stock movements to unlock category valuation and tied-up capital
                  insight.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <Link
                    to="/inventory/new"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Add product
                  </Link>
                  <Link
                    to="/purchase-orders"
                    className="rounded-lg bg-primary-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-600"
                  >
                    Create purchase order
                  </Link>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <Card>
          <h2 className="font-semibold text-slate-900 mb-4">Top Customers by Lifetime Value</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Total Purchases</th>
                  <th className="pb-3">Outstanding</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerInsights.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50">
                    <td className="py-3">
                      <p className="text-sm font-medium text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.email || 'No email'}</p>
                    </td>
                    <td className="py-3 text-sm font-semibold text-slate-900">
                      {formatCurrency(c.totalPurchases, currency)}
                    </td>
                    <td className="py-3 text-sm">
                      {c.outstandingBalance > 0 ? (
                        <span className="text-red-600 font-medium">
                          {formatCurrency(c.outstandingBalance, currency)}
                        </span>
                      ) : (
                        <span className="text-green-600">Paid up</span>
                      )}
                    </td>
                    <td className="py-3">
                      <Badge variant={c.outstandingBalance > 0 ? 'warning' : 'success'}>
                        {c.outstandingBalance > 0 ? 'Owes balance' : 'Good standing'}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {customerInsights.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center">
                      <p className="text-sm font-semibold text-slate-700">
                        No customer insight data yet
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Add customers and attach sales or invoices to reveal lifetime value trends.
                      </p>
                      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                        <Link
                          to="/customers"
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          Open customers
                        </Link>
                        <Link
                          to="/pos"
                          className="rounded-lg bg-primary-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-600"
                        >
                          Record sale
                        </Link>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

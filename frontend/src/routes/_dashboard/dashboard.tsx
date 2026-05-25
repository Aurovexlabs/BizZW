import { createFileRoute, Link } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowRight,
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Badge, Card, Skeleton, StatCard } from '../../components/ui';
import {
  useDashboardKPIs,
  useLowStockProducts,
  useProfitLoss,
  useRevenueReport,
  useTodaySales,
  useTopProducts,
} from '../../hooks/useApi';
import { getDisplayFirstName, getGreetingForDate } from '../../lib/greeting';
import { Currency } from '../../shared/types';
import { formatCurrency, formatPercent } from '../../shared/utils';
import { useAuthStore } from '../../store/auth.store';

const RevenueAnalyticsSection = lazy(
  () => import('../../components/dashboard/RevenueAnalyticsSection')
);
const TopProductsRevenueCard = lazy(
  () => import('../../components/dashboard/TopProductsRevenueCard')
);

export const Route = createFileRoute('/_dashboard/dashboard')({
  component: DashboardPage,
});

type DatePreset = '7d' | '30d' | '90d' | 'mtd';

type RevenueReport = {
  totalRevenue: number;
  posRevenue: number;
  invoiceRevenue: number;
  totalTransactions: number;
  daily: { date: string; revenue: number }[];
  byPaymentMethod: Record<string, number>;
};

type ProfitLossReport = {
  revenue: { total: number; sales: number; invoices: number };
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  totalExpenses: number;
  netProfit: number;
  netMargin: number;
};

type TopProduct = {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
};

type RevenueSeriesPoint = {
  date: string;
  revenue: number;
  movingAverage: number;
  previousRevenue: number;
  cumulativeRevenue: number;
};

type DateRange = {
  startDate: string;
  endDate: string;
};

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'mtd', label: 'Month to date' },
];

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getDateRangeFromPreset(preset: DatePreset): DateRange {
  const end = new Date();
  const start = new Date(end);

  if (preset === '7d') {
    start.setDate(end.getDate() - 6);
  } else if (preset === '30d') {
    start.setDate(end.getDate() - 29);
  } else if (preset === '90d') {
    start.setDate(end.getDate() - 89);
  } else {
    start.setDate(1);
  }

  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  };
}

function getRangeDayCount(range: DateRange): number {
  const start = parseDateInput(range.startDate);
  const end = parseDateInput(range.endDate);
  const oneDayMs = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / oneDayMs) + 1);
}

function getPreviousDateRange(currentRange: DateRange): DateRange {
  const dayCount = getRangeDayCount(currentRange);
  const currentStart = parseDateInput(currentRange.startDate);
  const previousEnd = addDays(currentStart, -1);
  const previousStart = addDays(previousEnd, -(dayCount - 1));

  return {
    startDate: toDateInputValue(previousStart),
    endDate: toDateInputValue(previousEnd),
  };
}

function getDateKeys(range: DateRange): string[] {
  const keys: string[] = [];
  const cursor = parseDateInput(range.startDate);
  const end = parseDateInput(range.endDate);

  while (cursor <= end) {
    keys.push(toDateInputValue(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

function normalizeDailyRevenue(daily: { date: string; revenue: number }[], range: DateRange) {
  const map = new Map<string, number>();

  for (const point of daily) {
    const dateKey = point.date.slice(0, 10);
    map.set(dateKey, (map.get(dateKey) || 0) + point.revenue);
  }

  return getDateKeys(range).map((date) => ({
    date,
    revenue: map.get(date) || 0,
  }));
}

function labelForPreset(preset: DatePreset): string {
  return DATE_PRESETS.find((item) => item.value === preset)?.label ?? '30 days';
}

function RevenueAnalyticsFallback() {
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2" padding={false}>
        <div className="p-6 pb-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="h-56 px-2 pb-4">
          <Skeleton className="h-full w-full" />
        </div>
      </Card>
      <Card>
        <Skeleton className="h-5 w-32 mb-3" />
        <Skeleton className="h-36 w-full" />
        <div className="space-y-2 mt-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </Card>
    </div>
  );
}

function TopProductsCardFallback() {
  return (
    <Card className="lg:col-span-2" padding={false}>
      <div className="p-6 pb-2">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-4 w-56 mt-2" />
      </div>
      <div className="h-72 px-2 pb-4">
        <Skeleton className="h-full w-full" />
      </div>
    </Card>
  );
}

function DashboardPage() {
  const { tenant, user } = useAuthStore();
  const currency = (tenant?.settings?.currency as Currency) || Currency.USD;
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const range = useMemo(() => getDateRangeFromPreset(datePreset), [datePreset]);
  const previousRange = useMemo(() => getPreviousDateRange(range), [range]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs();
  const {
    data: revenue,
    isLoading: revenueLoading,
    isError: revenueError,
    refetch: refetchRevenue,
  } = useRevenueReport(range);
  const {
    data: previousRevenue,
    isLoading: previousRevenueLoading,
    isError: previousRevenueError,
    refetch: refetchPreviousRevenue,
  } = useRevenueReport(previousRange);
  const {
    data: profitLoss,
    isLoading: profitLossLoading,
    isError: profitLossError,
  } = useProfitLoss(range);
  const {
    data: topProducts,
    isLoading: topProductsLoading,
    isError: topProductsError,
    refetch: refetchTopProducts,
  } = useTopProducts(range);
  const { data: today, isLoading: todayLoading } = useTodaySales();
  const { data: lowStock, isLoading: lowStockLoading } = useLowStockProducts();

  const revenueReport = revenue as RevenueReport | undefined;
  const previousRevenueReport = previousRevenue as RevenueReport | undefined;
  const profitLossReport = profitLoss as ProfitLossReport | undefined;
  const topProductList = useMemo(
    () => (topProducts as TopProduct[] | undefined) || [],
    [topProducts]
  );

  const revenueAnalyticsLoading = revenueLoading || previousRevenueLoading;
  const revenueAnalyticsError = revenueError || previousRevenueError;
  const dashboardPartialError = profitLossError || topProductsError;

  const revenueSeries = useMemo<RevenueSeriesPoint[]>(() => {
    const currentDaily = normalizeDailyRevenue(revenueReport?.daily || [], range);
    const previousDaily = normalizeDailyRevenue(previousRevenueReport?.daily || [], previousRange);

    let cumulativeRevenue = 0;
    const rollingWindow: number[] = [];

    return currentDaily.map((point, index) => {
      cumulativeRevenue += point.revenue;
      rollingWindow.push(point.revenue);
      if (rollingWindow.length > 7) rollingWindow.shift();

      const movingAverage =
        rollingWindow.length > 0
          ? rollingWindow.reduce((sum, value) => sum + value, 0) / rollingWindow.length
          : 0;

      return {
        date: point.date,
        revenue: point.revenue,
        previousRevenue: previousDaily[index]?.revenue || 0,
        movingAverage,
        cumulativeRevenue,
      };
    });
  }, [range, revenueReport?.daily, previousRange, previousRevenueReport?.daily]);

  const paymentData = useMemo(() => {
    const byPaymentMethod = revenueReport?.byPaymentMethod || {};

    return Object.entries(byPaymentMethod)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [revenueReport?.byPaymentMethod]);

  const topProductChartData = useMemo(() => {
    return topProductList.slice(0, 6).map((item) => ({
      ...item,
      shortName: item.name.length > 22 ? `${item.name.slice(0, 22)}...` : item.name,
    }));
  }, [topProductList]);

  const firstName = getDisplayFirstName(user?.name);
  const greeting = getGreetingForDate(currentTime);
  const periodLabel = labelForPreset(datePreset);
  const periodRevenueChange = useMemo(() => {
    const currentTotal = revenueReport?.totalRevenue || 0;
    const previousTotal = previousRevenueReport?.totalRevenue || 0;

    if (previousTotal <= 0) return currentTotal > 0 ? 100 : 0;
    return ((currentTotal - previousTotal) / previousTotal) * 100;
  }, [previousRevenueReport?.totalRevenue, revenueReport?.totalRevenue]);

  const profitRevenue = profitLossReport?.revenue?.total || 0;
  const cogsRatio = profitRevenue > 0 ? (profitLossReport?.cogs || 0) / profitRevenue : 0;
  const expenseRatio =
    profitRevenue > 0 ? (profitLossReport?.totalExpenses || 0) / profitRevenue : 0;
  const netRatio = profitRevenue > 0 ? (profitLossReport?.netProfit || 0) / profitRevenue : 0;

  const retryRevenueAnalytics = () => {
    void Promise.all([refetchRevenue(), refetchPreviousRevenue()]);
  };

  const retryTopProducts = () => {
    void refetchTopProducts();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting}, {firstName}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time business pulse for {tenant?.name}.
          </p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => setDatePreset(preset.value)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                datePreset === preset.value
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <Link
            to="/reports"
            className="ml-1 inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Full reports
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(kpis?.monthlyRevenue || 0, currency)}
          change={kpis?.revenueGrowth}
          icon={<DollarSign className="w-5 h-5 text-primary-700" />}
          iconBg="bg-primary-50"
          loading={kpisLoading}
        />
        <StatCard
          title={`${periodLabel} Revenue`}
          value={formatCurrency(revenueReport?.totalRevenue || 0, currency)}
          change={periodRevenueChange}
          icon={<TrendingUp className="w-5 h-5 text-accent-700" />}
          iconBg="bg-accent-50"
          loading={revenueLoading}
        />
        <StatCard
          title="Net Profit"
          value={formatCurrency(profitLossReport?.netProfit || 0, currency)}
          change={profitLossReport?.netMargin}
          icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
          iconBg="bg-amber-50"
          loading={profitLossLoading}
        />
        <StatCard
          title="Overdue Invoices"
          value={kpis?.overdueInvoices || 0}
          icon={<Users className="w-5 h-5 text-purple-600" />}
          iconBg="bg-purple-50"
          loading={kpisLoading}
        />
      </div>

      <Suspense fallback={<RevenueAnalyticsFallback />}>
        <RevenueAnalyticsSection
          analyticsError={revenueAnalyticsError}
          analyticsLoading={revenueAnalyticsLoading}
          currency={currency}
          onRetry={retryRevenueAnalytics}
          paymentData={paymentData}
          periodLabel={periodLabel}
          revenueSeries={revenueSeries}
          today={today}
          todayLoading={todayLoading}
        />
      </Suspense>

      <div className="grid lg:grid-cols-3 gap-6">
        <Suspense fallback={<TopProductsCardFallback />}>
          <TopProductsRevenueCard
            currency={currency}
            data={topProductChartData}
            error={topProductsError}
            loading={topProductsLoading}
            onRetry={retryTopProducts}
            periodLabel={periodLabel}
          />
        </Suspense>

        <Card>
          <h2 className="font-semibold text-slate-900 mb-1">Profit Health</h2>
          <p className="text-sm text-slate-500 mb-5">
            How efficiently revenue is turning into profit
          </p>

          {dashboardPartialError && !profitLossLoading && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Some analytics panels are partially unavailable.
            </div>
          )}

          {profitLossLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-sm text-slate-600">Gross margin</span>
                <Badge
                  variant={
                    profitLossReport && profitLossReport.grossMargin >= 35 ? 'success' : 'warning'
                  }
                >
                  {formatPercent(profitLossReport?.grossMargin || 0)}
                </Badge>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                    <span>Cost of goods</span>
                    <span>{formatPercent(cogsRatio * 100)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-amber-400"
                      style={{ width: `${Math.min(cogsRatio * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                    <span>Operating expenses</span>
                    <span>{formatPercent(expenseRatio * 100)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-red-400"
                      style={{ width: `${Math.min(expenseRatio * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                    <span>Net margin</span>
                    <span>{formatPercent(netRatio * 100)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${netRatio >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(Math.abs(netRatio) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-100 p-3 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-slate-500">Revenue</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(profitLossReport?.revenue?.total || 0, currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Net profit</span>
                  <span
                    className={`font-semibold ${(profitLossReport?.netProfit || 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}
                  >
                    {formatCurrency(profitLossReport?.netProfit || 0, currency)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Low stock alert + quick actions */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Low stock */}
        <Card padding={false}>
          <div className="p-6 pb-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-500" /> Low Stock Alerts
              </h2>
              <p className="text-sm text-slate-500">
                {lowStock?.length || 0} products need restocking
              </p>
            </div>
            <Link
              to="/inventory"
              search={{ lowStock: true }}
              className="text-sm text-primary-700 font-medium hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {lowStockLoading && (
              <div className="px-6 py-4 space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-5 w-3/5" />
              </div>
            )}

            {!lowStockLoading &&
              lowStock?.slice(0, 5).map((p) => (
                <div key={p._id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-400">
                      {p.sku} · {p.category}
                    </p>
                  </div>
                  <Badge variant={p.quantity === 0 ? 'danger' : 'warning'}>
                    {p.quantity === 0 ? 'Out of stock' : `${p.quantity} left`}
                  </Badge>
                </div>
              ))}

            {!lowStockLoading && (!lowStock || lowStock.length === 0) && (
              <div className="px-6 py-8 text-center text-sm text-slate-400">
                ✅ All products are well stocked
              </div>
            )}
          </div>
        </Card>

        {/* Quick actions */}
        <div className="space-y-4">
          <h2 className="font-semibold text-slate-900 px-1">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: 'New Sale',
                desc: 'Open POS',
                icon: ShoppingCart,
                to: '/pos',
                color: 'bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100',
              },
              {
                label: 'New Invoice',
                desc: 'Create invoice',
                icon: TrendingUp,
                to: '/invoices/new',
                color: 'bg-accent-50 text-accent-700 border-accent-200 hover:bg-accent-100',
              },
              {
                label: 'Add Product',
                desc: 'Add to inventory',
                icon: Package,
                to: '/inventory/new',
                color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
              },
              {
                label: 'Add Customer',
                desc: 'New customer profile',
                icon: Users,
                to: '/customers',
                color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
              },
            ].map((a) => (
              <Link
                key={a.label}
                to={a.to}
                className={`border rounded-xl p-4 transition-all duration-150 hover:shadow-sm ${a.color}`}
              >
                <a.icon className="w-6 h-6 mb-2" />
                <p className="font-semibold text-sm">{a.label}</p>
                <p className="text-xs opacity-70">{a.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

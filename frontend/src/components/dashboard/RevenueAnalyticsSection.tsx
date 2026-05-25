import { RefreshCw } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CHART_AXIS_TICK,
  CHART_COLORS,
  CHART_GRID,
  CHART_SERIES,
  CHART_TOOLTIP,
} from '../../lib/chartTheme';
import { Currency } from '../../shared/types';
import { formatCurrency } from '../../shared/utils';
import { Button, Card, Skeleton } from '../ui';

type RevenueSeriesPoint = {
  date: string;
  revenue: number;
  movingAverage: number;
  previousRevenue: number;
  cumulativeRevenue: number;
};

type PaymentPoint = {
  name: string;
  value: number;
};

type TodaySnapshot = {
  totalRevenue: number;
  totalTransactions: number;
};

interface RevenueAnalyticsSectionProps {
  analyticsError: boolean;
  analyticsLoading: boolean;
  currency: Currency;
  onRetry: () => void;
  paymentData: PaymentPoint[];
  periodLabel: string;
  revenueSeries: RevenueSeriesPoint[];
  today?: TodaySnapshot;
  todayLoading: boolean;
}

function compactCurrencyTick(value: number, currency: Currency): string {
  const compact = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

  return currency === Currency.USD ? `$${compact}` : `ZiG ${compact}`;
}

export default function RevenueAnalyticsSection({
  analyticsError,
  analyticsLoading,
  currency,
  onRetry,
  paymentData,
  periodLabel,
  revenueSeries,
  today,
  todayLoading,
}: RevenueAnalyticsSectionProps) {
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2" padding={false}>
        <div className="p-6 pb-2">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Revenue Momentum</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Current period vs previous period with 7-day moving average ({periodLabel})
          </p>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-5 rounded-full" style={{ background: CHART_COLORS.primary }} />
              Current period
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                className="h-2 w-5 rounded-full border border-slate-400 dark:border-slate-500"
                style={{ background: CHART_COLORS.grid }}
              />
              Previous period
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-5 rounded-full" style={{ background: CHART_COLORS.success }} />
              7-day moving avg
            </span>
          </div>
        </div>

        <div className="h-56 px-2">
          {analyticsError ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-sm text-slate-500 dark:text-slate-400">
              <p>Could not load revenue analytics right now.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                icon={<RefreshCw className="w-4 h-4" />}
              >
                Retry
              </Button>
            </div>
          ) : analyticsLoading ? (
            <div className="h-full p-4">
              <Skeleton className="h-full w-full" />
            </div>
          ) : revenueSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueSeries}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...CHART_GRID} />
                <XAxis
                  dataKey="date"
                  tick={{ ...CHART_AXIS_TICK, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(d) =>
                    new Date(d).toLocaleDateString('en', {
                      month: 'short',
                      day: 'numeric',
                    })
                  }
                />
                <YAxis
                  tick={{ ...CHART_AXIS_TICK, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => compactCurrencyTick(v, currency)}
                />
                <Tooltip
                  {...CHART_TOOLTIP}
                  cursor={{ fill: CHART_COLORS.tooltipCursor }}
                  formatter={(value: number, name: string) => {
                    if (name === 'movingAverage') {
                      return [formatCurrency(value, currency), '7-day avg'];
                    }
                    if (name === 'previousRevenue') {
                      return [formatCurrency(value, currency), 'Previous period'];
                    }
                    return [formatCurrency(value, currency), 'Current period'];
                  }}
                  labelFormatter={(label) =>
                    new Date(label).toLocaleDateString('en', {
                      month: 'long',
                      day: 'numeric',
                    })
                  }
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2}
                  fill="url(#revenueGrad)"
                />
                <Line
                  type="monotone"
                  dataKey="previousRevenue"
                  stroke={CHART_COLORS.neutral}
                  strokeWidth={1.8}
                  strokeDasharray="6 4"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="movingAverage"
                  stroke={CHART_COLORS.success}
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-slate-400 dark:text-slate-500">
              No revenue data for this period
            </div>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold text-slate-900 dark:text-slate-100">Revenue Mix</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Payment method split ({periodLabel})
        </p>
        {paymentData.length > 0 ? (
          <>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {paymentData.map((_, i) => (
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
            <div className="space-y-2 mt-3">
              {paymentData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ background: CHART_SERIES[i % CHART_SERIES.length] }}
                    />
                    <span className="text-slate-600 dark:text-slate-300">{d.name}</span>
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(d.value, currency)}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
            No payment data for this period
          </div>
        )}

        {todayLoading ? (
          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-4 w-20" />
          </div>
        ) : today ? (
          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Total today</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(today.totalRevenue, currency)}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-slate-500 dark:text-slate-400">Transactions</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {today.totalTransactions}
              </span>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

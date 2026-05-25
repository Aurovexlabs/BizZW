import { RefreshCw } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART_AXIS_TICK, CHART_COLORS, CHART_GRID, CHART_TOOLTIP } from '../../lib/chartTheme';
import { Currency } from '../../shared/types';
import { formatCurrency } from '../../shared/utils';
import { Button, Card, Skeleton } from '../ui';

type TopProductChartPoint = {
  name: string;
  shortName: string;
  revenue: number;
};

interface TopProductsRevenueCardProps {
  currency: Currency;
  data: TopProductChartPoint[];
  error: boolean;
  loading: boolean;
  onRetry: () => void;
  periodLabel: string;
}

function compactCurrencyTick(value: number, currency: Currency): string {
  const compact = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

  return currency === Currency.USD ? `$${compact}` : `ZiG ${compact}`;
}

export default function TopProductsRevenueCard({
  currency,
  data,
  error,
  loading,
  onRetry,
  periodLabel,
}: TopProductsRevenueCardProps) {
  return (
    <Card className="lg:col-span-2" padding={false}>
      <div className="p-6 pb-2">
        <h2 className="font-semibold text-slate-900">Top Revenue Products</h2>
        <p className="text-sm text-slate-500">
          Best performing products in {periodLabel.toLowerCase()}
        </p>
      </div>
      <div className="h-72 px-2 pb-4">
        {error ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-sm text-slate-500">
            <p>Top product analytics are temporarily unavailable.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Retry
            </Button>
          </div>
        ) : loading ? (
          <div className="h-full p-4">
            <Skeleton className="h-full w-full" />
          </div>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
            >
              <CartesianGrid {...CHART_GRID} horizontal={false} />
              <XAxis
                type="number"
                tick={{ ...CHART_AXIS_TICK, fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => compactCurrencyTick(v, currency)}
              />
              <YAxis
                type="category"
                dataKey="shortName"
                width={140}
                tick={CHART_AXIS_TICK}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                {...CHART_TOOLTIP}
                formatter={(v: number) => [formatCurrency(v, currency), 'Revenue']}
                labelFormatter={(_, payload) => {
                  const item = payload?.[0]?.payload as { name?: string } | undefined;
                  return item?.name || 'Product';
                }}
              />
              <Bar dataKey="revenue" fill={CHART_COLORS.primary} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">
            No product sales data for this period
          </div>
        )}
      </div>
    </Card>
  );
}

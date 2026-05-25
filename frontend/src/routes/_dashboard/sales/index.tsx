import { createFileRoute, Link } from '@tanstack/react-router';
import {
  DollarSign,
  ExternalLink,
  Eye,
  ListChecks,
  ShoppingCart,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Select,
  Skeleton,
  StatCard,
} from '../../../components/ui';
import { useSales, useTodaySales } from '../../../hooks/useApi';
import { Currency, ISale, PaymentMethod } from '../../../shared/types';
import { formatCurrency, formatDateTime } from '../../../shared/utils';
import { useAuthStore } from '../../../store/auth.store';

export const Route = createFileRoute('/_dashboard/sales/')({
  component: SalesPage,
});

const PAYMENT_BADGE: Record<string, 'default' | 'success' | 'info' | 'warning'> = {
  CASH: 'default',
  ECOCASH: 'success',
  VISA: 'info',
  BANK_TRANSFER: 'warning',
  PAYNOW: 'info',
};

function SalesPage() {
  const { tenant } = useAuthStore();
  const currency = (tenant?.settings?.currency as Currency) || Currency.USD;
  const [page, setPage] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const hasFilters = Boolean(startDate || endDate || paymentMethod);

  const { data, isLoading } = useSales({
    page,
    limit: 20,
    paymentMethod: paymentMethod || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });
  const { data: today } = useTodaySales();

  const sales = (data?.data || []) as ISale[];
  const meta = data?.meta as { total: number; totalPages: number } | undefined;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sales History</h1>
          <p className="text-sm text-slate-500">{meta?.total || 0} total transactions</p>
        </div>
        <Link to="/pos">
          <Button icon={<ShoppingCart className="w-4 h-4" />}>Open POS</Button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-primary-100 bg-primary-50/40">
          <h2 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary-800">
            <Sparkles className="h-3.5 w-3.5" /> Quick actions
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Move from monitoring to action with direct jumps into linked sales workflows.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link to="/pos" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Process new sale
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/customers" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Open customer ledger
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/reports" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Review performance
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/help" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Open sales playbook
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </Card>

        <Card>
          <h2 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-700">
            <ListChecks className="h-3.5 w-3.5" /> Example workflow
          </h2>
          <ol className="mt-3 space-y-2">
            {[
              'Apply a payment filter first to isolate exceptions by channel.',
              'Review unusually large discounts and verify cashier notes.',
              'Open suspicious transactions to validate line items and tender details.',
              'Escalate disputed receipts to the customer account owner for follow-up.',
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

      {/* Today's summary */}
      {today && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Today's Revenue"
            value={formatCurrency(today.totalRevenue, currency)}
            icon={<DollarSign className="w-5 h-5 text-primary-700" />}
            iconBg="bg-primary-50"
          />
          <StatCard
            title="Today's Transactions"
            value={today.totalTransactions}
            icon={<ShoppingCart className="w-5 h-5 text-accent-700" />}
            iconBg="bg-accent-50"
          />
          {Object.entries(today.byMethod)
            .slice(0, 2)
            .map(([method, amount]) => (
              <StatCard
                key={method}
                title={method}
                value={formatCurrency(amount as number, currency)}
                icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
                iconBg="bg-purple-50"
              />
            ))}
        </div>
      )}

      {/* Filters */}
      <Card padding={false}>
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3">
          <Select
            options={[
              { value: '', label: 'All payment methods' },
              ...Object.values(PaymentMethod).map((m) => ({
                value: m,
                label: m.replace('_', ' '),
              })),
            ]}
            value={paymentMethod}
            onChange={(e) => {
              setPaymentMethod(e.target.value);
              setPage(1);
            }}
            className="w-48"
          />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <span className="text-slate-400 text-sm">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {(startDate || endDate || paymentMethod) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setPaymentMethod('');
                setPage(1);
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['Sale #', 'Date & Time', 'Items', 'Payment', 'Total', 'Change', ''].map((h) => (
                  <th
                    key={h}
                    className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!isLoading &&
                sales.map((sale) => (
                  <tr key={sale._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono font-medium text-slate-700">
                        {sale.saleNumber}
                      </span>
                      <p className="text-xs text-slate-400">{sale.receiptNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {formatDateTime(sale.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-900">
                        {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-slate-400 truncate max-w-[140px]">
                        {sale.items.map((i) => i.productName).join(', ')}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={PAYMENT_BADGE[sale.paymentMethod] || 'default'}>
                        {sale.paymentMethod.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-slate-900">
                        {formatCurrency(sale.total, sale.currency as Currency)}
                      </span>
                      {sale.discount > 0 && (
                        <p className="text-xs text-green-600">
                          -{formatCurrency(sale.discount, sale.currency as Currency)} disc.
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {sale.change > 0
                        ? formatCurrency(sale.change, sale.currency as Currency)
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Link to="/sales/$id" params={{ id: sale._id }}>
                        <Button variant="ghost" size="sm" icon={<Eye className="w-4 h-4" />}>
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {!isLoading && sales.length === 0 && (
            <EmptyState
              icon={<ShoppingCart className="w-8 h-8" />}
              title={hasFilters ? 'No sales match these filters' : 'No sales yet'}
              description={
                hasFilters
                  ? 'Try widening your date range or changing payment filters to find transactions.'
                  : 'Sales will appear here once transactions are processed through POS.'
              }
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {hasFilters && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setStartDate('');
                        setEndDate('');
                        setPaymentMethod('');
                        setPage(1);
                      }}
                    >
                      Clear filters
                    </Button>
                  )}
                  <Link to="/pos">
                    <Button icon={<ShoppingCart className="w-4 h-4" />}>Open POS</Button>
                  </Link>
                </div>
              }
            />
          )}
        </div>

        {meta && meta.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Page {page} of {meta.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= meta.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

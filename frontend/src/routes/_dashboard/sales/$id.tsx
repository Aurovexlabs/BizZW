import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, CheckCircle, Printer } from 'lucide-react';
import { useSale } from '../../../hooks/useApi';
import { Button, Card, Badge, Skeleton } from '../../../components/ui';
import { formatCurrency, formatDateTime } from '../../../shared/utils';
import { useAuthStore } from '../../../store/auth.store';

export const Route = createFileRoute('/_dashboard/sales/$id')({
  component: SaleDetailPage,
});

const PAYMENT_BADGE: Record<string, 'default' | 'success' | 'info' | 'warning'> = {
  CASH: 'default',
  ECOCASH: 'success',
  VISA: 'info',
  BANK_TRANSFER: 'warning',
  PAYNOW: 'info',
};

function SaleDetailPage() {
  const { id } = Route.useParams();
  const { tenant } = useAuthStore();

  const { data: sale, isLoading } = useSale(id);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!sale) return null;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/sales">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{sale.saleNumber}</h1>
          <p className="text-sm text-slate-500">{formatDateTime(sale.createdAt)}</p>
        </div>
      </div>

      <Card>
        <div className="text-center pb-6 border-b border-dashed border-slate-200">
          <div className="w-10 h-10 bg-linear-to-br from-primary-800 to-accent-700 rounded-xl flex items-center justify-center mx-auto mb-2">
            <span className="text-white font-black text-sm">ZW</span>
          </div>
          <h2 className="font-bold text-slate-900">{tenant?.name}</h2>
          {tenant?.settings?.address && (
            <p className="text-xs text-slate-500 mt-0.5">{tenant.settings.address}</p>
          )}
          <p className="text-xs text-slate-400 mt-2">RECEIPT</p>
          <p className="font-mono text-sm font-semibold text-slate-900">{sale.receiptNumber}</p>
        </div>

        <div className="py-4 space-y-3">
          {sale.items.map((item, i) => (
            <div key={i} className="flex items-start justify-between text-sm">
              <div>
                <p className="font-medium text-slate-900">{item.productName}</p>
                <p className="text-xs text-slate-400">
                  {item.quantity} x {formatCurrency(item.unitPrice, sale.currency)}
                </p>
              </div>
              <span className="font-semibold text-slate-900">
                {formatCurrency(item.total, sale.currency)}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-slate-200 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span>{formatCurrency(sale.subtotal, sale.currency)}</span>
          </div>
          {sale.discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-{formatCurrency(sale.discount, sale.currency)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t border-slate-200 pt-2">
            <span>TOTAL</span>
            <span className="text-primary-800">{formatCurrency(sale.total, sale.currency)}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-slate-200 pt-4 mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Payment Method</span>
            <Badge variant={PAYMENT_BADGE[sale.paymentMethod] || 'default'}>
              {sale.paymentMethod.replace('_', ' ')}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Amount Paid</span>
            <span className="font-medium">{formatCurrency(sale.amountPaid, sale.currency)}</span>
          </div>
          {sale.change > 0 && (
            <div className="flex justify-between font-semibold text-green-700">
              <span>Change Given</span>
              <span>{formatCurrency(sale.change, sale.currency)}</span>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-semibold">Transaction Complete</span>
          </div>
          <p className="text-xs text-slate-400">Thank you for your business! 🇿🇼</p>
          <p className="text-xs text-slate-400 mt-1">Powered by BizZW</p>
        </div>
      </Card>

      <div className="flex gap-3 justify-center">
        <Button variant="outline" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
          Print Receipt
        </Button>
        <Link to="/pos">
          <Button>New Sale</Button>
        </Link>
      </div>
    </div>
  );
}

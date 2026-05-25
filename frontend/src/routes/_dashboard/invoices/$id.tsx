import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, CheckCircle, Clock, Send } from 'lucide-react';
import { InvoiceDownloadButton } from '../../../components/InvoiceDownloadButton';
import { Badge, Button, Card, Skeleton } from '../../../components/ui';
import { useInvoice, useMarkInvoicePaid, useSendInvoice } from '../../../hooks/useApi';
import { ICustomer, InvoiceStatus } from '../../../shared/types';
import { formatCurrency, formatDate } from '../../../shared/utils';
import { useAuthStore } from '../../../store/auth.store';

export const Route = createFileRoute('/_dashboard/invoices/$id')({
  component: InvoiceDetailPage,
});

const STATUS_STEPS = [
  InvoiceStatus.DRAFT,
  InvoiceStatus.SENT,
  InvoiceStatus.PARTIALLY_PAID,
  InvoiceStatus.PAID,
];

const STATUS_BADGE_MAP: Record<
  InvoiceStatus,
  'default' | 'info' | 'warning' | 'success' | 'danger'
> = {
  [InvoiceStatus.DRAFT]: 'default',
  [InvoiceStatus.SENT]: 'info',
  [InvoiceStatus.PARTIALLY_PAID]: 'warning',
  [InvoiceStatus.PAID]: 'success',
  [InvoiceStatus.OVERDUE]: 'danger',
  [InvoiceStatus.CANCELLED]: 'default',
};

function InvoiceDetailPage() {
  const { id } = Route.useParams();
  const { tenant } = useAuthStore();

  const { data: invoice, isLoading } = useInvoice(id);
  const sendInvoice = useSendInvoice();
  const markPaid = useMarkInvoicePaid();

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!invoice) return null;

  const customer = invoice.customer as ICustomer | undefined;
  const isOverdue = new Date(invoice.dueDate) < new Date() && invoice.status !== InvoiceStatus.PAID;
  const currentStepIndex = STATUS_STEPS.indexOf(invoice.status as InvoiceStatus);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/invoices">
            <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{invoice.invoiceNumber}</h1>
            <p className="text-sm text-slate-500">Created {formatDate(invoice.createdAt)}</p>
          </div>
          <Badge variant={STATUS_BADGE_MAP[invoice.status as InvoiceStatus]} size="md">
            {invoice.status.replace('_', ' ')}
          </Badge>
          {isOverdue && invoice.status !== InvoiceStatus.PAID && (
            <Badge variant="danger" size="md">
              OVERDUE
            </Badge>
          )}
        </div>

        <div className="flex gap-2">
          {invoice.status === InvoiceStatus.DRAFT && (
            <Button
              variant="outline"
              icon={<Send className="w-4 h-4" />}
              loading={sendInvoice.isPending}
              onClick={() => sendInvoice.mutate(id)}
            >
              Send
            </Button>
          )}
          {[InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE].includes(
            invoice.status as InvoiceStatus
          ) && (
            <Button
              variant="secondary"
              icon={<CheckCircle className="w-4 h-4" />}
              loading={markPaid.isPending}
              onClick={() => markPaid.mutate({ id })}
            >
              Mark Paid
            </Button>
          )}
          {invoice && tenant && (
            <InvoiceDownloadButton
              invoice={invoice}
              businessName={tenant.name}
              businessAddress={tenant.settings?.address}
              businessPhone={tenant.settings?.phone}
              businessEmail={tenant.email}
              className="inline-flex items-center gap-2 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            />
          )}
        </div>
      </div>

      {/* Status timeline */}
      {invoice.status !== InvoiceStatus.CANCELLED && (
        <Card>
          <div className="flex items-center gap-0">
            {STATUS_STEPS.map((step, i) => {
              const done = i <= currentStepIndex;
              const active = i === currentStepIndex;
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${done ? 'bg-primary-700 text-white' : 'bg-slate-100 text-slate-400'}`}
                    >
                      {done ? '✓' : i + 1}
                    </div>
                    <p
                      className={`text-xs mt-1 font-medium ${active ? 'text-primary-700' : done ? 'text-slate-600' : 'text-slate-400'}`}
                    >
                      {step.replace('_', ' ')}
                    </p>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${i < currentStepIndex ? 'bg-primary-700' : 'bg-slate-200'}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Invoice body */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <div className="grid sm:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Bill To
                </p>
                <p className="font-bold text-slate-900">{customer?.name || '—'}</p>
                {customer?.email && <p className="text-sm text-slate-500">{customer.email}</p>}
                {customer?.phone && <p className="text-sm text-slate-500">{customer.phone}</p>}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Invoice Details
                </p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Invoice #</span>
                    <span className="font-mono font-semibold">{invoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Due Date</span>
                    <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                      {formatDate(invoice.dueDate)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Currency</span>
                    <span>{invoice.currency}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Line items */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-left">
                    {['Description', 'Qty', 'Unit Price', 'Total'].map((h) => (
                      <th
                        key={h}
                        className="text-xs font-semibold text-slate-500 uppercase tracking-wider pb-2 last:text-right"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.lineItems.map((item, i) => (
                    <tr key={i}>
                      <td className="py-3 text-sm font-medium text-slate-900">
                        {item.productName}
                      </td>
                      <td className="py-3 text-sm text-slate-600">{item.quantity}</td>
                      <td className="py-3 text-sm text-slate-600">
                        {formatCurrency(item.unitPrice, invoice.currency)}
                      </td>
                      <td className="py-3 text-sm font-semibold text-slate-900 text-right">
                        {formatCurrency(item.total, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
              <div className="w-56 space-y-2">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Tax ({invoice.taxRate ?? 0}%)</span>
                  <span>{formatCurrency(invoice.tax, invoice.currency)}</span>
                </div>
                {invoice.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(invoice.discount, invoice.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t border-slate-200 pt-2">
                  <span>Total</span>
                  <span className="text-primary-800">
                    {formatCurrency(invoice.total, invoice.currency)}
                  </span>
                </div>
              </div>
            </div>

            {invoice.notes && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Notes
                </p>
                <p className="text-sm text-slate-600">{invoice.notes}</p>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Payment Summary
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Amount Due</span>
                <span className="font-bold text-lg text-primary-800">
                  {formatCurrency(invoice.total, invoice.currency)}
                </span>
              </div>
              {invoice.paidAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Paid On</span>
                  <span className="text-green-600 font-medium">{formatDate(invoice.paidAt)}</span>
                </div>
              )}
              {invoice.paynowRef && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Paynow Ref</span>
                  <span className="font-mono text-xs">{invoice.paynowRef}</span>
                </div>
              )}
            </div>
          </Card>

          {invoice.status === InvoiceStatus.PAID && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="font-semibold text-green-800">Payment Received</p>
              <p className="text-sm text-green-600">
                {invoice.paidAt ? formatDate(invoice.paidAt) : ''}
              </p>
            </div>
          )}

          {isOverdue && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <Clock className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="font-semibold text-red-800">Payment Overdue</p>
              <p className="text-sm text-red-600">Due {formatDate(invoice.dueDate)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

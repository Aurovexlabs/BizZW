import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Edit2, Save, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Avatar, Badge, Button, Card, Input, Skeleton } from '../../../components/ui';
import { useCustomer, useUpdateCustomer } from '../../../hooks/useApi';
import { Currency, ICustomer, IInvoice, InvoiceStatus, ISale } from '../../../shared/types';
import { formatCurrency, formatDate, formatDateTime } from '../../../shared/utils';
import { useAuthStore } from '../../../store/auth.store';

export const Route = createFileRoute('/_dashboard/customers/$id')({
  component: CustomerDetailPage,
});

function CustomerDetailPage() {
  const { id } = Route.useParams();
  const { tenant } = useAuthStore();
  const currency = (tenant?.settings?.currency as Currency) || Currency.USD;
  const [editing, setEditing] = useState(false);

  const { data, isLoading } = useCustomer(id);
  const updateCustomer = useUpdateCustomer();

  const { register, handleSubmit, reset } = useForm({
    values: data?.customer
      ? {
          name: data.customer.name,
          email: data.customer.email || '',
          phone: data.customer.phone || '',
          address: data.customer.address || '',
        }
      : undefined,
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="lg:col-span-2 h-48" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { customer, invoices, sales } = data;

  function onSave(formData: Partial<ICustomer>) {
    updateCustomer.mutate({ id, data: formData }, { onSuccess: () => setEditing(false) });
  }

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

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/customers">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Customer Profile</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <Card>
          <div className="text-center mb-4">
            <Avatar name={customer.name} size="xl" />
            <h2 className="font-bold text-slate-900 text-lg mt-3">{customer.name}</h2>
          </div>

          {!editing ? (
            <>
              <div className="space-y-2 text-sm mb-4">
                {[
                  { label: 'Email', value: customer.email },
                  { label: 'Phone', value: customer.phone },
                  { label: 'Address', value: customer.address },
                ].map(({ label, value }) =>
                  value ? (
                    <div key={label}>
                      <span className="text-slate-400 text-xs uppercase tracking-wide">
                        {label}
                      </span>
                      <p className="text-slate-700 font-medium">{value}</p>
                    </div>
                  ) : null
                )}
                <div>
                  <span className="text-slate-400 text-xs uppercase tracking-wide">
                    Customer since
                  </span>
                  <p className="text-slate-700 font-medium">{formatDate(customer.createdAt)}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                icon={<Edit2 className="w-3.5 h-3.5" />}
                onClick={() => setEditing(true)}
              >
                Edit Profile
              </Button>
            </>
          ) : (
            <form onSubmit={handleSubmit(onSave as never)} className="space-y-3">
              <Input label="Name" {...register('name')} />
              <Input label="Email" type="email" {...register('email')} />
              <Input label="Phone" {...register('phone')} />
              <Input label="Address" {...register('address')} />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  className="flex-1"
                  loading={updateCustomer.isPending}
                  icon={<Save className="w-3.5 h-3.5" />}
                >
                  Save
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditing(false);
                    reset();
                  }}
                  icon={<X className="w-3.5 h-3.5" />}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Stats */}
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total Purchases</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(customer.totalPurchases, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Outstanding</span>
              {customer.outstandingBalance > 0 ? (
                <span className="font-bold text-red-600">
                  {formatCurrency(customer.outstandingBalance, currency)}
                </span>
              ) : (
                <Badge variant="success">All paid</Badge>
              )}
            </div>
          </div>
        </Card>

        {/* History */}
        <div className="lg:col-span-2 space-y-5">
          {/* Invoices */}
          <Card padding={false}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Recent Invoices</h3>
              <Link to="/invoices" className="text-sm text-primary-700 hover:underline font-medium">
                View all
              </Link>
            </div>
            {invoices.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {(invoices as IInvoice[]).map((inv) => (
                  <div key={inv._id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <Link
                        to="/invoices/$id"
                        params={{ id: inv._id }}
                        className="text-sm font-mono font-medium text-primary-700 hover:underline"
                      >
                        {inv.invoiceNumber}
                      </Link>
                      <p className="text-xs text-slate-400">{formatDate(inv.createdAt)}</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <Badge variant={STATUS_BADGE_MAP[inv.status as InvoiceStatus]} size="sm">
                        {inv.status.replace('_', ' ')}
                      </Badge>
                      <span className="text-sm font-bold text-slate-900">
                        {formatCurrency(inv.total, inv.currency as Currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-center">
                <p className="text-sm font-medium text-slate-600">No invoices yet</p>
                <p className="mt-1 text-xs text-slate-500">
                  Create the first invoice for this customer to start tracking receivables.
                </p>
                <div className="mt-3">
                  <Link to="/invoices/new">
                    <Button variant="outline" size="sm">
                      Create Invoice
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </Card>

          {/* Sales */}
          <Card padding={false}>
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Recent POS Sales</h3>
            </div>
            {sales.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {(sales as ISale[]).map((sale) => (
                  <div key={sale._id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-mono font-medium text-slate-700">
                        {sale.saleNumber}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatDateTime(sale.createdAt)} · {sale.paymentMethod}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">
                        {formatCurrency(sale.total, sale.currency as Currency)}
                      </p>
                      <p className="text-xs text-slate-400">{sale.items.length} items</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-center">
                <p className="text-sm font-medium text-slate-600">No POS sales linked</p>
                <p className="mt-1 text-xs text-slate-500">
                  Process a sale and attach this customer profile to build purchase history.
                </p>
                <div className="mt-3">
                  <Link to="/pos">
                    <Button variant="outline" size="sm">
                      Open POS
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

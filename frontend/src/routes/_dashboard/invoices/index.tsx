import { createFileRoute, Link } from '@tanstack/react-router';
import {
  CheckCircle,
  ExternalLink,
  FileText,
  ListChecks,
  Plus,
  Send,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Select,
  Skeleton,
} from '../../../components/ui';
import {
  useDeleteInvoice,
  useInvoices,
  useMarkInvoicePaid,
  useSendInvoice,
} from '../../../hooks/useApi';
import { IInvoice, InvoiceStatus } from '../../../shared/types';
import { formatCurrency, formatDate } from '../../../shared/utils';

export const Route = createFileRoute('/_dashboard/invoices/')({
  component: InvoicesPage,
});

const STATUS_BADGE: Record<InvoiceStatus, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
  [InvoiceStatus.DRAFT]: 'default',
  [InvoiceStatus.SENT]: 'info',
  [InvoiceStatus.PARTIALLY_PAID]: 'warning',
  [InvoiceStatus.PAID]: 'success',
  [InvoiceStatus.OVERDUE]: 'danger',
  [InvoiceStatus.CANCELLED]: 'default',
};

function InvoicesPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useInvoices({ page, limit: 20, status: status || undefined });
  const sendInvoice = useSendInvoice();
  const markPaid = useMarkInvoicePaid();
  const deleteInvoice = useDeleteInvoice();

  const invoices = data?.data || [];
  const meta = data?.meta as { total: number; totalPages: number } | undefined;
  const hasStatusFilter = Boolean(status);
  const selectedStatusLabel = status.replace(/_/g, ' ').toLowerCase();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500">{meta?.total || 0} total invoices</p>
        </div>
        <Link to="/invoices/new">
          <Button icon={<Plus className="w-4 h-4" />}>New Invoice</Button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-primary-100 bg-primary-50/40">
          <h2 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary-800">
            <Sparkles className="h-3.5 w-3.5" /> Quick actions
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Jump into receivables tasks and keep collections execution on schedule.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link to="/invoices/new" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Create invoice
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/customers" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Open customer accounts
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/reports" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Review receivables impact
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/help" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Open invoicing playbook
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
              'Filter statuses to SENT and OVERDUE to focus the daily follow-up queue.',
              'Send reminders with clear due amounts and bank/mobile payment instructions.',
              'Mark incoming payments immediately to prevent duplicate follow-ups.',
              'Escalate accounts beyond policy thresholds and assign an owner for closure.',
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

      <Card padding={false}>
        <div className="p-4 border-b border-slate-100">
          <Select
            options={[
              { value: '', label: 'All statuses' },
              ...Object.values(InvoiceStatus).map((s) => ({
                value: s,
                label: s.replace('_', ' '),
              })),
            ]}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-48"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['Invoice #', 'Customer', 'Amount', 'Due Date', 'Status', 'Actions'].map((h) => (
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
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!isLoading &&
                invoices.map((inv: IInvoice) => {
                  const customer = inv.customer as { name: string } | undefined;
                  return (
                    <tr key={inv._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          to="/invoices/$id"
                          params={{ id: inv._id }}
                          className="text-sm font-mono font-medium text-primary-700 hover:underline"
                        >
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{customer?.name || '—'}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                        {formatCurrency(inv.total, inv.currency)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatDate(inv.dueDate)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_BADGE[inv.status]}>
                          {inv.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {inv.status === InvoiceStatus.DRAFT && (
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={<Send className="w-3 h-3" />}
                              loading={sendInvoice.isPending}
                              onClick={() => sendInvoice.mutate(inv._id)}
                            >
                              Send
                            </Button>
                          )}
                          {[
                            InvoiceStatus.SENT,
                            InvoiceStatus.PARTIALLY_PAID,
                            InvoiceStatus.OVERDUE,
                          ].includes(inv.status) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={<CheckCircle className="w-3 h-3" />}
                              className="text-green-600"
                              onClick={() => markPaid.mutate({ id: inv._id })}
                            >
                              Paid
                            </Button>
                          )}
                          {inv.status === InvoiceStatus.DRAFT && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500"
                              onClick={() => setDeleteId(inv._id)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          {!isLoading && invoices.length === 0 && (
            <EmptyState
              icon={<FileText className="w-8 h-8" />}
              title={hasStatusFilter ? `No ${selectedStatusLabel} invoices` : 'No invoices yet'}
              description={
                hasStatusFilter
                  ? 'Try a different status or clear the filter to view all invoices.'
                  : 'Create your first invoice to start tracking receivables and payment collection.'
              }
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {hasStatusFilter && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setStatus('');
                        setPage(1);
                      }}
                    >
                      Clear status filter
                    </Button>
                  )}
                  <Link to="/invoices/new">
                    <Button icon={<Plus className="w-4 h-4" />}>Create invoice</Button>
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

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteInvoice.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
        }}
        title="Delete Invoice"
        description="Are you sure? Draft invoices deleted cannot be recovered."
        loading={deleteInvoice.isPending}
      />
    </div>
  );
}

import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Plus, Search, Users } from 'lucide-react';
import { useCustomers, useCreateCustomer } from '../../../hooks/useApi';
import { Button, Input, Card, EmptyState, Skeleton, Avatar, Badge, Modal } from '../../../components/ui';
import { formatCurrency } from '../../../shared/utils';
import { Currency, ICustomer } from '../../../shared/types';
import { useAuthStore } from '../../../store/auth.store';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export const Route = createFileRoute('/_dashboard/customers/')({
  component: CustomersPage,
});

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

function CustomersPage() {
  const { tenant } = useAuthStore();
  const currency = (tenant?.settings?.currency as Currency) || Currency.USD;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading } = useCustomers({ page, limit: 20, search: search || undefined });
  const createCustomer = useCreateCustomer();

  const customers = (data?.data || []) as ICustomer[];
  const meta = data?.meta as { total: number; totalPages: number } | undefined;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  function onSubmit(data: FormData) {
    const cleaned = { ...data, email: data.email || undefined };
    createCustomer.mutate(cleaned, {
      onSuccess: () => { setShowAdd(false); reset(); },
    });
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500">{meta?.total || 0} total customers</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>Add Customer</Button>
      </div>

      <Input
        placeholder="Search by name, email, or phone…"
        leftIcon={<Search className="w-4 h-4" />}
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="max-w-sm"
      />

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['Customer', 'Contact', 'Total Purchases', 'Outstanding', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>
              ))}
              {!isLoading && customers.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} size="sm" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-600">{c.email || '—'}</p>
                    <p className="text-xs text-slate-400">{c.phone || ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-slate-900">{formatCurrency(c.totalPurchases, currency)}</span>
                  </td>
                  <td className="px-4 py-3">
                    {c.outstandingBalance > 0 ? (
                      <Badge variant="danger">{formatCurrency(c.outstandingBalance, currency)}</Badge>
                    ) : (
                      <Badge variant="success">Paid up</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link to="/customers/$id" params={{ id: c._id }}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!isLoading && customers.length === 0 && (
            <EmptyState
              icon={<Users className="w-8 h-8" />}
              title="No customers yet"
              description="Add your first customer to start tracking purchases and invoices."
              action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>Add Customer</Button>}
            />
          )}
        </div>

        {meta && meta.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">Page {page} of {meta.totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= meta.totalPages}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add customer modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); reset(); }} title="Add Customer" size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => { setShowAdd(false); reset(); }}>Cancel</Button>
            <Button form="add-customer-form" type="submit" loading={createCustomer.isPending}>Save Customer</Button>
          </div>
        }
      >
        <form id="add-customer-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Full Name" placeholder="Tatenda Moyo" required error={errors.name?.message} {...register('name')} />
          <Input label="Email" type="email" placeholder="tatenda@example.com" error={errors.email?.message} {...register('email')} />
          <Input label="Phone" placeholder="+263 77 123 4567" {...register('phone')} />
          <Input label="Address" placeholder="123 Samora Machel Ave, Harare" {...register('address')} />
          <Input label="Notes" placeholder="Any notes about this customer" {...register('notes')} />
        </form>
      </Modal>
    </div>
  );
}

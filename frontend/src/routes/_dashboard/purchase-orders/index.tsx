import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, Link } from '@tanstack/react-router';
import { CheckCircle, Clock, Eye, Package, Plus, Truck, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Card, EmptyState, Input, Modal, Skeleton } from '../../../components/ui';
import { useCreatePurchaseOrder, useProducts, usePurchaseOrders } from '../../../hooks/useApi';
import { Currency, IPurchaseOrder, PurchaseOrderStatus } from '../../../shared/types';
import { formatCurrency } from '../../../shared/utils';

export const Route = createFileRoute('/_dashboard/purchase-orders/')({
  component: PurchaseOrdersPage,
});

const STATUS_CONFIG: Record<PurchaseOrderStatus, { label: string; variant: 'default' | 'info' | 'success' | 'warning' | 'error'; icon: typeof Clock }> = {
  [PurchaseOrderStatus.DRAFT]: { label: 'Draft', variant: 'default', icon: Clock },
  [PurchaseOrderStatus.SENT]: { label: 'Sent', variant: 'info', icon: Truck },
  [PurchaseOrderStatus.CONFIRMED]: { label: 'Confirmed', variant: 'info', icon: CheckCircle },
  [PurchaseOrderStatus.PARTIAL]: { label: 'Partially Received', variant: 'warning', icon: Package },
  [PurchaseOrderStatus.RECEIVED]: { label: 'Received', variant: 'success', icon: CheckCircle },
  [PurchaseOrderStatus.CANCELLED]: { label: 'Cancelled', variant: 'error', icon: XCircle },
};

const createPOSchema = z.object({
  supplierName: z.string().min(1, 'Supplier name required'),
  supplierEmail: z.string().email().optional().or(z.literal('')),
  supplierPhone: z.string().optional(),
  currency: z.nativeEnum(Currency).default(Currency.USD),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1, 'Select a product'),
    quantity: z.coerce.number().int().positive('Must be positive'),
    unitCost: z.coerce.number().positive('Must be positive'),
  })).min(1, 'Add at least one item'),
});

type CreatePOForm = z.infer<typeof createPOSchema>;

function CreatePOModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: productsData } = useProducts({ limit: 200 });
  const createPO = useCreatePurchaseOrder();
  const products = (productsData?.data || []) as Array<{ _id: string; name: string; sku: string; costPrice: number }>;

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<CreatePOForm>({
    resolver: zodResolver(createPOSchema),
    defaultValues: { currency: Currency.USD, taxRate: 0, items: [{ productId: '', quantity: 1, unitCost: 0 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = watch('items');
  const taxRate = watch('taxRate') || 0;
  const currency = watch('currency') as Currency;

  const subtotal = watchedItems.reduce((s, i) => s + ((i.quantity || 0) * (i.unitCost || 0)), 0);
  const total = subtotal + (subtotal * taxRate / 100);

  const onSubmit = (data: CreatePOForm) => {
    createPO.mutate(data, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Purchase Order" size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Supplier Name" required {...register('supplierName')} error={errors.supplierName?.message} />
          <Input label="Supplier Email" type="email" {...register('supplierEmail')} error={errors.supplierEmail?.message} />
          <Input label="Supplier Phone" {...register('supplierPhone')} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
              <select {...register('currency')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                {Object.values(Currency).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Input label="Tax Rate %" type="number" step="0.1" {...register('taxRate')} />
          </div>
          <Input label="Expected Delivery" type="date" {...register('expectedDate')} />
          <Input label="Notes" {...register('notes')} />
        </div>

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-700">Order Items</h4>
            <Button type="button" variant="outline" size="sm" icon={<Plus className="w-4 h-4" />}
              onClick={() => append({ productId: '', quantity: 1, unitCost: 0 })}>
              Add Item
            </Button>
          </div>
          <div className="space-y-2">
            {fields.map((field, idx) => {
              return (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Product</label>
                    <select {...register(`items.${idx}.productId`)}
                      onChange={(e) => {
                        const p = products.find(pr => pr._id === e.target.value);
                        if (p) {
                          const form = document.querySelector(`[name="items.${idx}.unitCost"]`) as HTMLInputElement;
                          if (form) form.value = String(p.costPrice);
                        }
                      }}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <option value="">Select product</option>
                      {products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <Input label="Qty" type="number" {...register(`items.${idx}.quantity`)} />
                  </div>
                  <div className="col-span-3">
                    <Input label="Unit Cost" type="number" step="0.01" {...register(`items.${idx}.unitCost`)} />
                  </div>
                  <div className="col-span-1 text-right">
                    <p className="text-xs text-slate-500 mb-1">Total</p>
                    <p className="text-sm font-semibold">{formatCurrency((watchedItems[idx]?.quantity || 0) * (watchedItems[idx]?.unitCost || 0), currency)}</p>
                  </div>
                  <div className="col-span-1 flex justify-end pb-1">
                    <button type="button" onClick={() => remove(idx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {errors.items && <p className="text-xs text-red-500 mt-1">{errors.items.message || errors.items.root?.message}</p>}
        </div>

        {/* Totals */}
        <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatCurrency(subtotal, currency)}</span></div>
          {taxRate > 0 && <div className="flex justify-between"><span className="text-slate-500">Tax ({taxRate}%)</span><span>{formatCurrency(subtotal * taxRate / 100, currency)}</span></div>}
          <div className="flex justify-between font-bold text-base border-t border-slate-200 pt-2"><span>Total</span><span className="text-primary-800">{formatCurrency(total, currency)}</span></div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={createPO.isPending}>Create Purchase Order</Button>
        </div>
      </form>
    </Modal>
  );
}

function PurchaseOrdersPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = usePurchaseOrders(statusFilter ? { status: statusFilter } : {});
  const orders = (data?.data || []) as IPurchaseOrder[];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Purchase Orders</h1>
          <p className="text-sm text-slate-500">Manage supplier orders and stock receiving</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>New Purchase Order</Button>
      </div>

      {/* Status pills */}
      <div className="flex gap-2 flex-wrap">
        {['', ...Object.values(PurchaseOrderStatus)].map(s => (
          <button key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === s ? 'bg-primary-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['PO Number', 'Supplier', 'Items', 'Total', 'Status', 'Expected', ''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                  <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                ))}</tr>
              ))}
              {!isLoading && orders.map(order => {
                const cfg = STATUS_CONFIG[order.status];
                const Icon = cfg.icon;
                return (
                  <tr key={order._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm font-medium text-slate-800">{order.poNumber}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{order.supplierName}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{formatCurrency(order.total, order.currency as Currency)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        cfg.variant === 'success' ? 'bg-green-100 text-green-700' :
                        cfg.variant === 'warning' ? 'bg-amber-100 text-amber-700' :
                        cfg.variant === 'error' ? 'bg-red-100 text-red-700' :
                        cfg.variant === 'info' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'}`}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{order.expectedDate ? new Date(order.expectedDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <Link to="/purchase-orders/$id" params={{ id: order._id }}>
                        <Button variant="ghost" size="sm" icon={<Eye className="w-4 h-4" />}>View</Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!isLoading && orders.length === 0 && (
            <EmptyState icon={<Package className="w-8 h-8" />} title="No purchase orders" description="Create your first purchase order to track stock from suppliers."
              action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>Create Purchase Order</Button>} />
          )}
        </div>
      </Card>

      <CreatePOModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

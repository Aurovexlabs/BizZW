import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Card, Input, Select, Textarea } from '../../../components/ui';
import { useCreateInvoice, useCustomers, useProducts } from '../../../hooks/useApi';
import { Currency, ICustomer, IInvoice, IProduct } from '../../../shared/types';
import { formatCurrency } from '../../../shared/utils';
import { useAuthStore } from '../../../store/auth.store';

export const Route = createFileRoute('/_dashboard/invoices/new')({
  component: NewInvoicePage,
});

const lineItemSchema = z.object({
  productId: z.string().default(''),
  productName: z.string().min(1, 'Required'),
  quantity: z.coerce.number().positive('Must be > 0'),
  unitPrice: z.coerce.number().min(0),
});

const schema = z.object({
  customerId: z.string().min(1, 'Select a customer'),
  lineItems: z.array(lineItemSchema).min(1, 'Add at least one item'),
  taxRate: z.coerce.number().min(0).max(100),
  discount: z.coerce.number().min(0),
  currency: z.nativeEnum(Currency),
  dueDate: z.string().min(1, 'Required'),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

function NewInvoicePage() {
  const navigate = useNavigate();
  const { tenant } = useAuthStore();
  const currency = (tenant?.settings?.currency as Currency) || Currency.USD;
  const defaultTaxRate = tenant?.settings?.taxRate ?? 15;

  const [productSearch, setProductSearch] = useState<Record<number, string>>({});
  const [showProductSearch, setShowProductSearch] = useState<number | null>(null);

  const createInvoice = useCreateInvoice();
  const { data: customersData } = useCustomers({ limit: 200 });
  const customers = (customersData?.data || []) as ICustomer[];

  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 30);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      lineItems: [{ productId: '', productName: '', quantity: 1, unitPrice: 0 }],
      taxRate: defaultTaxRate,
      discount: 0,
      currency,
      dueDate: defaultDueDate.toISOString().split('T')[0],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });
  const watchedItems = watch('lineItems');
  const watchedTax = watch('taxRate');
  const watchedDiscount = watch('discount');
  const watchedCurrency = watch('currency');

  const subtotal = watchedItems.reduce((s, i) => s + (i.quantity || 0) * (i.unitPrice || 0), 0);
  const taxAmt = (subtotal * (watchedTax || 0)) / 100;
  const total = Math.max(0, subtotal + taxAmt - (watchedDiscount || 0));

  // Product search per line
  const { data: productResults } = useProducts({
    search: productSearch[showProductSearch ?? -1] || undefined,
    limit: 8,
  });
  const products = (productResults?.data || []) as IProduct[];

  function selectProduct(index: number, product: IProduct) {
    setValue(`lineItems.${index}.productId`, product._id);
    setValue(`lineItems.${index}.productName`, product.name);
    setValue(`lineItems.${index}.unitPrice`, product.sellPrice);
    setShowProductSearch(null);
    setProductSearch({});
  }

  async function onSubmit(data: FormData) {
    const payload: Partial<IInvoice> = {
      ...data,
      lineItems: data.lineItems.map((item) => ({
        ...item,
        total: item.quantity * item.unitPrice,
      })),
    };

    createInvoice.mutate(payload, {
      onSuccess: () => navigate({ to: '/invoices' }),
    });
  }

  const fmt = (v: number) => formatCurrency(v, watchedCurrency as Currency);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/invoices">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Invoice</h1>
          <p className="text-sm text-slate-500">Create a professional invoice for your customer</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Customer + meta */}
        <Card>
          <h2 className="font-semibold text-slate-900 mb-4">Invoice Details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Customer <span className="text-red-500">*</span></label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                {...register('customerId')}
              >
                <option value="">Select customer…</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
              {errors.customerId && <p className="text-xs text-red-600">{errors.customerId.message}</p>}
            </div>

            <Input
              label="Due Date"
              type="date"
              required
              error={errors.dueDate?.message}
              {...register('dueDate')}
            />

            <Select
              label="Currency"
              options={Object.values(Currency).map((c) => ({ value: c, label: c }))}
              {...register('currency')}
            />

            <Input
              label="Tax Rate (%)"
              type="number"
              step="0.1"
              hint={`${tenant?.settings?.taxRate ?? 15}% VAT is Zimbabwe standard`}
              {...register('taxRate')}
            />
          </div>
        </Card>

        {/* Line items */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Line Items</h2>
            <Button
              type="button" variant="outline" size="sm" icon={<Plus className="w-4 h-4" />}
              onClick={() => append({ productId: '', productName: '', quantity: 1, unitPrice: 0 })}
            >
              Add Item
            </Button>
          </div>

          <div className="space-y-3">
            {/* Header */}
            <div className="grid-cols-12 gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider px-1 hidden sm:grid">
              <div className="col-span-5">Description</div>
              <div className="col-span-2">Qty</div>
              <div className="col-span-3">Unit Price</div>
              <div className="col-span-1">Total</div>
              <div className="col-span-1" />
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                {/* Product name with search */}
                <div className="col-span-12 sm:col-span-5 relative">
                  <input
                    placeholder="Item description or search product…"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    {...register(`lineItems.${index}.productName`)}
                    onFocus={() => setShowProductSearch(index)}
                    onChange={(e) => {
                      setProductSearch((prev) => ({ ...prev, [index]: e.target.value }));
                      setShowProductSearch(index);
                    }}
                  />
                  {errors.lineItems?.[index]?.productName && (
                    <p className="text-xs text-red-600 mt-0.5">{errors.lineItems[index]?.productName?.message}</p>
                  )}
                  {/* Product dropdown */}
                  {showProductSearch === index && products.length > 0 && (
                    <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                      {products.map((p) => (
                        <button
                          key={p._id} type="button"
                          onClick={() => selectProduct(index, p)}
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-primary-50 text-left transition-colors"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-900">{p.name}</p>
                            <p className="text-xs text-slate-400">{p.sku} · {p.quantity} in stock</p>
                          </div>
                          <span className="text-sm font-bold text-primary-700">{formatCurrency(p.sellPrice, currency)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <input
                    type="number" min="1" placeholder="1"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    {...register(`lineItems.${index}.quantity`)}
                  />
                </div>

                <div className="col-span-5 sm:col-span-3">
                  <input
                    type="number" step="0.01" min="0" placeholder="0.00"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    {...register(`lineItems.${index}.unitPrice`)}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1 flex items-center justify-center py-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {fmt((watchedItems[index]?.quantity || 0) * (watchedItems[index]?.unitPrice || 0))}
                  </span>
                </div>

                <div className="col-span-1 flex items-center justify-center py-2">
                  <button
                    type="button" onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    className="p-1 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span><span>{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>Tax ({watchedTax || 0}%)</span><span>{fmt(taxAmt)}</span>
              </div>
              {(watchedDiscount || 0) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span><span>-{fmt(watchedDiscount || 0)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t border-slate-200 pt-2">
                <span>Total</span>
                <span className="text-primary-800">{fmt(total)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Extra */}
        <Card>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Discount Amount"
              type="number" step="0.01" min="0"
              placeholder="0.00"
              {...register('discount')}
            />
            <Textarea label="Notes" placeholder="Payment instructions, thank you message, etc." {...register('notes')} />
          </div>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link to="/invoices"><Button variant="outline">Cancel</Button></Link>
          <Button type="submit" loading={createInvoice.isPending} size="lg">
            Create Invoice
          </Button>
        </div>
      </form>
    </div>
  );
}

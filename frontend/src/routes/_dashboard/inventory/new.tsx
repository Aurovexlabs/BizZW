import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateProduct } from '../../../hooks/useApi';
import { Button, Input, Card } from '../../../components/ui';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../../store/auth.store';

export const Route = createFileRoute('/_dashboard/inventory/new')({
  component: NewProductPage,
});

const schema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(2, 'SKU is required').toUpperCase(),
  barcode: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  costPrice: z.coerce.number().min(0),
  sellPrice: z.coerce.number().min(0),
  quantity: z.coerce.number().int().min(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
});
type FormData = z.infer<typeof schema>;

function NewProductPage() {
  const navigate = useNavigate();
  const { tenant } = useAuthStore();
  const currencySymbol = tenant?.settings?.currency === 'ZiG' ? 'ZiG' : '$';
  const createProduct = useCreateProduct();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: 0, lowStockThreshold: 5, costPrice: 0, sellPrice: 0 },
  });

  async function onSubmit(data: FormData) {
    createProduct.mutate(data, { onSuccess: () => navigate({ to: '/inventory' }) });
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/inventory">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add Product</h1>
          <p className="text-sm text-slate-500">Add a new product to your inventory</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <h2 className="font-semibold text-slate-900 mb-4">Basic Information</h2>
          <div className="space-y-4">
            <Input label="Product Name" placeholder="e.g. Coca-Cola 500ml" required error={errors.name?.message} {...register('name')} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="SKU" placeholder="e.g. COKE-500ML" required error={errors.sku?.message} {...register('sku')} className="uppercase" />
              <Input label="Barcode" placeholder="e.g. 5000112637922" error={errors.barcode?.message} {...register('barcode')} />
            </div>
            <Input label="Category" placeholder="e.g. Beverages" required error={errors.category?.message} {...register('category')} />
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-slate-900 mb-4">Pricing</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input label={`Cost Price (${currencySymbol})`} type="number" step="0.01" placeholder="0.00" required error={errors.costPrice?.message} {...register('costPrice')} />
            <Input label={`Sell Price (${currencySymbol})`} type="number" step="0.01" placeholder="0.00" required error={errors.sellPrice?.message} {...register('sellPrice')} />
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-slate-900 mb-4">Stock</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Opening Stock" type="number" placeholder="0" error={errors.quantity?.message} {...register('quantity')} />
            <Input label="Low Stock Alert" type="number" placeholder="5" hint="Alert when stock falls below this" error={errors.lowStockThreshold?.message} {...register('lowStockThreshold')} />
          </div>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link to="/inventory"><Button variant="outline">Cancel</Button></Link>
          <Button type="submit" loading={createProduct.isPending}>Save Product</Button>
        </div>
      </form>
    </div>
  );
}

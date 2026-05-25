import { Image as IKImage } from '@imagekit/react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Camera, Plus, Sliders, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Badge, Button, Card, Input, Modal, Skeleton } from '../../../components/ui';
import { useAdjustStock, useProduct, useUpdateProduct } from '../../../hooks/useApi';
import { cn } from '../../../lib/cn';
import { PRODUCT_THUMBNAIL_TR, uploadImageToImageKit } from '../../../lib/imagekit';
import { Currency, IProduct } from '../../../shared/types';
import { formatCurrency, formatDateTime } from '../../../shared/utils';
import { useAuthStore } from '../../../store/auth.store';

export const Route = createFileRoute('/_dashboard/inventory/$id')({
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { id } = Route.useParams();
  const { tenant } = useAuthStore();
  const currency = (tenant?.settings?.currency as Currency) || Currency.USD;

  const { data: product, isLoading } = useProduct(id);
  const updateProduct = useUpdateProduct();
  const adjustStock = useAdjustStock();

  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { isDirty },
  } = useForm({
    values: product
      ? {
          name: product.name,
          sku: product.sku,
          barcode: product.barcode || '',
          category: product.category,
          costPrice: product.costPrice,
          sellPrice: product.sellPrice,
          lowStockThreshold: product.lowStockThreshold,
        }
      : undefined,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!product) return null;

  function onSave(data: Partial<IProduct>) {
    updateProduct.mutate({ id, data });
  }

  function handleStockAdjust() {
    const qty = parseInt(adjustQty);
    if (!qty || qty <= 0 || !adjustReason) {
      toast.error('Enter quantity and reason');
      return;
    }
    adjustStock.mutate(
      { id, type: adjustType, quantity: qty, reason: adjustReason },
      {
        onSuccess: () => {
          setShowAdjust(false);
          setAdjustQty('');
          setAdjustReason('');
        },
      }
    );
  }

  function handleImageUpload(res: { fileId: string; filePath: string }) {
    if (!product) return;
    setUploading(false);
    const newImages = [...(product.images || []), { fileId: res.fileId, filePath: res.filePath }];
    updateProduct.mutate({ id, data: { images: newImages } });
  }

  function removeImage(fileId: string) {
    if (!product) return;
    const newImages = product.images.filter((img) => img.fileId !== fileId);
    updateProduct.mutate({ id, data: { images: newImages } });
  }

  async function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const uploaded = await uploadImageToImageKit(file, {
        fileName: `product-${id}-${Date.now()}`,
        folder: `/bizZW/${tenant?.orgId}/products`,
        useUniqueFileName: true,
      });
      handleImageUpload(uploaded);
    } catch {
      setUploading(false);
      toast.error('Upload failed');
    } finally {
      e.target.value = '';
    }
  }

  const isLow = product.quantity <= product.lowStockThreshold;
  const margin =
    product.sellPrice > 0
      ? (((product.sellPrice - product.costPrice) / product.sellPrice) * 100).toFixed(1)
      : '0';
  const stockHistory = product.stockHistory ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/inventory">
            <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
            <p className="text-sm text-slate-500 font-mono">{product.sku}</p>
          </div>
        </div>
        <Badge
          variant={product.quantity === 0 ? 'danger' : isLow ? 'warning' : 'success'}
          size="md"
        >
          {product.quantity === 0 ? 'Out of stock' : `${product.quantity} in stock`}
        </Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: images + stock */}
        <div className="space-y-5">
          {/* Images */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900 text-sm">Product Images</h3>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="p-1.5 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {product.images?.map((img) => (
                <div
                  key={img.fileId}
                  className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200"
                >
                  <IKImage
                    src={img.filePath}
                    transformation={PRODUCT_THUMBNAIL_TR}
                    className="w-full h-full object-cover"
                    alt={product.name}
                  />
                  <button
                    onClick={() => removeImage(img.fileId)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="aspect-square border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-primary-300 hover:text-primary-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5 mb-1" />
                <span className="text-xs">{uploading ? 'Uploading...' : 'Add photo'}</span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageFileChange}
            />
          </Card>

          {/* Stock summary */}
          <Card>
            <h3 className="font-semibold text-slate-900 text-sm mb-3">Stock Overview</h3>
            <div className="space-y-3">
              {[
                { label: 'Current Stock', value: `${product.quantity} units`, highlight: isLow },
                { label: 'Low Stock Alert', value: `${product.lowStockThreshold} units` },
                { label: 'Cost Price', value: formatCurrency(product.costPrice, currency) },
                { label: 'Sell Price', value: formatCurrency(product.sellPrice, currency) },
                { label: 'Gross Margin', value: `${margin}%` },
                {
                  label: 'Stock Value',
                  value: formatCurrency(product.quantity * product.costPrice, currency),
                },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-slate-500">{label}</span>
                  <span
                    className={cn('font-semibold', highlight ? 'text-amber-600' : 'text-slate-900')}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <Button
              className="w-full mt-4"
              variant="outline"
              size="sm"
              icon={<Sliders className="w-4 h-4" />}
              onClick={() => setShowAdjust(true)}
            >
              Adjust Stock
            </Button>
          </Card>
        </div>

        {/* Right: edit form + history */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <h3 className="font-semibold text-slate-900 mb-4">Product Details</h3>
            <form onSubmit={handleSubmit(onSave as never)} className="space-y-4">
              <Input label="Product Name" required {...register('name')} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="SKU" required {...register('sku')} className="uppercase" />
                <Input label="Barcode" placeholder="Optional" {...register('barcode')} />
              </div>
              <Input label="Category" required {...register('category')} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Cost Price" type="number" step="0.01" {...register('costPrice')} />
                <Input label="Sell Price" type="number" step="0.01" {...register('sellPrice')} />
              </div>
              <Input label="Low Stock Threshold" type="number" {...register('lowStockThreshold')} />
              {isDirty && (
                <Button
                  type="submit"
                  loading={updateProduct.isPending}
                  icon={<Plus className="w-4 h-4" />}
                >
                  Save Changes
                </Button>
              )}
            </form>
          </Card>

          {/* Stock history */}
          <Card padding={false}>
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Stock History</h3>
            </div>
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {stockHistory.length > 0 ? (
                [...stockHistory].reverse().map((entry, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center',
                          entry.type === 'IN'
                            ? 'bg-green-100'
                            : entry.type === 'OUT'
                              ? 'bg-red-100'
                              : 'bg-blue-100'
                        )}
                      >
                        {entry.type === 'IN' ? (
                          <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                        ) : entry.type === 'OUT' ? (
                          <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                        ) : (
                          <Sliders className="w-3.5 h-3.5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{entry.reason}</p>
                        <p className="text-xs text-slate-400">{formatDateTime(entry.createdAt)}</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'text-sm font-bold',
                        entry.type === 'IN'
                          ? 'text-green-600'
                          : entry.type === 'OUT'
                            ? 'text-red-600'
                            : 'text-blue-600'
                      )}
                    >
                      {entry.type === 'IN' ? '+' : entry.type === 'OUT' ? '-' : '='}
                      {entry.quantity}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-4 py-8">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
                    <p className="text-sm font-semibold text-slate-700">No stock history yet</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Record an opening balance or adjustment to start a reliable stock movement
                      audit trail for this SKU.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Sliders className="w-4 h-4" />}
                        onClick={() => setShowAdjust(true)}
                      >
                        Record stock movement
                      </Button>
                      <Link to="/purchase-orders">
                        <Button size="sm">Create purchase order</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Adjust stock modal */}
      <Modal
        open={showAdjust}
        onClose={() => setShowAdjust(false)}
        title="Adjust Stock"
        size="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowAdjust(false)}>
              Cancel
            </Button>
            <Button onClick={handleStockAdjust} loading={adjustStock.isPending}>
              Apply Adjustment
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {(['IN', 'OUT', 'ADJUSTMENT'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setAdjustType(t)}
                className={cn(
                  'py-2 rounded-lg text-sm font-semibold border-2 transition-colors',
                  adjustType === t
                    ? 'border-primary-700 bg-primary-50 text-primary-800'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <Input
            label="Quantity"
            type="number"
            min="1"
            placeholder="0"
            value={adjustQty}
            onChange={(e) => setAdjustQty(e.target.value)}
          />
          <Input
            label="Reason"
            placeholder="e.g. New stock received, damaged goods"
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
          />
          <div className="bg-slate-50 rounded-xl p-3 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Current stock</span>
              <span className="font-medium">{product.quantity}</span>
            </div>
            {adjustQty && (
              <div className="flex justify-between font-bold text-slate-900 mt-1">
                <span>After adjustment</span>
                <span>
                  {adjustType === 'IN'
                    ? product.quantity + parseInt(adjustQty)
                    : adjustType === 'OUT'
                      ? product.quantity - parseInt(adjustQty)
                      : parseInt(adjustQty)}
                </span>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

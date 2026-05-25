import { createFileRoute, Link } from '@tanstack/react-router';
import {
  AlertTriangle,
  Download,
  ExternalLink,
  ListChecks,
  Package,
  Plus,
  Search,
  Sparkles,
  Upload,
} from 'lucide-react';
import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  Select,
  Skeleton,
} from '../../../components/ui';
import {
  useCategories,
  useDeleteProduct,
  useExportInventoryCSV,
  useProducts,
} from '../../../hooks/useApi';
import { useDebounce } from '../../../hooks/useDebounce';
import { buildImageUrl } from '../../../lib/imagekit';
import { Currency, IProduct } from '../../../shared/types';
import { formatCurrency } from '../../../shared/utils';
import { useAuthStore } from '../../../store/auth.store';

export const Route = createFileRoute('/_dashboard/inventory/')({
  component: InventoryPage,
});

function InventoryPage() {
  const { tenant } = useAuthStore();
  const currency = (tenant?.settings?.currency as Currency) || Currency.USD;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 350);
  const hasActiveFilters = Boolean(search || category || lowStock);

  const { data, isLoading } = useProducts({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    category: category || undefined,
    lowStock: lowStock || undefined,
  });
  const { data: categories } = useCategories();
  const deleteMutation = useDeleteProduct();
  const exportCSV = useExportInventoryCSV();

  const products = data?.data || [];
  const meta = data?.meta as { total: number; totalPages: number } | undefined;

  function clearFilters() {
    setSearch('');
    setCategory('');
    setLowStock(false);
    setPage(1);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="text-sm text-slate-500">{meta?.total || 0} products total</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            icon={<Download className="w-4 h-4" />}
            size="sm"
            onClick={exportCSV}
          >
            Export CSV
          </Button>
          <Button variant="outline" icon={<Upload className="w-4 h-4" />} size="sm">
            Import CSV
          </Button>
          <Link to="/inventory/new">
            <Button icon={<Plus className="w-4 h-4" />} size="sm">
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-primary-100 bg-primary-50/40">
          <h2 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary-800">
            <Sparkles className="h-3.5 w-3.5" /> Quick actions
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Launch the most common inventory actions without leaving this page.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link to="/inventory/new" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Add product
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/purchase-orders" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Create purchase order
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/reports" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Analyze stock trends
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/help" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Open inventory playbook
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
              'Filter low-stock items and confirm quantities for high-demand SKUs.',
              'Adjust thresholds where demand has shifted in the past 30 days.',
              'Create purchase orders for critical gaps and attach expected delivery dates.',
              'Run a cycle count and record any stock corrections with reason notes.',
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

      {/* Filters */}
      <Card padding={false}>
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Search products, SKU, barcode..."
            leftIcon={<Search className="w-4 h-4" />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="sm:w-72"
          />
          <Select
            options={[
              { value: '', label: 'All categories' },
              ...(categories || []).map((c: string) => ({ value: c, label: c })),
            ]}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="sm:w-48"
          />
          <button
            onClick={() => setLowStock(!lowStock)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${lowStock ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <AlertTriangle className="w-4 h-4" /> Low stock
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                  Product
                </th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                  SKU
                </th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                  Category
                </th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                  Sell Price
                </th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                  Stock
                </th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!isLoading &&
                products.map((p: IProduct) => {
                  const isLow = p.quantity <= p.lowStockThreshold;
                  const thumb = p.images?.[0]
                    ? buildImageUrl(p.images[0].filePath, { width: 40, height: 40 })
                    : null;
                  return (
                    <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={p.name}
                              className="w-9 h-9 rounded-lg object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                              <Package className="w-4 h-4 text-slate-400" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-slate-900">{p.name}</p>
                            <p className="text-xs text-slate-400 sm:hidden">{p.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                          {p.sku}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Badge variant="default">{p.category}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-slate-900">
                          {formatCurrency(p.sellPrice, currency)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge
                          variant={p.quantity === 0 ? 'danger' : isLow ? 'warning' : 'success'}
                        >
                          {p.quantity === 0 ? 'Out of stock' : `${p.quantity} units`}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link to="/inventory/$id" params={{ id: p._id }}>
                            <Button variant="ghost" size="sm">
                              Edit
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:bg-red-50"
                            onClick={() => setDeleteId(p._id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          {!isLoading && products.length === 0 && (
            <EmptyState
              icon={<Package className="w-8 h-8" />}
              title={
                hasActiveFilters
                  ? 'No products match these filters'
                  : 'No products in inventory yet'
              }
              description={
                hasActiveFilters
                  ? 'Try clearing one or more filters, then search by SKU, barcode, or product name.'
                  : 'Add your first product to start stock tracking, low-stock alerts, and valuation analytics.'
              }
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {hasActiveFilters && (
                    <Button variant="outline" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  )}
                  <Link to="/inventory/new">
                    <Button icon={<Plus className="w-4 h-4" />}>
                      {hasActiveFilters ? 'Add product anyway' : 'Add first product'}
                    </Button>
                  </Link>
                </div>
              }
            />
          )}
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Page {page} of {meta.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
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
          if (deleteId) deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
        }}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

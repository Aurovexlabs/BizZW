import { createFileRoute, Link } from '@tanstack/react-router';
import {
  CheckCircle,
  ExternalLink,
  ListChecks,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Badge, Button, Input, Modal, Select } from '../../components/ui';
import { useCreateSale, useCustomers, useSearchProducts } from '../../hooks/useApi';
import { cn } from '../../lib/cn';
import { buildImageUrl } from '../../lib/imagekit';
import { Currency, IProduct, ISale, PaymentMethod } from '../../shared/types';
import { formatCurrency } from '../../shared/utils';
import { useAuthStore } from '../../store/auth.store';
import { useCartStore } from '../../store/cart.store';

export const Route = createFileRoute('/_dashboard/pos')({
  component: POSPage,
});

function POSPage() {
  const { tenant } = useAuthStore();
  const currency = (tenant?.settings?.currency as Currency) || Currency.USD;

  const [query, setQuery] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [completedSale, setCompletedSale] = useState<ISale | null>(null);
  const [amountPaid, setAmountPaid] = useState('');

  const { data: searchResults, isLoading: searching } = useSearchProducts(query);
  const { data: customersData } = useCustomers({ limit: 100 });
  const customers = (customersData?.data || []) as { _id: string; name: string }[];

  const cart = useCartStore();
  const createSale = useCreateSale();

  const addToCart = useCallback(
    (product: IProduct) => {
      cart.addItem({
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        quantity: 1,
        unitPrice: product.sellPrice,
        maxQuantity: product.quantity,
      });
      if (query) setQuery('');
    },
    [cart, query]
  );

  const handleCheckout = async () => {
    const paid = parseFloat(amountPaid);
    if (isNaN(paid) || paid < cart.total()) {
      toast.error('Amount paid must be at least equal to the total');
      return;
    }

    const saleData = {
      items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      discount: cart.discount,
      currency,
      paymentMethod: cart.paymentMethod,
      amountPaid: paid,
      customerId: cart.customerId,
      notes: cart.notes,
    };

    createSale.mutate(saleData, {
      onSuccess: (sale) => {
        setCompletedSale(sale);
        cart.clearCart();
        setAmountPaid('');
      },
      onError: (err: unknown) => {
        const e = err as { response?: { data?: { message?: string } } };
        toast.error(e?.response?.data?.message || 'Sale failed');
      },
    });
  };

  if (completedSale) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-2xl p-10 text-center max-w-md w-full shadow-xl border border-slate-200">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Sale Complete!</h2>
          <p className="text-slate-500 text-sm mb-6">{completedSale.receiptNumber}</p>
          <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Total</span>
              <span className="font-bold">{formatCurrency(completedSale.total, currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Paid</span>
              <span className="font-semibold">
                {formatCurrency(completedSale.amountPaid, currency)}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
              <span className="text-slate-500 font-medium">Change</span>
              <span className="font-bold text-green-600">
                {formatCurrency(completedSale.change, currency)}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1">
              Print Receipt
            </Button>
            <Button className="flex-1" onClick={() => setCompletedSale(null)}>
              New Sale
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-slate-50 overflow-hidden">
      {/* Left: Product Search */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200 bg-white">
        {/* Search header */}
        <div className="p-4 border-b border-slate-100">
          <h1 className="text-lg font-bold text-slate-900 mb-3">Point of Sale</h1>
          <Input
            placeholder="Search by name, SKU, or scan barcode..."
            leftIcon={<Search className="w-4 h-4" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="grid gap-3 border-b border-slate-100 bg-slate-50/60 p-4 lg:grid-cols-2">
          <article className="rounded-xl border border-primary-100 bg-white p-3">
            <h2 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary-800">
              <Sparkles className="h-3.5 w-3.5" /> Quick actions
            </h2>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Link to="/sales" className="block">
                <Button variant="outline" size="sm" className="w-full justify-between">
                  Sales history
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Link to="/customers" className="block">
                <Button variant="outline" size="sm" className="w-full justify-between">
                  Customer directory
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Link to="/inventory" className="block">
                <Button variant="outline" size="sm" className="w-full justify-between">
                  Check inventory
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Link to="/help" className="block">
                <Button variant="outline" size="sm" className="w-full justify-between">
                  POS playbook
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-3">
            <h2 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-700">
              <ListChecks className="h-3.5 w-3.5" /> Example workflow
            </h2>
            <ol className="mt-2 space-y-1.5">
              {[
                'Scan products and confirm quantities before checkout.',
                'Attach customer profile when available for cleaner history.',
                'Verify payment method and amount received before completion.',
                'At shift close, review discounts and unusual edits for exceptions.',
              ].map((step, index) => (
                <li key={step} className="flex items-start gap-2 text-xs text-slate-600">
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </article>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {query.length >= 2 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {searching &&
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              {!searching &&
                searchResults?.map((p: IProduct) => {
                  const inCart = cart.items.find((i) => i.productId === p._id);
                  const thumb = p.images?.[0]
                    ? buildImageUrl(p.images[0].filePath, { width: 120, height: 120 })
                    : null;
                  return (
                    <button
                      key={p._id}
                      onClick={() => addToCart(p)}
                      disabled={p.quantity === 0}
                      className={cn(
                        'relative border rounded-xl p-3 text-left transition-all hover:shadow-md active:scale-95',
                        p.quantity === 0
                          ? 'opacity-50 cursor-not-allowed border-slate-200'
                          : 'border-slate-200 hover:border-primary-300 bg-white',
                        inCart && 'border-primary-400 bg-primary-50'
                      )}
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={p.name}
                          className="w-full aspect-square object-cover rounded-lg mb-2"
                        />
                      ) : (
                        <div className="w-full aspect-square bg-slate-100 rounded-lg mb-2 flex items-center justify-center">
                          <ShoppingCart className="w-6 h-6 text-slate-300" />
                        </div>
                      )}
                      <p className="text-sm font-semibold text-slate-900 leading-tight truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{p.sku}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-bold text-primary-800">
                          {formatCurrency(p.sellPrice, currency)}
                        </span>
                        <span
                          className={cn(
                            'text-xs',
                            p.quantity <= 5 ? 'text-amber-600' : 'text-slate-400'
                          )}
                        >
                          {p.quantity === 0 ? 'Out' : `${p.quantity} left`}
                        </span>
                      </div>
                      {inCart && (
                        <span className="absolute top-2 right-2 w-5 h-5 bg-primary-700 text-white text-xs rounded-full flex items-center justify-center font-bold">
                          {inCart.quantity}
                        </span>
                      )}
                    </button>
                  );
                })}
              {!searching && searchResults?.length === 0 && (
                <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                  <p className="text-sm font-semibold text-slate-700">
                    No products found for "{query}"
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Try searching by SKU, barcode, or a shorter product name.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Clear search
                    </button>
                    <Link
                      to="/inventory/new"
                      className="rounded-lg bg-primary-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-600"
                    >
                      Add new product
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
          {query.length < 2 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-300">
              <Search className="w-12 h-12 mb-3" />
              <p className="text-sm">Search to add products</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-80 xl:w-96 flex flex-col bg-white">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary-700" />
            Cart
            {cart.items.length > 0 && <Badge variant="info">{cart.itemCount()} items</Badge>}
          </h2>
          {cart.items.length > 0 && (
            <button
              onClick={cart.clearCart}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Clear
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.items.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600">Cart is empty</p>
              <p className="mt-1 text-xs text-slate-500">
                Search for products on the left, then adjust quantity before checkout.
              </p>
              <div className="mt-4">
                <Link
                  to="/invoices/new"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Create an invoice instead <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
          {cart.items.map((item) => (
            <div
              key={item.productId}
              className="flex items-center gap-3 bg-slate-50 rounded-xl p-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{item.productName}</p>
                <p className="text-xs text-slate-400">
                  {formatCurrency(item.unitPrice, currency)} each
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() =>
                    item.quantity === 1
                      ? cart.removeItem(item.productId)
                      : cart.updateQuantity(item.productId, item.quantity - 1)
                  }
                  className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                >
                  {item.quantity === 1 ? (
                    <Trash2 className="w-3 h-3 text-red-400" />
                  ) : (
                    <Minus className="w-3 h-3" />
                  )}
                </button>
                <span className="w-6 text-center text-sm font-bold text-slate-900">
                  {item.quantity}
                </span>
                <button
                  onClick={() => cart.updateQuantity(item.productId, item.quantity + 1)}
                  disabled={item.quantity >= item.maxQuantity}
                  className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 disabled:opacity-40"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <span className="text-sm font-bold text-slate-900 w-16 text-right shrink-0">
                {formatCurrency(item.total, currency)}
              </span>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            <select
              className="flex-1 text-sm border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700"
              value={cart.customerId || ''}
              onChange={(e) => cart.setCustomer(e.target.value || undefined)}
            >
              <option value="">Walk-in customer</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 w-20">Discount</span>
            <Input
              type="number"
              placeholder="0.00"
              className="flex-1"
              value={cart.discount || ''}
              onChange={(e) => cart.setDiscount(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-1 pt-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span>{formatCurrency(cart.subtotal(), currency)}</span>
            </div>
            {cart.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(cart.discount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t border-slate-200 pt-2 mt-2">
              <span>Total</span>
              <span className="text-primary-800">{formatCurrency(cart.total(), currency)}</span>
            </div>
          </div>

          <Select
            options={Object.values(PaymentMethod).map((m) => ({
              value: m,
              label: m.replace('_', ' '),
            }))}
            value={cart.paymentMethod}
            onChange={(e) => cart.setPaymentMethod(e.target.value as PaymentMethod)}
          />

          <Button
            className="w-full"
            size="lg"
            disabled={cart.items.length === 0}
            onClick={() => setShowCheckout(true)}
          >
            Charge {formatCurrency(cart.total(), currency)}
          </Button>
        </div>
      </div>

      {/* Checkout modal */}
      <Modal
        open={showCheckout}
        onClose={() => setShowCheckout(false)}
        title="Complete Payment"
        size="sm"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowCheckout(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              size="lg"
              loading={createSale.isPending}
              onClick={handleCheckout}
            >
              Complete Sale
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-500">Total due</span>
              <span className="text-xl font-black text-slate-900">
                {formatCurrency(cart.total(), currency)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Payment method</span>
              <span className="font-medium">{cart.paymentMethod}</span>
            </div>
          </div>
          <Input
            label="Amount Received"
            type="number"
            placeholder={cart.total().toFixed(2)}
            leftIcon={
              <span className="text-slate-400 text-sm">
                {currency === Currency.ZIG ? 'ZiG' : '$'}
              </span>
            }
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            autoFocus
          />
          {amountPaid && parseFloat(amountPaid) >= cart.total() && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <div className="flex justify-between text-sm">
                <span className="text-green-700 font-medium">Change to give</span>
                <span className="font-bold text-green-800">
                  {formatCurrency(parseFloat(amountPaid) - cart.total(), currency)}
                </span>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

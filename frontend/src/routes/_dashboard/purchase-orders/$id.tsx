import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, CheckCircle, Package, Truck } from 'lucide-react';
import { useState } from 'react';
import { Button, Card, Input, Modal, Skeleton } from '../../../components/ui';
import { usePurchaseOrder, useReceivePO, useUpdatePOStatus } from '../../../hooks/useApi';
import { Currency, PurchaseOrderItem, PurchaseOrderStatus } from '../../../shared/types';
import { formatCurrency } from '../../../shared/utils';

export const Route = createFileRoute('/_dashboard/purchase-orders/$id')({
  component: PurchaseOrderDetailPage,
});

function PurchaseOrderDetailPage() {
  const { id } = Route.useParams();
  const { data: order, isLoading } = usePurchaseOrder(id);
  const receivePO = useReceivePO();
  const updateStatus = useUpdatePOStatus();
  const [showReceive, setShowReceive] = useState(false);
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>({});

  if (isLoading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;
  if (!order) return null;

  const currency = order.currency as Currency;
  const isReceivable = [PurchaseOrderStatus.SENT, PurchaseOrderStatus.CONFIRMED, PurchaseOrderStatus.PARTIAL].includes(order.status);

  const handleReceive = () => {
    const items = order.items.map((item: PurchaseOrderItem) => ({
      productId: item.productId,
      receivedQuantity: receivedQtys[item.productId] ?? item.receivedQuantity,
    }));
    receivePO.mutate({ id, items }, { onSuccess: () => setShowReceive(false) });
  };

  const STATUS_COLORS: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700',
    SENT: 'bg-blue-100 text-blue-700',
    CONFIRMED: 'bg-indigo-100 text-indigo-700',
    PARTIAL: 'bg-amber-100 text-amber-700',
    RECEIVED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/purchase-orders"><Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>Back</Button></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{order.poNumber}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-700'}`}>
              {order.status}
            </span>
          </div>
          <p className="text-sm text-slate-500">Supplier: {order.supplierName}</p>
        </div>
        <div className="flex gap-2">
          {order.status === PurchaseOrderStatus.DRAFT && (
            <Button variant="outline" icon={<Truck className="w-4 h-4" />}
              onClick={() => updateStatus.mutate({ id, status: PurchaseOrderStatus.SENT })} loading={updateStatus.isPending}>
              Mark as Sent
            </Button>
          )}
          {order.status === PurchaseOrderStatus.SENT && (
            <Button variant="outline" icon={<CheckCircle className="w-4 h-4" />}
              onClick={() => updateStatus.mutate({ id, status: PurchaseOrderStatus.CONFIRMED })} loading={updateStatus.isPending}>
              Confirm Order
            </Button>
          )}
          {isReceivable && (
            <Button icon={<Package className="w-4 h-4" />} onClick={() => {
              const initial: Record<string, number> = {};
              order.items.forEach((item: PurchaseOrderItem) => { initial[item.productId] = item.receivedQuantity; });
              setReceivedQtys(initial);
              setShowReceive(true);
            }}>
              Receive Stock
            </Button>
          )}
        </div>
      </div>

      {/* Order Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Items', value: order.items.length },
          { label: 'Order Total', value: formatCurrency(order.total, currency) },
          { label: 'Expected', value: order.expectedDate ? new Date(order.expectedDate).toLocaleDateString() : '—' },
          { label: 'Received', value: order.receivedDate ? new Date(order.receivedDate).toLocaleDateString() : '—' },
        ].map(({ label, value }) => (
          <Card key={label}>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-lg font-bold text-slate-900 mt-1">{value}</p>
          </Card>
        ))}
      </div>

      {/* Line Items */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Order Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left pb-2 text-slate-500 font-medium">Product</th>
                <th className="text-right pb-2 text-slate-500 font-medium">Ordered</th>
                <th className="text-right pb-2 text-slate-500 font-medium">Received</th>
                <th className="text-right pb-2 text-slate-500 font-medium">Unit Cost</th>
                <th className="text-right pb-2 text-slate-500 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {order.items.map((item: PurchaseOrderItem, i: number) => {
                const pct = item.quantity > 0 ? (item.receivedQuantity / item.quantity) * 100 : 0;
                return (
                  <tr key={i}>
                    <td className="py-3">
                      <p className="font-medium text-slate-900">{item.productName}</p>
                      <p className="text-xs text-slate-400">{item.sku}</p>
                    </td>
                    <td className="py-3 text-right">{item.quantity}</td>
                    <td className="py-3 text-right">
                      <span className={`font-medium ${pct >= 100 ? 'text-green-600' : pct > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {item.receivedQuantity}
                      </span>
                      <div className="w-16 h-1 bg-slate-100 rounded-full mt-1 ml-auto">
                        <div className="h-1 bg-green-500 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </td>
                    <td className="py-3 text-right">{formatCurrency(item.unitCost, currency)}</td>
                    <td className="py-3 text-right font-semibold">{formatCurrency(item.total, currency)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-slate-200">
              <tr><td colSpan={4} className="pt-3 text-right text-slate-500 text-sm font-medium">Subtotal</td><td className="pt-3 text-right font-semibold">{formatCurrency(order.subtotal, currency)}</td></tr>
              {order.taxAmount > 0 && <tr><td colSpan={4} className="text-right text-slate-500 text-sm">Tax</td><td className="text-right">{formatCurrency(order.taxAmount, currency)}</td></tr>}
              <tr><td colSpan={4} className="text-right font-bold text-slate-900">Total</td><td className="text-right font-bold text-primary-800 text-lg">{formatCurrency(order.total, currency)}</td></tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {order.notes && (
        <Card><p className="text-sm text-slate-500 font-medium mb-1">Notes</p><p className="text-sm text-slate-700">{order.notes}</p></Card>
      )}

      {/* Receive Modal */}
      <Modal open={showReceive} onClose={() => setShowReceive(false)} title="Receive Stock" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Enter the quantity received for each item. Stock will be added to inventory automatically.</p>
          <div className="space-y-3">
            {order.items.map((item: PurchaseOrderItem) => (
              <div key={item.productId} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{item.productName}</p>
                  <p className="text-xs text-slate-500">Ordered: {item.quantity} | Previously received: {item.receivedQuantity}</p>
                </div>
                <div className="w-32">
                  <Input type="number" min={item.receivedQuantity} max={item.quantity}
                    value={receivedQtys[item.productId] ?? item.receivedQuantity}
                    onChange={e => setReceivedQtys(prev => ({ ...prev, [item.productId]: parseInt(e.target.value) || 0 }))}
                    label="Received" />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowReceive(false)}>Cancel</Button>
            <Button icon={<Package className="w-4 h-4" />} onClick={handleReceive} loading={receivePO.isPending}>Update Stock</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

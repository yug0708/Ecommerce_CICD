import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge, Button, Skeleton } from '@/components/ui';
import { getErrorMessage } from '@/lib/api';
import { formatPrice } from '@/lib/catalog';
import {
  estimatedDeliveryLabel,
  fetchOrder,
  type OrderSummary,
} from '@/lib/checkout';
import { orderStatusMeta } from '@/lib/orderStatus';

export default function AccountOrderDetailPage() {
  const { orderId = '' } = useParams();
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchOrder(orderId);
        if (!cancelled) setOrder(data);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load order'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" rounded="2xl" />
        <Skeleton className="h-56 w-full" rounded="2xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="rounded-2xl border border-border px-6 py-12 text-center">
        <h1 className="text-xl font-semibold text-content">Order not found</h1>
        <p className="mt-2 text-sm text-content-muted">{error ?? 'That order is unavailable.'}</p>
        <Link to="/account/orders" className="mt-6 inline-block">
          <Button>Back to orders</Button>
        </Link>
      </div>
    );
  }

  const meta = orderStatusMeta(order.status);
  const showDelivery = !['CANCELLED', 'DELIVERED'].includes(order.status.toUpperCase());

  return (
    <div className="space-y-6">
      <div>
        <Link to="/account/orders" className="text-sm text-content-muted hover:text-content">
          ← Orders
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-content">{order.orderNumber}</h1>
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>
        <p className="mt-1 text-sm text-content-muted">
          Placed {new Date(order.createdAt).toLocaleString()}
          {order.paidAt ? ` · Paid ${new Date(order.paidAt).toLocaleDateString()}` : ''}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-soft">
          <p className="text-2xs font-semibold uppercase tracking-wide text-content-subtle">Shipping</p>
          <p className="mt-2 text-sm font-medium text-content">{order.shippingAddress.fullName}</p>
          <p className="mt-1 text-sm text-content-muted">
            {order.shippingAddress.line1}
            {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
            <br />
            {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
            {order.shippingAddress.postalCode}
            <br />
            {order.shippingAddress.country}
          </p>
          {showDelivery ? (
            <p className="mt-3 text-sm text-content">
              Est. delivery{' '}
              <span className="font-medium">{estimatedDeliveryLabel(new Date(order.createdAt))}</span>
            </p>
          ) : null}
        </div>
        <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-soft">
          <p className="text-2xs font-semibold uppercase tracking-wide text-content-subtle">Payment</p>
          <p className="mt-2 text-sm text-content">
            {order.payment?.provider ?? 'Card'} · {order.payment?.status ?? 'N/A'}
          </p>
          <p className="mt-1 text-lg font-semibold text-content">{formatPrice(order.total)}</p>
          <p className="mt-1 text-xs text-content-muted">{order.currency}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface-raised p-5 shadow-soft">
        <h2 className="text-sm font-semibold text-content">Items</h2>
        <ul className="mt-3 divide-y divide-border">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-medium text-content">{item.productName}</p>
                <p className="text-content-muted">
                  {item.productSku} · Qty {item.quantity} · {formatPrice(item.unitPrice)} each
                </p>
              </div>
              <p className="font-medium text-content">{formatPrice(item.lineTotal)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-content-muted">Subtotal</dt>
            <dd>{formatPrice(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-content-muted">Shipping</dt>
            <dd>{formatPrice(order.shippingCost)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-content-muted">Tax</dt>
            <dd>{formatPrice(order.tax)}</dd>
          </div>
          {Number(order.discountAmount) > 0 ? (
            <div className="flex justify-between text-success-600">
              <dt>Discount</dt>
              <dd>−{formatPrice(order.discountAmount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatPrice(order.total)}</dd>
          </div>
        </dl>
      </div>

      <Link to="/products">
        <Button variant="outline">Continue shopping</Button>
      </Link>
    </div>
  );
}

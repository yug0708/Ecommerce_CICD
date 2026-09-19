import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge, Button, Skeleton } from '@/components/ui';
import { formatPrice } from '@/lib/catalog';
import {
  estimatedDeliveryLabel,
  fetchOrder,
  type OrderSummary,
} from '@/lib/checkout';
import { getErrorMessage } from '@/lib/api';

export default function OrderConfirmationPage() {
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
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 sm:px-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" rounded="2xl" />
        <Skeleton className="h-32 w-full" rounded="2xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-semibold text-content">Order unavailable</h1>
        <p className="mt-2 text-sm text-content-muted">{error ?? 'We could not find that order.'}</p>
        <Link to="/account/orders" className="mt-6 inline-block">
          <Button>View orders</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="rounded-3xl border border-border bg-surface-raised p-6 shadow-card sm:p-8">
        <Badge variant="success">Order confirmed</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-content">Thank you!</h1>
        <p className="mt-2 text-sm text-content-muted">
          We’ve received order <span className="font-medium text-content">{order.orderNumber}</span>.
          A receipt will appear in your account shortly
          {order.payment?.status ? ` · payment ${order.payment.status.toLowerCase()}` : ''}.
        </p>

        <div className="mt-6 grid gap-3 rounded-2xl border border-border bg-surface-muted/50 p-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-content-muted">Status</p>
            <p className="mt-1 font-medium text-content">{order.status}</p>
          </div>
          <div>
            <p className="text-content-muted">Estimated delivery</p>
            <p className="mt-1 font-medium text-content">
              {estimatedDeliveryLabel(new Date(order.createdAt))}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-content-muted">Shipping to</p>
            <p className="mt-1 text-content">
              {order.shippingAddress.fullName}, {order.shippingAddress.line1},{' '}
              {order.shippingAddress.city} {order.shippingAddress.postalCode}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-sm font-semibold text-content">Order summary</h2>
          <ul className="mt-3 divide-y divide-border rounded-2xl border border-border">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-content">{item.productName}</p>
                  <p className="text-content-muted">
                    {item.productSku} · Qty {item.quantity}
                  </p>
                </div>
                <p className="font-medium text-content">{formatPrice(item.lineTotal)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 text-sm">
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

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to={`/account/orders/${order.id}`}>
            <Button>View order details</Button>
          </Link>
          <Link to="/products">
            <Button variant="outline">Continue shopping</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

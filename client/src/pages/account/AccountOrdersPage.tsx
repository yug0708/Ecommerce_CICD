import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Skeleton } from '@/components/ui';
import { listOrders } from '@/lib/account';
import { getErrorMessage } from '@/lib/api';
import { formatPrice } from '@/lib/catalog';
import type { OrderSummary } from '@/lib/checkout';
import { cn } from '@/lib/cn';
import { orderStatusMeta } from '@/lib/orderStatus';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PAID', label: 'Paid' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await listOrders({
          page,
          limit: 10,
          status: status || undefined,
        });
        if (cancelled) return;
        setOrders(result.items);
        setTotalPages(Math.max(1, result.pagination.totalPages || 1));
      } catch (err) {
        if (!cancelled) {
          setOrders([]);
          setError(getErrorMessage(err, 'Could not load orders'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [page, status]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-content">Orders</h1>
        <p className="mt-1 text-sm text-content-muted">Track purchases and open a receipt anytime.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value || 'all'}
            type="button"
            onClick={() => {
              setStatus(filter.value);
              setPage(1);
            }}
            className={cn(
              'rounded-xl px-3 py-1.5 text-sm font-medium transition',
              status === filter.value
                ? 'bg-primary-600 text-white'
                : 'bg-surface-muted text-content-muted hover:text-content',
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" rounded="2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-danger-200 bg-danger-50 p-6 text-sm text-danger-700 dark:border-danger-900 dark:bg-danger-950/40 dark:text-danger-300">
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm text-content-muted">No orders match this filter.</p>
          <Link to="/products" className="mt-4 inline-block">
            <Button size="sm">Continue shopping</Button>
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const meta = orderStatusMeta(order.status);
            return (
              <li key={order.id}>
                <Link
                  to={`/account/orders/${order.id}`}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-raised p-4 shadow-soft transition hover:border-primary-300 hover:shadow-elevated sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-content">{order.orderNumber}</p>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-content-muted">
                      {new Date(order.createdAt).toLocaleString()} · {order.items.length} item
                      {order.items.length === 1 ? '' : 's'}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-content-subtle">
                      {order.items.map((i) => i.productName).join(', ')}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-lg font-semibold text-content">{formatPrice(order.total)}</p>
                    <p className="text-xs text-primary-600">View details →</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <p className="text-sm text-content-muted">
            Page {page} of {totalPages}
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}

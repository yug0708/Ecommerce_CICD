import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Badge, Button, Drawer, Input, Skeleton } from '@/components/ui';
import {
  fetchAdminOrders,
  ORDER_STATUS_TRANSITIONS,
  updateAdminOrderStatus,
  type AdminOrder,
} from '@/lib/admin';
import { getErrorMessage } from '@/lib/api';
import { formatPrice } from '@/lib/catalog';
import { orderStatusMeta } from '@/lib/orderStatus';
import { toast } from '@/store/useToastStore';

const STATUS_FILTERS = ['', 'PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;

export default function AdminOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [updating, setUpdating] = useState(false);
  const userIdFilter = searchParams.get('userId') ?? '';

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminOrders({
        page,
        limit: 20,
        status: status || undefined,
        search: debouncedSearch || undefined,
        userId: userIdFilter || undefined,
      });
      setOrders(result.items);
      setTotalPages(Math.max(1, result.pagination.totalPages || 1));

      const focusId = searchParams.get('focus');
      if (focusId) {
        const found = result.items.find((o) => o.id === focusId);
        if (found) setSelected(found);
      }
    } catch (err) {
      toast.error('Orders failed', getErrorMessage(err));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, status, debouncedSearch, userIdFilter, searchParams]);

  useEffect(() => {
    void load();
  }, [load]);

  const nextStatuses = useMemo(
    () => (selected ? ORDER_STATUS_TRANSITIONS[selected.status] ?? [] : []),
    [selected],
  );

  async function changeStatus(next: string) {
    if (!selected) return;
    setUpdating(true);
    try {
      const updated = await updateAdminOrderStatus(selected.id, { status: next });
      setSelected(updated);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      toast.success('Status updated', next);
    } catch (err) {
      toast.error('Update failed', getErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-content">Orders</h1>
        <p className="mt-1 text-sm text-content-muted">
          Filter by status, open details, and advance fulfillment.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-surface-raised p-3 shadow-soft">
        <Input
          placeholder="Search order #, email, name…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
        />
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s || 'all'}
              type="button"
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                status === s
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-muted text-content-muted hover:text-content'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
        {userIdFilter ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.delete('userId');
              setSearchParams(next);
              setPage(1);
            }}
          >
            Clear customer filter
          </Button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface-raised shadow-soft">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-border bg-surface-muted/50 text-xs uppercase tracking-wide text-content-subtle">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Order</th>
                  <th className="px-3 py-2.5 font-medium">Customer</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Items</th>
                  <th className="px-3 py-2.5 font-medium">Total</th>
                  <th className="px-3 py-2.5 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-content-muted">
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const meta = orderStatusMeta(order.status);
                    return (
                      <tr
                        key={order.id}
                        className="cursor-pointer hover:bg-surface-muted/50"
                        onClick={() => setSelected(order)}
                      >
                        <td className="px-3 py-2.5 font-medium text-content">{order.orderNumber}</td>
                        <td className="px-3 py-2.5">
                          <p className="text-content">{order.user?.name ?? '—'}</p>
                          <p className="text-xs text-content-muted">{order.user?.email}</p>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        </td>
                        <td className="px-3 py-2.5 text-content-muted">{order.items.length}</td>
                        <td className="px-3 py-2.5 font-medium">{formatPrice(order.total)}</td>
                        <td className="px-3 py-2.5 text-content-muted">
                          {new Date(order.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-content-muted">
            Page {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.orderNumber ?? 'Order'}
        description={selected ? new Date(selected.createdAt).toLocaleString() : undefined}
        widthClassName="max-w-xl"
        footer={
          selected && nextStatuses.length ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-content-muted">Update status</span>
              <select
                className="h-9 rounded-lg border border-border bg-surface-raised px-2 text-sm"
                defaultValue=""
                disabled={updating}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) void changeStatus(value);
                  e.target.value = '';
                }}
              >
                <option value="" disabled>
                  Choose…
                </option>
                {nextStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {updating ? <span className="text-xs text-content-muted">Saving…</span> : null}
            </div>
          ) : (
            <p className="text-xs text-content-muted">No further status transitions available.</p>
          )
        }
      >
        {selected ? (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={orderStatusMeta(selected.status).variant}>
                {orderStatusMeta(selected.status).label}
              </Badge>
              <span className="font-semibold text-content">{formatPrice(selected.total)}</span>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-content-subtle">
                Customer
              </p>
              <p className="mt-1 font-medium text-content">{selected.user?.name}</p>
              <p className="text-content-muted">{selected.user?.email}</p>
              {selected.user?.id ? (
                <Link
                  to={`/admin/orders?userId=${selected.user.id}`}
                  className="mt-1 inline-block text-xs text-primary-600"
                  onClick={() => setSelected(null)}
                >
                  View this customer’s orders
                </Link>
              ) : null}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-content-subtle">
                Ship to
              </p>
              <p className="mt-1 text-content-muted">
                {selected.shippingAddress.fullName}
                <br />
                {selected.shippingAddress.line1}
                <br />
                {selected.shippingAddress.city}, {selected.shippingAddress.state}{' '}
                {selected.shippingAddress.postalCode}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-content-subtle">
                Items
              </p>
              <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
                {selected.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-2 px-3 py-2">
                    <div>
                      <p className="font-medium text-content">{item.productName}</p>
                      <p className="text-xs text-content-muted">
                        {item.productSku} · Qty {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium">{formatPrice(item.lineTotal)}</p>
                  </li>
                ))}
              </ul>
            </div>

            {selected.statusHistory?.length ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-content-subtle">
                  History
                </p>
                <ul className="mt-2 space-y-2">
                  {selected.statusHistory.map((h) => (
                    <li key={h.id} className="rounded-lg bg-surface-muted/60 px-3 py-2 text-xs">
                      <span className="font-medium text-content">
                        {h.fromStatus ?? '—'} → {h.toStatus}
                      </span>
                      <span className="text-content-muted">
                        {' '}
                        · {new Date(h.createdAt).toLocaleString()}
                      </span>
                      {h.note ? <p className="mt-1 text-content-muted">{h.note}</p> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

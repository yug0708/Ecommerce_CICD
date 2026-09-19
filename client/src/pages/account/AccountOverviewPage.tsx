import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Skeleton } from '@/components/ui';
import { listOrders } from '@/lib/account';
import { listAddresses } from '@/lib/checkout';
import { formatPrice } from '@/lib/catalog';
import { orderStatusMeta } from '@/lib/orderStatus';
import { useAuthStore } from '@/store/useAuthStore';
import { useWishlistStore } from '@/store/useWishlistStore';

export default function AccountOverviewPage() {
  const user = useAuthStore((s) => s.user);
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [addressCount, setAddressCount] = useState<number | null>(null);
  const [recent, setRecent] = useState<
    Array<{ id: string; orderNumber: string; status: string; total: string; createdAt: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [orders, addresses] = await Promise.all([
          listOrders({ page: 1, limit: 3 }),
          listAddresses(),
        ]);
        if (cancelled) return;
        setOrderCount(orders.pagination.total);
        setAddressCount(addresses.length);
        setRecent(orders.items);
      } catch {
        if (!cancelled) {
          setOrderCount(0);
          setAddressCount(0);
          setRecent([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-content">
          Hi, {user?.name?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="mt-1 text-sm text-content-muted">
          Manage your orders, profile, addresses, and saved items.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Orders', value: orderCount, to: '/account/orders', hint: 'View history' },
          { label: 'Addresses', value: addressCount, to: '/account/addresses', hint: 'Shipping & billing' },
          { label: 'Wishlist', value: wishlistCount, to: '/account/wishlist', hint: 'Saved products' },
        ].map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="rounded-2xl border border-border bg-surface-raised p-4 shadow-soft transition hover:border-primary-300 hover:shadow-elevated"
          >
            <p className="text-sm text-content-muted">{card.label}</p>
            {loading && card.label !== 'Wishlist' ? (
              <Skeleton className="mt-2 h-7 w-10" />
            ) : (
              <p className="mt-1 text-2xl font-semibold text-content">{card.value ?? 0}</p>
            )}
            <p className="mt-1 text-xs text-content-subtle">{card.hint}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-content">Recent orders</h2>
          <Link to="/account/orders" className="text-sm font-medium text-primary-600 hover:underline">
            View all
          </Link>
        </div>
        {loading ? (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-14 w-full" rounded="xl" />
            <Skeleton className="h-14 w-full" rounded="xl" />
          </div>
        ) : recent.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-8 text-center">
            <p className="text-sm text-content-muted">No orders yet.</p>
            <Link to="/products" className="mt-3 inline-block">
              <Button size="sm">Browse products</Button>
            </Link>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {recent.map((order) => {
              const meta = orderStatusMeta(order.status);
              return (
                <li key={order.id}>
                  <Link
                    to={`/account/orders/${order.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 transition hover:bg-surface-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium text-content">{order.orderNumber}</p>
                      <p className="text-xs text-content-muted">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                      <span className="text-sm font-medium text-content">
                        {formatPrice(order.total)}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="rounded-2xl border border-border bg-surface-muted/40 p-4 text-sm">
        <p className="font-medium text-content">Profile</p>
        <p className="mt-1 text-content-muted">{user?.email}</p>
        <Link to="/account/profile" className="mt-3 inline-block">
          <Button variant="outline" size="sm">
            Edit profile
          </Button>
        </Link>
      </div>
    </div>
  );
}

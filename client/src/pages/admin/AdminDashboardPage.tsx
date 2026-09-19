import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge, Button, Skeleton } from '@/components/ui';
import { fetchAdminStats, type AdminStats } from '@/lib/admin';
import { getErrorMessage } from '@/lib/api';
import { formatPrice } from '@/lib/catalog';
import { orderStatusMeta } from '@/lib/orderStatus';

function MetricCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'warning' | 'danger';
}) {
  return (
    <div
      className={`rounded-xl border bg-surface-raised p-4 shadow-soft ${
        tone === 'warning'
          ? 'border-warning-300'
          : tone === 'danger'
            ? 'border-danger-300'
            : 'border-border'
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-content-subtle">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-content">{value}</p>
      {hint ? <p className="mt-1 text-xs text-content-muted">{hint}</p> : null}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAdminStats(days);
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load dashboard'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [days]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-content">Dashboard</h1>
          <p className="mt-1 text-sm text-content-muted">Revenue, orders, and inventory health.</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-surface-raised p-1 shadow-soft">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                days === d ? 'bg-primary-600 text-white' : 'text-content-muted hover:text-content'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 dark:border-danger-900 dark:bg-danger-950/40 dark:text-danger-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {loading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" rounded="xl" />)
        ) : (
          <>
            <MetricCard label="Revenue" value={formatPrice(stats.totalRevenue)} hint="Paid & fulfilled" />
            <MetricCard label="Orders" value={String(stats.orderCount)} hint="All time" />
            <MetricCard label="Customers" value={String(stats.customerCount)} hint="Customer accounts" />
            <MetricCard
              label="Low stock"
              value={String(stats.lowStockCount)}
              hint={`≤ ${stats.lowStockThreshold} units`}
              tone={stats.lowStockCount > 0 ? 'warning' : 'default'}
            />
          </>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-xl border border-border bg-surface-raised p-4 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-content">Sales over time</h2>
            <span className="text-xs text-content-muted">Last {days} days</span>
          </div>
          {loading || !stats ? (
            <Skeleton className="h-64 w-full" rounded="xl" />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.salesOverTime}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => v.slice(5)}
                    stroke="currentColor"
                    className="text-content-subtle"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => `$${v}`}
                    width={48}
                    stroke="currentColor"
                    className="text-content-subtle"
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid var(--border, #e5e7eb)',
                      fontSize: 12,
                    }}
                    formatter={(value, name) => {
                      const n = typeof value === 'number' ? value : Number(value ?? 0);
                      if (name === 'revenue') return [formatPrice(String(n)), 'Revenue'];
                      return [n, 'Orders'];
                    }}
                    labelFormatter={(label) => String(label)}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563eb"
                    fill="url(#revFill)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-surface-raised p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-content">Low stock alerts</h2>
            <Link to="/admin/products?lowStock=1" className="text-xs font-medium text-primary-600">
              View all
            </Link>
          </div>
          {loading || !stats ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : stats.lowStockProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-content-muted">Inventory looks healthy.</p>
          ) : (
            <ul className="divide-y divide-border">
              {stats.lowStockProducts.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-content">{p.name}</p>
                    <p className="text-xs text-content-muted">{p.sku}</p>
                  </div>
                  <Badge variant={p.stockQuantity === 0 ? 'danger' : 'warning'}>
                    {p.stockQuantity} left
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-border bg-surface-raised p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-content">Recent orders</h2>
          <Link to="/admin/orders">
            <Button variant="outline" size="sm">
              Manage orders
            </Button>
          </Link>
        </div>
        {loading || !stats ? (
          <Skeleton className="h-40 w-full" rounded="xl" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-content-subtle">
                <tr>
                  <th className="px-2 py-2 font-medium">Order</th>
                  <th className="px-2 py-2 font-medium">Customer</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Total</th>
                  <th className="px-2 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.recentOrders.map((order) => {
                  const meta = orderStatusMeta(order.status);
                  return (
                    <tr key={order.id} className="hover:bg-surface-muted/60">
                      <td className="px-2 py-2.5 font-medium text-content">
                        <Link to={`/admin/orders?focus=${order.id}`} className="hover:text-primary-600">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-2 py-2.5 text-content-muted">{order.user.email}</td>
                      <td className="px-2 py-2.5">
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </td>
                      <td className="px-2 py-2.5 font-medium">{formatPrice(order.total)}</td>
                      <td className="px-2 py-2.5 text-content-muted">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Input, Skeleton } from '@/components/ui';
import { fetchAdminCustomers, type AdminCustomer } from '@/lib/admin';
import { getErrorMessage } from '@/lib/api';
import { formatPrice } from '@/lib/catalog';
import { toast } from '@/store/useToastStore';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminCustomers({
        page,
        limit: 20,
        search: debouncedSearch || undefined,
      });
      setCustomers(result.items);
      setTotalPages(Math.max(1, result.pagination.totalPages || 1));
    } catch (err) {
      toast.error('Customers failed', getErrorMessage(err));
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-content">Customers</h1>
        <p className="mt-1 text-sm text-content-muted">
          Accounts, spend, and a shortcut into their order history.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface-raised p-3 shadow-soft">
        <Input
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
        />
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
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-border bg-surface-muted/50 text-xs uppercase tracking-wide text-content-subtle">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Customer</th>
                  <th className="px-3 py-2.5 font-medium">Phone</th>
                  <th className="px-3 py-2.5 font-medium">Orders</th>
                  <th className="px-3 py-2.5 font-medium">Spent</th>
                  <th className="px-3 py-2.5 font-medium">Joined</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-content-muted">
                      No customers found.
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-surface-muted/40">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-content">{customer.name}</p>
                        <p className="text-xs text-content-muted">{customer.email}</p>
                      </td>
                      <td className="px-3 py-2.5 text-content-muted">{customer.phone ?? '—'}</td>
                      <td className="px-3 py-2.5 font-medium text-content">{customer.orderCount}</td>
                      <td className="px-3 py-2.5 font-medium">{formatPrice(customer.totalSpent)}</td>
                      <td className="px-3 py-2.5 text-content-muted">
                        {new Date(customer.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant={customer.isActive ? 'success' : 'outline'}>
                          {customer.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Link to={`/admin/orders?userId=${customer.id}`}>
                          <Button size="sm" variant="outline">
                            Orders
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
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
    </div>
  );
}

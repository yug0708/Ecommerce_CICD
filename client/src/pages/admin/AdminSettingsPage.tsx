import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/store/useAuthStore';

export default function AdminSettingsPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-content">Settings</h1>
        <p className="mt-1 text-sm text-content-muted">
          Admin workspace preferences and account shortcuts.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-surface-raised p-5 shadow-soft">
        <h2 className="text-sm font-semibold text-content">Signed-in admin</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-content-muted">Name</dt>
            <dd className="font-medium text-content">{user?.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-content-muted">Email</dt>
            <dd className="font-medium text-content">{user?.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-content-muted">Role</dt>
            <dd className="font-medium text-content">{user?.role}</dd>
          </div>
        </dl>
        <Link to="/account/profile" className="mt-4 inline-block">
          <Button variant="outline" size="sm">
            Edit profile
          </Button>
        </Link>
      </section>

      <section className="rounded-xl border border-border bg-surface-raised p-5 shadow-soft">
        <h2 className="text-sm font-semibold text-content">Storefront</h2>
        <p className="mt-1 text-sm text-content-muted">
          Preview the customer experience or jump to catalog tools.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/">
            <Button size="sm">Open store</Button>
          </Link>
          <Link to="/admin/products">
            <Button size="sm" variant="outline">
              Manage products
            </Button>
          </Link>
          <Link to="/styleguide">
            <Button size="sm" variant="outline">
              Design system
            </Button>
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface-muted/50 p-5 text-sm text-content-muted">
        <p className="font-medium text-content">Ops notes</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Low-stock threshold on the dashboard defaults to 10 units.</li>
          <li>Product and category deletes are soft deletes (`isActive = false`).</li>
          <li>Order cancellations restore reserved inventory automatically.</li>
        </ul>
      </section>
    </div>
  );
}

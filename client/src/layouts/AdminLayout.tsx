import { Link, NavLink, Outlet } from 'react-router-dom';
import { Seo } from '@/components/seo/Seo';
import { Button, ThemeToggle } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/useAuthStore';
import { useUiStore } from '@/store/useUiStore';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'block rounded-lg px-3 py-2 text-sm font-medium transition',
    isActive
      ? 'bg-primary-600 text-white'
      : 'text-content-muted hover:bg-surface-muted hover:text-content',
  );

const navItems: Array<{ to: string; label: string; end?: boolean }> = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/customers', label: 'Customers' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/settings', label: 'Settings' },
];

export function AdminLayout() {
  const open = useUiStore((s) => s.adminSidebarOpen);
  const toggle = useUiStore((s) => s.toggleAdminSidebar);
  const user = useAuthStore((s) => s.user);

  return (
    <div className="min-h-screen bg-surface-muted">
      <Seo title="Admin" description="Store operations dashboard." path="/admin" noIndex />
      <div className="flex min-h-screen">
        <aside
          className={cn(
            'sticky top-0 h-screen shrink-0 border-r border-border bg-surface-raised transition-all duration-200',
            open ? 'w-56 p-3' : 'w-0 overflow-hidden p-0',
          )}
        >
          <Link to="/admin" className="mb-4 block px-2 pt-1 text-sm font-semibold tracking-tight text-content">
            Commerce Admin
          </Link>
          <p className="px-3 pb-2 text-2xs font-semibold uppercase tracking-wide text-content-subtle">
            Manage
          </p>
          <nav className="flex flex-col gap-0.5">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-border bg-surface-raised/95 px-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={toggle}>
                {open ? 'Hide' : 'Menu'}
              </Button>
              <span className="hidden text-sm text-content-muted sm:inline">
                {user?.email}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link to="/" className="text-sm text-content-muted hover:text-content">
                View store
              </Link>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

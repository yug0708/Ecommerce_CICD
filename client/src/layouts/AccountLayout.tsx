import { NavLink, Outlet } from 'react-router-dom';
import { Seo } from '@/components/seo/Seo';
import { cn } from '@/lib/cn';
import { useWishlistStore } from '@/store/useWishlistStore';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-xl px-3 py-2 text-sm font-medium transition',
    isActive
      ? 'bg-primary-600 text-white'
      : 'text-content-muted hover:bg-surface-muted hover:text-content',
  );

const navItems: Array<{ to: string; label: string; end?: boolean }> = [
  { to: '/account', label: 'Overview', end: true },
  { to: '/account/orders', label: 'Orders' },
  { to: '/account/profile', label: 'Profile' },
  { to: '/account/addresses', label: 'Addresses' },
  { to: '/account/wishlist', label: 'Wishlist' },
];

export function AccountLayout() {
  const wishlistCount = useWishlistStore((s) => s.items.length);

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[220px_1fr]">
      <Seo title="Account" description="Manage your orders, profile, and addresses." path="/account" noIndex />
      <aside className="h-fit rounded-2xl border border-border bg-surface-raised p-3 shadow-soft">
        <p className="px-3 pb-2 text-2xs font-semibold uppercase tracking-wide text-content-subtle">
          Account
        </p>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              <span className="flex items-center justify-between gap-2">
                {item.label}
                {item.to === '/account/wishlist' && wishlistCount > 0 ? (
                  <span className="rounded-md bg-primary-100 px-1.5 py-0.5 text-2xs font-semibold text-primary-700 dark:bg-primary-950 dark:text-primary-300">
                    {wishlistCount}
                  </span>
                ) : null}
              </span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}

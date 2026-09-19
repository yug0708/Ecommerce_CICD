import { Link, NavLink, Outlet } from 'react-router-dom';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { SiteFooter } from '@/components/landing';
import { Button, ThemeToggle } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/useAuthStore';
import { selectCartCount, useCartStore } from '@/store/useCartStore';
import { useUiStore } from '@/store/useUiStore';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-lg px-3 py-2 text-sm font-medium transition',
    isActive ? 'bg-surface-muted text-content' : 'text-content-muted hover:text-content',
  );

export function StoreLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const cartCount = useCartStore(selectCartCount);
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const openCartDrawer = useUiStore((s) => s.openCartDrawer);

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="sticky top-0 z-30 border-b border-border bg-surface-raised/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-sm font-semibold tracking-tight text-content">
              Ecommerce
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              <NavLink to="/products" className={navLinkClass}>
                Products
              </NavLink>
              <button
                type="button"
                className={navLinkClass({ isActive: false })}
                onClick={openCartDrawer}
              >
                Cart{cartCount > 0 ? ` (${cartCount})` : ''}
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            {user ? (
              <>
                <Link
                  to="/account"
                  className="hidden rounded-xl px-3 py-2 text-sm font-medium text-content-muted transition hover:text-content sm:inline-flex"
                >
                  Account
                </Link>
                {user.role === 'ADMIN' ? (
                  <Link
                    to="/admin"
                    className="hidden rounded-xl border border-border px-3 py-2 text-sm font-medium text-content shadow-soft transition hover:bg-surface-muted sm:inline-flex"
                  >
                    Admin
                  </Link>
                ) : null}
                <Button variant="ghost" size="sm" onClick={() => void logout()}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-xl px-3 py-2 text-sm font-medium text-content-muted transition hover:text-content"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="inline-flex h-8 items-center rounded-lg bg-primary-600 px-3 text-xs font-medium text-white shadow-soft transition hover:bg-primary-700"
                >
                  Sign up
                </Link>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
            >
              Menu
            </Button>
          </div>
        </div>

        {mobileNavOpen ? (
          <div className="border-t border-border px-4 py-3 md:hidden">
            <nav className="flex flex-col gap-1">
              <NavLink to="/products" className={navLinkClass} onClick={() => setMobileNavOpen(false)}>
                Products
              </NavLink>
              <button
                type="button"
                className={cn(navLinkClass({ isActive: false }), 'text-left')}
                onClick={() => {
                  setMobileNavOpen(false);
                  openCartDrawer();
                }}
              >
                Cart{cartCount > 0 ? ` (${cartCount})` : ''}
              </button>
              <NavLink to="/account" className={navLinkClass} onClick={() => setMobileNavOpen(false)}>
                Account
              </NavLink>
            </nav>
          </div>
        ) : null}
      </header>

      <Outlet />
      <SiteFooter />
      <CartDrawer />
    </div>
  );
}

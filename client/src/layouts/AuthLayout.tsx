import { Link, Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-muted">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
        <Link to="/" className="mb-8 text-center text-sm font-semibold tracking-tight text-content">
          Ecommerce
        </Link>
        <div className="rounded-2xl border border-border bg-surface-raised p-6 shadow-card">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

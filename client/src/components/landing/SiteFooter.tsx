import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

function SocialIcon({
  label,
  children,
  href,
}: {
  label: string;
  children: ReactNode;
  href: string;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-raised text-content-muted transition hover:text-content"
    >
      {children}
    </a>
  );
}

function PaymentBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex h-8 items-center rounded-lg border border-border bg-surface-raised px-2.5 text-2xs font-semibold tracking-wide text-content-muted">
      {label}
    </span>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-raised">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-sm font-semibold tracking-tight text-content">Ecommerce</p>
          <p className="mt-3 text-sm text-content-muted">
            A modern storefront stack for teams that care about craft, speed, and calm operations.
          </p>
          <div className="mt-4 flex gap-2">
            <SocialIcon label="Ecommerce on X" href="https://x.com">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.924L1.25 2.25h7.08l4.261 5.686L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
              </svg>
            </SocialIcon>
            <SocialIcon label="Ecommerce on Instagram" href="https://instagram.com">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            </SocialIcon>
            <SocialIcon label="Ecommerce on GitHub" href="https://github.com">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                <path d="M12 2C6.477 2 2 6.586 2 12.253c0 4.527 2.865 8.363 6.839 9.712.5.094.682-.222.682-.482 0-.237-.009-.866-.014-1.7-2.782.62-3.369-1.372-3.369-1.372-.455-1.177-1.11-1.49-1.11-1.49-.908-.638.069-.625.069-.625 1.004.072 1.532 1.056 1.532 1.056.892 1.568 2.341 1.115 2.91.853.091-.662.35-1.115.636-1.372-2.22-.259-4.555-1.14-4.555-5.077 0-1.122.39-2.04 1.03-2.76-.103-.26-.447-1.302.098-2.713 0 0 .84-.276 2.75 1.055A9.35 9.35 0 0 1 12 6.84a9.35 9.35 0 0 1 2.504.345c1.909-1.331 2.748-1.055 2.748-1.055.546 1.411.202 2.453.1 2.713.64.72 1.028 1.638 1.028 2.76 0 3.947-2.338 4.815-4.566 5.07.359.317.679.943.679 1.901 0 1.372-.012 2.477-.012 2.814 0 .263.18.58.688.48A10.27 10.27 0 0 0 22 12.253C22 6.586 17.523 2 12 2z" />
              </svg>
            </SocialIcon>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-content-subtle">Shop</p>
          <ul className="mt-3 space-y-2 text-sm text-content-muted">
            <li>
              <Link to="/products" className="hover:text-content">
                All products
              </Link>
            </li>
            <li>
              <Link to="/cart" className="hover:text-content">
                Cart
              </Link>
            </li>
            <li>
              <Link to="/checkout" className="hover:text-content">
                Checkout
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-content-subtle">Company</p>
          <ul className="mt-3 space-y-2 text-sm text-content-muted">
            <li>
              <Link to="/account" className="hover:text-content">
                Account
              </Link>
            </li>
            <li>
              <Link to="/styleguide" className="hover:text-content">
                Style guide
              </Link>
            </li>
            <li>
              <a href="mailto:hello@ecommerce.example" className="hover:text-content">
                Contact
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-content-subtle">Payments</p>
          <p className="mt-3 text-sm text-content-muted">Secure checkout powered by Stripe.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <PaymentBadge label="Visa" />
            <PaymentBadge label="Mastercard" />
            <PaymentBadge label="Amex" />
            <PaymentBadge label="Stripe" />
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-content-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} Ecommerce. All rights reserved.</p>
          <p>Built for modern catalog, cart, and checkout workflows.</p>
        </div>
      </div>
    </footer>
  );
}

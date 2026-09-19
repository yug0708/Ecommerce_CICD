import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input, Skeleton } from '@/components/ui';
import { formatPrice, resolveImageUrl } from '@/lib/catalog';
import { cn } from '@/lib/cn';
import { useCartStore } from '@/store/useCartStore';
import {
  CHECKOUT_FREE_SHIPPING_THRESHOLD,
  estimateTotals,
  useCheckoutStore,
} from '@/store/useCheckoutStore';
import { toast } from '@/store/useToastStore';
import { Seo } from '@/components/seo/Seo';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=200&q=80';

export default function CartPage() {
  const cart = useCartStore((s) => s.cart);
  const isLoading = useCartStore((s) => s.isLoading);
  const isMutating = useCartStore((s) => s.isMutating);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const updateItem = useCartStore((s) => s.updateItem);
  const removeItem = useCartStore((s) => s.removeItem);

  const promoCode = useCheckoutStore((s) => s.promoCode);
  const setPromoCode = useCheckoutStore((s) => s.setPromoCode);
  const [promoInput, setPromoInput] = useState(promoCode);
  const [promoApplied, setPromoApplied] = useState(Boolean(promoCode));

  useEffect(() => {
    void fetchCart();
  }, [fetchCart]);

  const subtotal = Number(cart?.subtotal ?? 0);
  const totals = useMemo(
    () => estimateTotals(subtotal, promoApplied && promoCode ? 10 : 0),
    [subtotal, promoApplied, promoCode],
  );

  function applyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (code.length < 2) {
      toast.warning('Enter a promo code');
      return;
    }
    setPromoCode(code);
    setPromoApplied(true);
    toast.success('Promo saved', 'Discount is finalized when you place the order.');
  }

  function clearPromo() {
    setPromoInput('');
    setPromoCode('');
    setPromoApplied(false);
  }

  if (isLoading && !cart) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" rounded="2xl" />
      </div>
    );
  }

  if (!cart?.items.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-semibold text-content">Your cart is empty</h1>
        <p className="mt-2 text-sm text-content-muted">Browse the catalog and add something you love.</p>
        <Link to="/products" className="mt-6 inline-block">
          <Button>Continue shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Seo title="Cart" description="Review items in your cart before checkout." path="/cart" noIndex />
      <h1 className="text-2xl font-semibold tracking-tight text-content">Shopping cart</h1>
      <p className="mt-1 text-sm text-content-muted">
        {cart.itemCount} item{cart.itemCount === 1 ? '' : 's'}
        {isMutating ? ' · updating…' : ''}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {cart.items.map((item) => {
            const image = resolveImageUrl(item.product.images[0], PLACEHOLDER);
            return (
              <div
                key={item.id}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-raised p-4 shadow-soft sm:flex-row"
              >
                <img
                  src={image}
                  alt={item.product.name}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-xl object-cover"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link
                        to={`/products/${item.product.slug}`}
                        className="font-medium text-content hover:text-primary-600"
                      >
                        {item.product.name}
                      </Link>
                      <p className="mt-0.5 text-sm text-content-muted">
                        {formatPrice(item.product.price)} each
                      </p>
                    </div>
                    <p className="font-semibold text-content">{formatPrice(item.lineTotal)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center rounded-xl border border-border">
                      <button
                        type="button"
                        className="h-9 w-9"
                        aria-label="Decrease quantity"
                        onClick={() =>
                          void (item.quantity <= 1
                            ? removeItem(item.productId)
                            : updateItem(item.productId, item.quantity - 1))
                        }
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <button
                        type="button"
                        className="h-9 w-9"
                        aria-label="Increase quantity"
                        onClick={() => void updateItem(item.productId, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="text-sm text-danger-600 hover:underline"
                      onClick={() => void removeItem(item.productId)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-surface-raised p-5 shadow-card">
          <h2 className="text-sm font-semibold text-content">Order summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-content-muted">Subtotal</dt>
              <dd className="text-content">{formatPrice(totals.subtotal.toFixed(2))}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-content-muted">Estimated shipping</dt>
              <dd className="text-content">
                {totals.shipping === 0 ? 'Free' : formatPrice(totals.shipping.toFixed(2))}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-content-muted">Estimated tax</dt>
              <dd className="text-content">{formatPrice(totals.tax.toFixed(2))}</dd>
            </div>
            {promoApplied && promoCode ? (
              <div className="flex justify-between gap-3 text-success-600">
                <dt>Promo ({promoCode})</dt>
                <dd>−{formatPrice(totals.discount.toFixed(2))} est.</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3 border-t border-border pt-3 text-base font-semibold">
              <dt className="text-content">Estimated total</dt>
              <dd className="text-content">{formatPrice(totals.total.toFixed(2))}</dd>
            </div>
          </dl>

          <p className="mt-2 text-2xs text-content-subtle">
            Free shipping over ${CHECKOUT_FREE_SHIPPING_THRESHOLD}. Final totals calculate at checkout.
          </p>

          <div className="mt-5 space-y-2">
            <label className="text-xs font-medium text-content">Promo code</label>
            <div className="flex gap-2">
              <Input
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                placeholder="SAVE10"
                className="uppercase"
                disabled={promoApplied}
              />
              {promoApplied ? (
                <Button variant="outline" onClick={clearPromo}>
                  Clear
                </Button>
              ) : (
                <Button variant="outline" onClick={applyPromo}>
                  Apply
                </Button>
              )}
            </div>
            <p
              className={cn(
                'text-2xs',
                promoApplied ? 'text-success-600' : 'text-content-subtle',
              )}
            >
              {promoApplied
                ? 'Code saved for checkout validation.'
                : 'Optional — validated when you place the order.'}
            </p>
          </div>

          <Link to="/checkout" className="mt-5 block">
            <Button className="w-full" size="lg">
              Proceed to checkout
            </Button>
          </Link>
          <Link to="/products" className="mt-2 block">
            <Button variant="ghost" className="w-full">
              Continue shopping
            </Button>
          </Link>
        </aside>
      </div>
    </div>
  );
}

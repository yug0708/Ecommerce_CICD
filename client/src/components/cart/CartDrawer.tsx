import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import { formatPrice, resolveImageUrl } from '@/lib/catalog';
import { useCartStore } from '@/store/useCartStore';
import { useUiStore } from '@/store/useUiStore';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=200&q=80';

export function CartDrawer() {
  const open = useUiStore((s) => s.cartDrawerOpen);
  const close = useUiStore((s) => s.closeCartDrawer);
  const cart = useCartStore((s) => s.cart);
  const updateItem = useCartStore((s) => s.updateItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const isMutating = useCartStore((s) => s.isMutating);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-secondary-950/40 backdrop-blur-[1px] animate-fade-in"
        aria-label="Close cart drawer"
        onClick={close}
      />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-border bg-surface-overlay shadow-elevated animate-slide-up">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-content">Your cart</h2>
            <p className="text-xs text-content-muted">
              {cart?.itemCount ?? 0} item{(cart?.itemCount ?? 0) === 1 ? '' : 's'}
              {isMutating ? ' · updating…' : ''}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={close} aria-label="Close">
            ×
          </Button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {!cart?.items.length ? (
            <p className="text-sm text-content-muted">Your cart is empty.</p>
          ) : (
            cart.items.map((item) => {
              const image = resolveImageUrl(item.product.images[0], PLACEHOLDER);
              return (
                <div
                  key={item.id}
                  className="flex gap-3 rounded-2xl border border-border bg-surface-raised p-3 shadow-soft"
                >
                  <img
                    src={image}
                    alt={item.product.name}
                    width={72}
                    height={72}
                    className="h-18 w-18 rounded-xl object-cover"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/products/${item.product.slug}`}
                      className="line-clamp-1 text-sm font-medium text-content hover:text-primary-600"
                      onClick={close}
                    >
                      {item.product.name}
                    </Link>
                    <p className="mt-0.5 text-sm text-content-muted">
                      {formatPrice(item.product.price)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        className="h-7 w-7 rounded-lg border border-border text-sm"
                        onClick={() =>
                          void (item.quantity <= 1
                            ? removeItem(item.productId)
                            : updateItem(item.productId, item.quantity - 1))
                        }
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <button
                        type="button"
                        className="h-7 w-7 rounded-lg border border-border text-sm"
                        onClick={() => void updateItem(item.productId, item.quantity + 1)}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="ml-auto text-xs text-danger-600 hover:underline"
                        onClick={() => void removeItem(item.productId)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-border px-5 py-4">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-content-muted">Subtotal</span>
            <span className="font-semibold text-content">
              {formatPrice(cart?.subtotal ?? '0.00')}
            </span>
          </div>
          <div className="grid gap-2">
            <Link to="/checkout" onClick={close}>
              <Button className="w-full" disabled={!cart?.itemCount}>
                Checkout
              </Button>
            </Link>
            <Link to="/cart" onClick={close}>
              <Button variant="outline" className="w-full">
                View cart
              </Button>
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}

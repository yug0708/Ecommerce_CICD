import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import { formatPrice, resolveImageUrl } from '@/lib/catalog';
import { useCartStore } from '@/store/useCartStore';
import { toast } from '@/store/useToastStore';
import { useWishlistStore } from '@/store/useWishlistStore';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80';

export default function AccountWishlistPage() {
  const items = useWishlistStore((s) => s.items);
  const remove = useWishlistStore((s) => s.remove);
  const clear = useWishlistStore((s) => s.clear);
  const addItem = useCartStore((s) => s.addItem);

  async function addToCart(productId: string) {
    const item = items.find((i) => i.id === productId);
    if (!item) return;
    if (item.id.startsWith('fallback-')) {
      toast.warning('Demo product', 'Sign in with catalog products to add to cart.');
      return;
    }
    try {
      await addItem(item.id, 1, {
        id: item.id,
        name: item.name,
        slug: item.slug,
        price: item.price,
        images: item.images,
        stockQuantity: 99,
        sku: item.slug,
      });
      toast.success('Added to cart', item.name);
    } catch {
      // addItem already surfaces the API error
    }
  }

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content">Wishlist</h1>
          <p className="mt-1 text-sm text-content-muted">
            Save products from the catalog to revisit later.
          </p>
        </div>
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm text-content-muted">Your wishlist is empty.</p>
          <Link to="/products" className="mt-4 inline-block">
            <Button size="sm">Browse products</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content">Wishlist</h1>
          <p className="mt-1 text-sm text-content-muted">
            {items.length} saved item{items.length === 1 ? '' : 's'} (stored on this device).
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            clear();
            toast.success('Wishlist cleared');
          }}
        >
          Clear all
        </Button>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const image = resolveImageUrl(item.images[0], PLACEHOLDER);
          return (
            <li
              key={item.id}
              className="flex gap-3 rounded-2xl border border-border bg-surface-raised p-3 shadow-soft"
            >
              <Link to={`/products/${item.slug}`} className="shrink-0">
                <img
                  src={image}
                  alt=""
                  className="h-24 w-20 rounded-xl object-cover"
                  width={80}
                  height={96}
                />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  to={`/products/${item.slug}`}
                  className="line-clamp-2 text-sm font-medium text-content hover:text-primary-600"
                >
                  {item.name}
                </Link>
                <p className="mt-1 text-sm font-semibold text-content">{formatPrice(item.price)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => void addToCart(item.id)}>
                    Add to cart
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      remove(item.id);
                      toast.success('Removed from wishlist');
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

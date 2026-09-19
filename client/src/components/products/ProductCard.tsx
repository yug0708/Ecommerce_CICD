import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import {
  formatPrice,
  resolveImageUrl,
  type CatalogProduct,
} from '@/lib/catalog';
import { cn } from '@/lib/cn';
import { toast } from '@/store/useToastStore';
import { useWishlistStore } from '@/store/useWishlistStore';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';

export const ProductCard = memo(function ProductCard({ product }: { product: CatalogProduct }) {
  const image = resolveImageUrl(product.images[0], PLACEHOLDER);
  const rating = product.averageRating;
  const isSaved = useWishlistStore((s) => s.isSaved(product.id));
  const toggle = useWishlistStore((s) => s.toggle);

  function handleWishlist(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const saved = toggle({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      images: product.images,
    });
    toast.success(saved ? 'Saved to wishlist' : 'Removed from wishlist', product.name);
  }

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-elevated"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-surface-muted">
        <OptimizedImage
          src={image}
          alt={`${product.name} product photo`}
          width={640}
          height={800}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="h-full w-full transition duration-500 group-hover:scale-105"
        />
        <button
          type="button"
          onClick={handleWishlist}
          aria-label={isSaved ? 'Remove from wishlist' : 'Add to wishlist'}
          className={cn(
            'absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-raised/95 text-sm shadow-soft transition hover:scale-105',
            isSaved ? 'text-danger-600' : 'text-content-muted',
          )}
        >
          {isSaved ? '♥' : '♡'}
        </button>
        {product.compareAtPrice ? (
          <Badge variant="warning" className="absolute left-3 top-3">
            Sale
          </Badge>
        ) : null}
        {product.stockQuantity <= 0 ? (
          <Badge variant="danger" className="absolute bottom-3 left-3">
            Sold out
          </Badge>
        ) : null}
      </div>
      <div className="space-y-1 p-4">
        <p className="text-2xs font-medium uppercase tracking-wide text-content-subtle">
          {product.category?.name ?? 'Collection'}
        </p>
        <h3 className="text-sm font-semibold text-content group-hover:text-primary-600">
          {product.name}
        </h3>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-content">{formatPrice(product.price)}</span>
            {product.compareAtPrice ? (
              <span className="text-xs text-content-subtle line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            ) : null}
          </div>
          {rating != null ? (
            <span className="text-xs text-content-muted">★ {rating.toFixed(1)}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
});

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { Badge, Skeleton } from '@/components/ui';
import {
  FALLBACK_PRODUCTS,
  fetchFeaturedProducts,
  formatPrice,
  resolveImageUrl,
  type CatalogProduct,
} from '@/lib/catalog';
import { FadeIn, Stagger } from './motion';
import { staggerItem } from './motionVariants';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';

export function FeaturedProductsSection() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const items = await fetchFeaturedProducts(8);
        if (cancelled) return;
        if (items.length === 0) {
          setProducts(FALLBACK_PRODUCTS);
          setUsingFallback(true);
        } else {
          setProducts(items);
          setUsingFallback(false);
        }
      } catch {
        if (!cancelled) {
          setProducts(FALLBACK_PRODUCTS);
          setUsingFallback(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="border-b border-border bg-surface-muted py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <FadeIn className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">
              Trending
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-content sm:text-3xl">
              Featured products
            </h2>
            <p className="mt-2 max-w-xl text-sm text-content-muted">
              {usingFallback
                ? 'Showing curated picks while your catalog connects.'
                : 'Fresh arrivals pulled live from your store inventory.'}
            </p>
          </div>
          <Link
            to="/products"
            className="text-sm font-medium text-primary-600 transition hover:text-primary-700"
          >
            View all →
          </Link>
        </FadeIn>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[4/5] w-full" rounded="2xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          <Stagger className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.slice(0, 8).map((product) => {
              const image = resolveImageUrl(product.images[0], PLACEHOLDER);
              const to = usingFallback ? '/products' : `/products/${product.slug}`;

              return (
                <motion.div key={product.id} variants={staggerItem}>
                  <Link
                    to={to}
                    className="group block overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-soft transition duration-300 ease-smooth hover:-translate-y-1 hover:shadow-elevated"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-surface-muted">
                      <OptimizedImage
                        src={image}
                        alt={`${product.name} product photo`}
                        width={640}
                        height={800}
                        className="h-full w-full transition duration-500 ease-smooth group-hover:scale-105"
                      />
                      {product.compareAtPrice ? (
                        <Badge variant="warning" className="absolute left-3 top-3">
                          Sale
                        </Badge>
                      ) : null}
                    </div>
                    <div className="space-y-1 p-4">
                      <p className="text-2xs font-medium uppercase tracking-wide text-content-subtle">
                        {product.category?.name ?? 'Collection'}
                      </p>
                      <h3 className="text-sm font-semibold text-content transition group-hover:text-primary-600">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-content">
                          {formatPrice(product.price)}
                        </span>
                        {product.compareAtPrice ? (
                          <span className="text-xs text-content-subtle line-through">
                            {formatPrice(product.compareAtPrice)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </Stagger>
        )}
      </div>
    </section>
  );
}

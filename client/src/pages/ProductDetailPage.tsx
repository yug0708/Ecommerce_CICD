import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, Skeleton } from '@/components/ui';
import { ProductCard } from '@/components/products/ProductCard';
import {
  formatPrice,
  getFallbackProductDetail,
  fetchProductBySlug,
  resolveImageUrl,
  type ProductDetail,
} from '@/lib/catalog';
import { cn } from '@/lib/cn';
import { useCartStore } from '@/store/useCartStore';
import { toast } from '@/store/useToastStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import { Seo } from '@/components/seo/Seo';
import { OptimizedImage } from '@/components/media/OptimizedImage';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80';

type TabKey = 'description' | 'specs' | 'reviews';

export default function ProductDetailPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const wishlistToggle = useWishlistStore((s) => s.toggle);

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState<TabKey>('description');
  const [adding, setAdding] = useState(false);

  const isWishlisted = useWishlistStore((s) =>
    product ? s.isSaved(product.id) : false,
  );

  useEffect(() => {
    let cancelled = false;

    async function load(silent = false) {
      if (!silent) {
        setLoading(true);
        setActiveImage(0);
        setQuantity(1);
      }
      try {
        const data = await fetchProductBySlug(slug);
        if (cancelled) return;
        if (data) {
          setProduct(data);
        } else if (!silent) {
          setProduct(getFallbackProductDetail(slug));
        }
      } catch {
        if (!cancelled && !silent) setProduct(getFallbackProductDetail(slug));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    function onFocus() {
      if (document.visibilityState === 'visible') void load(true);
    }

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [slug]);

  const images = useMemo(() => {
    if (!product?.images?.length) return [PLACEHOLDER];
    return product.images.map((img) => resolveImageUrl(img, PLACEHOLDER));
  }, [product]);

  async function handleAddToCart() {
    if (!product || product.stockQuantity <= 0) return false;
    setAdding(true);
    try {
      await addItem(product.id, quantity, {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        images: product.images,
        stockQuantity: product.stockQuantity,
        sku: product.sku,
      });
      toast.success('Added to cart', product.name);
      return true;
    } catch {
      return false;
    } finally {
      setAdding(false);
    }
  }

  async function handleBuyNow() {
    const added = await handleAddToCart();
    if (added) navigate('/checkout');
  }

  if (loading) {
    return (
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full" rounded="2xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-11 w-40" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-semibold text-content">Product not found</h1>
        <p className="mt-2 text-sm text-content-muted">That slug doesn’t match an active product.</p>
        <Link to="/products" className="mt-6 inline-block">
          <Button>Back to products</Button>
        </Link>
      </div>
    );
  }

  const inStock = product.stockQuantity > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Seo
        title={product.name}
        description={product.description.slice(0, 160)}
        path={`/products/${product.slug}`}
        image={images[0]}
        type="product"
      />
      <div className="mb-4 text-sm text-content-muted">
        <Link to="/products" className="hover:text-content">
          Products
        </Link>
        {product.category ? (
          <>
            <span className="mx-2">/</span>
            <Link
              to={`/products?categorySlug=${product.category.slug}`}
              className="hover:text-content"
            >
              {product.category.name}
            </Link>
          </>
        ) : null}
        <span className="mx-2">/</span>
        <span className="text-content">{product.name}</span>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <button
            type="button"
            className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-surface-muted shadow-soft"
            onClick={() => setZoomed((v) => !v)}
            aria-label={zoomed ? 'Zoom out image' : 'Zoom in image'}
          >
            <OptimizedImage
              src={images[activeImage]}
              alt={`${product.name} — image ${activeImage + 1}`}
              width={900}
              height={900}
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              srcWidths={[600, 900, 1200]}
              className={cn(
                'h-full w-full transition duration-300',
                zoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in',
              )}
            />
          </button>
          {images.length > 1 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((src, index) => (
                <button
                  key={src + index}
                  type="button"
                  className={cn(
                    'h-16 w-16 shrink-0 overflow-hidden rounded-xl border',
                    index === activeImage ? 'border-primary-600 ring-2 ring-primary-500/30' : 'border-border',
                  )}
                  onClick={() => {
                    setActiveImage(index);
                    setZoomed(false);
                  }}
                >
                  <img
                    src={src}
                    alt={`${product.name} thumbnail ${index + 1}`}
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.category ? <Badge variant="primary">{product.category.name}</Badge> : null}
            <Badge variant={inStock ? 'success' : 'danger'}>
              {inStock ? `${product.stockQuantity} in stock` : 'Out of stock'}
            </Badge>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-content">{product.name}</h1>
          {product.averageRating != null ? (
            <p className="mt-2 text-sm text-content-muted">
              ★ {product.averageRating.toFixed(1)} · {product.reviews?.length ?? product.reviewCount ?? 0}{' '}
              reviews
            </p>
          ) : null}

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-2xl font-semibold text-content">{formatPrice(product.price)}</span>
            {product.compareAtPrice ? (
              <span className="text-base text-content-subtle line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            ) : null}
          </div>

          <p className="mt-4 text-sm leading-relaxed text-content-muted line-clamp-3">
            {product.description}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center rounded-xl border border-border bg-surface-raised shadow-soft">
              <button
                type="button"
                className="h-10 w-10 text-lg"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-10 text-center text-sm font-medium">{quantity}</span>
              <button
                type="button"
                className="h-10 w-10 text-lg"
                onClick={() =>
                  setQuantity((q) => Math.min(product.stockQuantity || 1, q + 1))
                }
                aria-label="Increase quantity"
                disabled={!inStock}
              >
                +
              </button>
            </div>
            <Button
              onClick={() => void handleAddToCart()}
              isLoading={adding}
              disabled={!inStock}
            >
              Add to cart
            </Button>
            <Button
              variant="secondary"
              onClick={() => void handleBuyNow()}
              disabled={!inStock || adding}
            >
              Buy now
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const saved = wishlistToggle({
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  price: product.price,
                  compareAtPrice: product.compareAtPrice,
                  images: product.images,
                });
                toast.success(
                  saved ? 'Saved to wishlist' : 'Removed from wishlist',
                  product.name,
                );
              }}
            >
              {isWishlisted ? '♥ Saved' : '♡ Wishlist'}
            </Button>
          </div>
          <p className="mt-3 text-xs text-content-subtle">SKU: {product.sku}</p>
        </div>
      </div>

      <div className="mt-12">
        <div className="flex gap-1 border-b border-border">
          {(
            [
              ['description', 'Description'],
              ['specs', 'Specifications'],
              ['reviews', 'Reviews'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={cn(
                'px-4 py-2.5 text-sm font-medium transition',
                tab === key
                  ? 'border-b-2 border-primary-600 text-content'
                  : 'text-content-muted hover:text-content',
              )}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="rounded-b-2xl border border-t-0 border-border bg-surface-raised p-5 shadow-soft">
          {tab === 'description' ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-content-muted">
              {product.description}
            </p>
          ) : null}

          {tab === 'specs' ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-4 border-b border-border py-2">
                <dt className="text-content-muted">SKU</dt>
                <dd className="font-medium text-content">{product.sku}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-border py-2">
                <dt className="text-content-muted">Category</dt>
                <dd className="font-medium text-content">{product.category?.name ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-border py-2">
                <dt className="text-content-muted">Stock</dt>
                <dd className="font-medium text-content">{product.stockQuantity}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-border py-2">
                <dt className="text-content-muted">Compare at</dt>
                <dd className="font-medium text-content">
                  {product.compareAtPrice ? formatPrice(product.compareAtPrice) : '—'}
                </dd>
              </div>
            </dl>
          ) : null}

          {tab === 'reviews' ? (
            <div className="space-y-4">
              {(product.reviews ?? []).length === 0 ? (
                <p className="text-sm text-content-muted">No reviews yet.</p>
              ) : (
                product.reviews.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-xl border border-border bg-surface-muted/50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-content">{review.user.name}</p>
                      <p className="text-xs text-content-muted">{'★'.repeat(review.rating)}</p>
                    </div>
                    {review.title ? (
                      <p className="mt-1 text-sm font-medium text-content">{review.title}</p>
                    ) : null}
                    {review.comment ? (
                      <p className="mt-1 text-sm text-content-muted">{review.comment}</p>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>

      {product.relatedProducts?.length ? (
        <section className="mt-14">
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-tight text-content">Related products</h2>
            <Link to="/products" className="text-sm font-medium text-primary-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {product.relatedProducts.map((related) => (
              <div key={related.id} className="min-w-[220px] sm:min-w-0">
                <ProductCard product={related} />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

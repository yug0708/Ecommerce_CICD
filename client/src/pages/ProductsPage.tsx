import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Input } from '@/components/ui';
import { ProductCard } from '@/components/products/ProductCard';
import { ProductGridSkeleton } from '@/components/products/ProductGridSkeleton';
import {
  FALLBACK_CATEGORIES,
  FALLBACK_PRODUCTS,
  fetchCategories,
  fetchProducts,
  type CatalogCategory,
  type CatalogProduct,
} from '@/lib/catalog';
import { cn } from '@/lib/cn';
import { Seo } from '@/components/seo/Seo';

type SortKey = 'newest' | 'price-asc' | 'price-desc' | 'popularity';

function mapSort(sort: SortKey): { sortBy: 'createdAt' | 'price' | 'popularity'; sortOrder: 'asc' | 'desc' } {
  switch (sort) {
    case 'price-asc':
      return { sortBy: 'price', sortOrder: 'asc' };
    case 'price-desc':
      return { sortBy: 'price', sortOrder: 'desc' };
    case 'popularity':
      return { sortBy: 'popularity', sortOrder: 'desc' };
    default:
      return { sortBy: 'createdAt', sortOrder: 'desc' };
  }
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const page = Number(searchParams.get('page') || 1);
  const categorySlug = searchParams.get('categorySlug') || '';
  const minPrice = Number(searchParams.get('minPrice') || 0);
  const maxPrice = Number(searchParams.get('maxPrice') || 500);
  const minRating = Number(searchParams.get('minRating') || 0);
  const search = searchParams.get('search') || '';
  const sort = (searchParams.get('sort') as SortKey) || 'newest';

  const [priceDraft, setPriceDraft] = useState({ min: minPrice, max: maxPrice });

  useEffect(() => {
    setPriceDraft({ min: minPrice, max: maxPrice });
  }, [minPrice, maxPrice]);

  useEffect(() => {
    void fetchCategories()
      .then((items) => setCategories(items.length ? items : FALLBACK_CATEGORIES))
      .catch(() => setCategories(FALLBACK_CATEGORIES));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { sortBy, sortOrder } = mapSort(sort);

      try {
        const result = await fetchProducts({
          page,
          limit: 12,
          categorySlug: categorySlug || undefined,
          minPrice: minPrice || undefined,
          maxPrice: maxPrice < 500 ? maxPrice : maxPrice === 500 ? 500 : undefined,
          search: search || undefined,
          sortBy,
          sortOrder,
          minRating: minRating || undefined,
        });

        if (cancelled) return;

        if (result.items.length === 0 && page === 1 && !search && !categorySlug && !minRating) {
          // Local fallback catalog with client-side filters for empty DB
          let items = [...FALLBACK_PRODUCTS];
          if (categorySlug) items = items.filter((p) => p.category?.slug === categorySlug);
          items = items.filter((p) => {
            const price = Number(p.price);
            return price >= minPrice && price <= maxPrice;
          });
          if (minRating) {
            items = items.filter((p) => (p.averageRating ?? 0) >= minRating);
          }
          if (search) {
            const q = search.toLowerCase();
            items = items.filter(
              (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
            );
          }
          if (sort === 'price-asc') items.sort((a, b) => Number(a.price) - Number(b.price));
          if (sort === 'price-desc') items.sort((a, b) => Number(b.price) - Number(a.price));
          if (sort === 'popularity') {
            items.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
          }

          setProducts(items);
          setTotal(items.length);
          setTotalPages(1);
          setUsingFallback(true);
        } else {
          setProducts(result.items);
          setTotal(result.pagination.total);
          setTotalPages(Math.max(result.pagination.totalPages, 1));
          setUsingFallback(false);
        }
      } catch {
        if (!cancelled) {
          setProducts(FALLBACK_PRODUCTS);
          setTotal(FALLBACK_PRODUCTS.length);
          setTotalPages(1);
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
  }, [page, categorySlug, minPrice, maxPrice, minRating, search, sort]);

  function updateParams(patch: Record<string, string | number | null>) {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === null || value === '' || value === 0) next.delete(key);
      else next.set(key, String(value));
    });
    if (!('page' in patch)) next.set('page', '1');
    setSearchParams(next);
  }

  const categoryOptions = useMemo(
    () => categories.filter((c) => !c.parentId).slice(0, 12),
    [categories],
  );

  const Filters = (
    <div className="space-y-6">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-content-subtle">
          Search
        </label>
        <Input
          className="mt-2"
          placeholder="Search products"
          defaultValue={search}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              updateParams({ search: (e.target as HTMLInputElement).value });
            }
          }}
        />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-content-subtle">Category</p>
        <div className="mt-2 space-y-1">
          <button
            type="button"
            className={cn(
              'block w-full rounded-lg px-3 py-2 text-left text-sm',
              !categorySlug ? 'bg-primary-600 text-white' : 'hover:bg-surface-muted',
            )}
            onClick={() => updateParams({ categorySlug: null })}
          >
            All categories
          </button>
          {categoryOptions.map((category) => (
            <button
              key={category.id}
              type="button"
              className={cn(
                'block w-full rounded-lg px-3 py-2 text-left text-sm',
                categorySlug === category.slug
                  ? 'bg-primary-600 text-white'
                  : 'text-content-muted hover:bg-surface-muted hover:text-content',
              )}
              onClick={() => updateParams({ categorySlug: category.slug })}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-content-subtle">
          Price range
        </p>
        <div className="mt-3 space-y-3">
          <input
            type="range"
            min={0}
            max={500}
            step={5}
            value={priceDraft.max}
            onChange={(e) =>
              setPriceDraft((prev) => ({ ...prev, max: Number(e.target.value) }))
            }
            onMouseUp={() => updateParams({ minPrice: priceDraft.min, maxPrice: priceDraft.max })}
            onTouchEnd={() => updateParams({ minPrice: priceDraft.min, maxPrice: priceDraft.max })}
            className="w-full accent-primary-600"
          />
          <div className="flex items-center gap-2 text-sm text-content-muted">
            <span>${priceDraft.min}</span>
            <span>—</span>
            <span>${priceDraft.max}{priceDraft.max >= 500 ? '+' : ''}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => updateParams({ minPrice: priceDraft.min, maxPrice: priceDraft.max })}
          >
            Apply price
          </Button>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-content-subtle">
          Minimum rating
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[0, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-medium',
                minRating === value
                  ? 'border-primary-600 bg-primary-600 text-white'
                  : 'border-border text-content-muted hover:bg-surface-muted',
              )}
              onClick={() => updateParams({ minRating: value || null })}
            >
              {value === 0 ? 'Any' : `${value}★+`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Seo
        title="Shop the collection"
        description="Browse apparel, home, and accessories with filters for price, category, and rating."
        path="/products"
      />
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content">Products</h1>
          <p className="mt-1 text-sm text-content-muted">
            {loading ? 'Loading catalog…' : `${total} result${total === 1 ? '' : 's'}`}
            {usingFallback ? ' · demo catalog' : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            {filtersOpen ? 'Hide filters' : 'Filters'}
          </Button>
          <label className="flex items-center gap-2 text-sm text-content-muted">
            Sort
            <select
              className="h-9 rounded-xl border border-border bg-surface-raised px-3 text-sm text-content shadow-soft focus-ring"
              value={sort}
              onChange={(e) => updateParams({ sort: e.target.value })}
            >
              <option value="newest">Newest</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="popularity">Popularity</option>
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside
          className={cn(
            'h-fit rounded-2xl border border-border bg-surface-raised p-4 shadow-soft lg:block',
            filtersOpen ? 'block' : 'hidden',
          )}
        >
          {Filters}
        </aside>

        <div>
          {loading ? (
            <ProductGridSkeleton />
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface-raised p-10 text-center shadow-soft">
              <p className="text-sm text-content-muted">No products match these filters.</p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => setSearchParams(new URLSearchParams())}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {totalPages > 1 ? (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => updateParams({ page: page - 1 })}
              >
                Previous
              </Button>
              <span className="text-sm text-content-muted">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: page + 1 })}
              >
                Next
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui';
import {
  FALLBACK_CATEGORIES,
  fetchCategories,
  resolveImageUrl,
  type CatalogCategory,
} from '@/lib/catalog';
import { FadeIn, Stagger, staggerItem } from './motion';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=900&q=80';

export function CategoryShowcaseSection() {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const items = await fetchCategories();
        if (cancelled) return;
        const roots = items.filter((c) => !c.parentId);
        const list = (roots.length ? roots : items).slice(0, 4);
        if (list.length === 0) {
          setCategories(FALLBACK_CATEGORIES);
          setUsingFallback(true);
        } else {
          setCategories(list);
          setUsingFallback(false);
        }
      } catch {
        if (!cancelled) {
          setCategories(FALLBACK_CATEGORIES);
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
    <section className="border-b border-border bg-surface-raised py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <FadeIn className="mb-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">
            Browse
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-content sm:text-3xl">
            Shop by category
          </h2>
          <p className="mt-2 text-sm text-content-muted">
            Jump into the rooms of the store — each collection is curated for everyday use.
          </p>
        </FadeIn>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[5/4] w-full" rounded="2xl" />
            ))}
          </div>
        ) : (
          <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => {
              const image = resolveImageUrl(category.imageUrl, PLACEHOLDER);
              const to = usingFallback
                ? `/products?categorySlug=${category.slug}`
                : `/products?categorySlug=${category.slug}`;

              return (
                <motion.div key={category.id} variants={staggerItem}>
                  <Link
                    to={to}
                    className="group relative block overflow-hidden rounded-2xl border border-border shadow-soft"
                  >
                    <div className="aspect-[5/4] overflow-hidden">
                      <img
                        src={image}
                        alt={`${category.name} category lifestyle photo`}
                        width={720}
                        height={576}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition duration-500 ease-smooth group-hover:scale-105"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-secondary-950/75 via-secondary-950/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <h3 className="text-base font-semibold text-white">{category.name}</h3>
                      <p className="mt-1 line-clamp-2 text-xs text-white/75">
                        {category.description ??
                          `${category._count?.products ?? 0} products`}
                      </p>
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

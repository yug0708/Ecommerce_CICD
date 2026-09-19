export const CACHE_TTL = {
  productList: 60,
  productDetail: 120,
  categories: 120,
} as const;

export const CACHE_PREFIX = {
  products: 'catalog:products:',
  categories: 'catalog:categories:',
} as const;

export function stableKey(value: unknown): string {
  if (value === null || typeof value !== 'object') return String(value);
  if (Array.isArray(value)) return `[${value.map(stableKey).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${k}:${stableKey(v)}`).join(',')}}`;
}

export function catalogCacheKey(kind: 'list' | 'slug' | 'categories', payload: unknown): string {
  const prefix = kind === 'categories' ? CACHE_PREFIX.categories : CACHE_PREFIX.products;
  return `${prefix}${kind}:${stableKey(payload)}`;
}

import type { ApiResponse } from '@/types/api';
import { api } from '@/lib/api';

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  compareAtPrice: string | null;
  images: string[];
  stockQuantity: number;
  sku?: string;
  categoryId?: string;
  category?: { id: string; name: string; slug: string };
  averageRating?: number | null;
  reviewCount?: number;
  _count?: { reviews: number };
};

export type ProductReview = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  createdAt: string;
  user: { id: string; name: string };
};

export type ProductDetail = CatalogProduct & {
  averageRating: number | null;
  reviews: ProductReview[];
  relatedProducts: CatalogProduct[];
  sku: string;
};

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId?: string | null;
  _count?: { products: number; children: number };
};

export type ProductListParams = {
  page?: number;
  limit?: number;
  categoryId?: string;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sortBy?: 'createdAt' | 'price' | 'name' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  minRating?: number;
};

export type ProductListResult = {
  items: CatalogProduct[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export async function fetchProducts(params: ProductListParams = {}): Promise<ProductListResult> {
  const { data } = await api.get<ApiResponse<ProductListResult>>('/products', { params });
  if (!data.success) {
    return { items: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } };
  }
  return data.data;
}

export async function fetchProductBySlug(slug: string): Promise<ProductDetail | null> {
  try {
    const { data } = await api.get<ApiResponse<{ product: ProductDetail }>>(`/products/${slug}`);
    if (!data.success) return null;
    return data.data.product;
  } catch {
    return null;
  }
}

export function isDemoCatalogId(id: string | undefined): boolean {
  return Boolean(id?.startsWith('fallback-'));
}

/** Map a demo/fallback product to the real catalog row (by slug) when the DB is seeded. */
export async function resolveLiveCatalogProduct(input: {
  id?: string;
  slug?: string;
}): Promise<ProductDetail | CatalogProduct | null> {
  if (input.slug) {
    const live = await fetchProductBySlug(input.slug);
    if (live) return live;
  }
  return null;
}

export async function fetchFeaturedProducts(limit = 8): Promise<CatalogProduct[]> {
  const result = await fetchProducts({ page: 1, limit, sortBy: 'createdAt', sortOrder: 'desc' });
  return result.items;
}

export async function fetchCategories(): Promise<CatalogCategory[]> {
  const { data } = await api.get<ApiResponse<{ categories: CatalogCategory[] }>>('/categories');
  if (!data.success) return [];
  return data.data.categories;
}

/** Curated Unsplash fallbacks when the catalog is empty or images are missing */
export const FALLBACK_PRODUCTS: CatalogProduct[] = [
  {
    id: 'fallback-1',
    name: 'Minimal Desk Lamp',
    slug: 'minimal-desk-lamp',
    description: 'Warm LED task light with matte aluminum finish.',
    price: '89.00',
    compareAtPrice: '110.00',
    images: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
    ],
    stockQuantity: 12,
    sku: 'LAMP-01',
    averageRating: 4.6,
    reviewCount: 18,
    category: { id: 'c1', name: 'Home', slug: 'home' },
  },
  {
    id: 'fallback-2',
    name: 'Everyday Tote',
    slug: 'everyday-tote',
    description: 'Structured canvas tote for work and weekend.',
    price: '64.00',
    compareAtPrice: null,
    images: [
      'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80',
    ],
    stockQuantity: 30,
    sku: 'TOTE-02',
    averageRating: 4.2,
    reviewCount: 9,
    category: { id: 'c2', name: 'Accessories', slug: 'accessories' },
  },
  {
    id: 'fallback-3',
    name: 'Ceramic Pour-Over Set',
    slug: 'ceramic-pour-over',
    description: 'Hand-glazed dripper and mug for morning rituals.',
    price: '48.00',
    compareAtPrice: '58.00',
    images: [
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=800&q=80',
    ],
    stockQuantity: 18,
    sku: 'COFFEE-03',
    averageRating: 4.9,
    reviewCount: 27,
    category: { id: 'c3', name: 'Kitchen', slug: 'kitchen' },
  },
  {
    id: 'fallback-4',
    name: 'Linen Throw Pillow',
    slug: 'linen-throw-pillow',
    description: 'Soft stonewashed linen with hidden zipper.',
    price: '36.00',
    compareAtPrice: null,
    images: [
      'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80',
    ],
    stockQuantity: 40,
    sku: 'PILLOW-04',
    averageRating: 3.8,
    reviewCount: 5,
    category: { id: 'c1', name: 'Home', slug: 'home' },
  },
  {
    id: 'fallback-5',
    name: 'Walnut Side Table',
    slug: 'walnut-side-table',
    description: 'Compact solid wood table with eased edges.',
    price: '220.00',
    compareAtPrice: null,
    images: [
      'https://images.unsplash.com/photo-1532372320572-cda256256de2?auto=format&fit=crop&w=800&q=80',
    ],
    stockQuantity: 6,
    sku: 'TABLE-05',
    averageRating: 4.7,
    reviewCount: 11,
    category: { id: 'c1', name: 'Home', slug: 'home' },
  },
  {
    id: 'fallback-6',
    name: 'Merino Crew Sweater',
    slug: 'merino-crew-sweater',
    description: 'Fine-gauge merino for year-round layering.',
    price: '128.00',
    compareAtPrice: '148.00',
    images: [
      'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80',
    ],
    stockQuantity: 22,
    sku: 'SWEATER-06',
    averageRating: 4.4,
    reviewCount: 33,
    category: { id: 'c4', name: 'Apparel', slug: 'apparel' },
  },
];

export const FALLBACK_CATEGORIES: CatalogCategory[] = [
  {
    id: 'fc-1',
    name: 'Home',
    slug: 'home',
    description: 'Lighting, textiles, and living essentials',
    imageUrl:
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=80',
    _count: { products: 24, children: 3 },
  },
  {
    id: 'fc-2',
    name: 'Apparel',
    slug: 'apparel',
    description: 'Layered basics in quiet neutrals',
    imageUrl:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80',
    _count: { products: 41, children: 4 },
  },
  {
    id: 'fc-3',
    name: 'Accessories',
    slug: 'accessories',
    description: 'Bags, wallets, and daily carry',
    imageUrl:
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80',
    _count: { products: 19, children: 2 },
  },
  {
    id: 'fc-4',
    name: 'Kitchen',
    slug: 'kitchen',
    description: 'Tools for slow mornings',
    imageUrl:
      'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80',
    _count: { products: 15, children: 2 },
  },
];

export function resolveImageUrl(path: string | null | undefined, fallback: string): string {
  if (!path) return fallback;
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  if (path.startsWith('/uploads')) {
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    const origin = apiBase.startsWith('http') ? apiBase.replace(/\/api\/?$/, '') : '';
    return `${origin}${path}`;
  }
  return path;
}

export function formatPrice(value: string): string {
  const amount = Number(value);
  if (Number.isNaN(amount)) return value;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function getFallbackProductDetail(slug: string): ProductDetail | null {
  const product = FALLBACK_PRODUCTS.find((p) => p.slug === slug);
  if (!product) return null;

  return {
    ...product,
    sku: product.sku ?? 'SKU',
    averageRating: product.averageRating ?? 4.5,
    reviews: [
      {
        id: 'r1',
        rating: 5,
        title: 'Excellent quality',
        comment: 'Exactly as described — packaging was thoughtful and shipping was quick.',
        createdAt: new Date().toISOString(),
        user: { id: 'u1', name: 'Jordan Lee' },
      },
      {
        id: 'r2',
        rating: 4,
        title: 'Worth it',
        comment: 'Beautiful finish. Slightly smaller than expected but still love it.',
        createdAt: new Date().toISOString(),
        user: { id: 'u2', name: 'Sam Rivera' },
      },
    ],
    relatedProducts: FALLBACK_PRODUCTS.filter((p) => p.id !== product.id).slice(0, 4),
  };
}

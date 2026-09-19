import { z } from 'zod';

const moneySchema = z.coerce.number().positive('Price must be greater than 0').max(99999999.99);

const imageRefSchema = z
  .string()
  .min(1)
  .refine(
    (value) => value.startsWith('/uploads/') || /^https?:\/\//i.test(value),
    'Image must be an absolute URL or an /uploads path',
  );

function parseImageList(value: unknown): string[] {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value !== 'string') return [];

  const trimmed = value.trim();
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
  } catch {
    // comma-separated fallback
  }

  return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
}

const optionalBool = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === '1';
  });

export const listProductsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    categoryId: z.string().min(1).optional(),
    categorySlug: z.string().min(1).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    search: z.string().trim().max(200).optional(),
    sortBy: z.enum(['createdAt', 'price', 'name', 'popularity']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    minRating: z.coerce.number().min(1).max(5).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.minPrice !== undefined && data.maxPrice !== undefined && data.minPrice > data.maxPrice) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['minPrice'],
        message: 'minPrice cannot be greater than maxPrice',
      });
    }
  });

const productBodySchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(220)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase kebab-case')
    .optional(),
  description: z.string().trim().min(10).max(20000),
  price: moneySchema,
  compareAtPrice: z.coerce.number().positive().max(99999999.99).optional().nullable(),
  stockQuantity: z.coerce.number().int().min(0).default(0),
  sku: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[A-Za-z0-9_-]+$/, 'SKU may only contain letters, numbers, underscores, and hyphens'),
  categoryId: z.string().min(1, 'categoryId is required'),
  isActive: optionalBool,
  images: z.preprocess(parseImageList, z.array(imageRefSchema).default([])),
});

export const createProductSchema = productBodySchema.superRefine((data, ctx) => {
  if (data.compareAtPrice != null && data.compareAtPrice <= data.price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['compareAtPrice'],
      message: 'compareAtPrice must be greater than price',
    });
  }
});

export const updateProductSchema = productBodySchema.partial().superRefine((data, ctx) => {
  if (
    data.compareAtPrice != null &&
    data.price !== undefined &&
    data.compareAtPrice <= data.price
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['compareAtPrice'],
      message: 'compareAtPrice must be greater than price',
    });
  }
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

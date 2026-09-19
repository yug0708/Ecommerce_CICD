import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().min(1, 'id is required'),
});

export const slugParamSchema = z.object({
  slug: z.string().min(1, 'slug is required'),
});

export const listCategoriesQuerySchema = z.object({
  parentId: z.string().min(1).optional(),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase kebab-case')
    .optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  parentId: z.string().min(1).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
    .optional()
    .transform((value) => {
      if (value === undefined) return true;
      if (typeof value === 'boolean') return value;
      return value === 'true' || value === '1';
    }),
});

export const updateCategorySchema = createCategorySchema.partial();

export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

import { z } from 'zod';
import { Role } from '@prisma/client';

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  role: z.nativeEnum(Role).optional(),
});

export const listAdminProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  categoryId: z.string().min(1).optional(),
  isActive: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (typeof value === 'boolean') return value;
      return value === 'true' || value === '1';
    }),
  lowStock: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (typeof value === 'boolean') return value;
      return value === 'true' || value === '1';
    }),
  sortBy: z.enum(['createdAt', 'price', 'name', 'stockQuantity']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const adminStatsQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(90).default(30),
  lowStockThreshold: z.coerce.number().int().min(0).max(1000).default(10),
});

export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
export type ListAdminProductsQuery = z.infer<typeof listAdminProductsQuerySchema>;
export type AdminStatsQuery = z.infer<typeof adminStatsQuerySchema>;

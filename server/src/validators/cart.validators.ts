import { z } from 'zod';

export const guestIdSchema = z
  .string()
  .uuid('guestId must be a valid UUID (store in localStorage)');

export const addCartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(99).default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(99),
});

export const productIdParamSchema = z.object({
  productId: z.string().min(1),
});

export const mergeCartSchema = z.object({
  guestId: guestIdSchema,
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type MergeCartInput = z.infer<typeof mergeCartSchema>;

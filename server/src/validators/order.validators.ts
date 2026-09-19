import { OrderStatus } from '@prisma/client';
import { z } from 'zod';

export const createOrderSchema = z.object({
  shippingAddressId: z.string().min(1),
  billingAddressId: z.string().min(1).optional(),
  couponCode: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .transform((v) => v.toUpperCase())
    .optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(OrderStatus).optional(),
});

export const listAdminOrdersQuerySchema = listOrdersQuerySchema.extend({
  userId: z.string().min(1).optional(),
  orderNumber: z.string().trim().min(1).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  search: z.string().trim().max(200).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  note: z.string().trim().max(500).optional(),
});

export const orderIdParamSchema = z.object({
  id: z.string().min(1),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type ListAdminOrdersQuery = z.infer<typeof listAdminOrdersQuerySchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

import { z } from 'zod';

export const createPaymentIntentSchema = z.object({
  orderId: z.string().min(1, 'orderId is required'),
});

export const confirmDemoPaymentSchema = z.object({
  orderId: z.string().min(1, 'orderId is required'),
  clientSecret: z.string().min(1, 'clientSecret is required'),
});

export const refundPaymentSchema = z.object({
  /** Optional partial refund amount in major currency units (e.g. 10.50). Omit for full refund. */
  amount: z.coerce.number().positive().max(99999999.99).optional(),
});

export const paymentIdParamSchema = z.object({
  id: z.string().min(1),
});

export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;
export type ConfirmDemoPaymentInput = z.infer<typeof confirmDemoPaymentSchema>;
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;

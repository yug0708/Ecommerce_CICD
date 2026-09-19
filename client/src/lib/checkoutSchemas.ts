import { z } from 'zod';

export const shippingAddressSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  line1: z.string().trim().min(3, 'Address is required'),
  line2: z.string().trim().max(200).optional().or(z.literal('')),
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().trim().min(2, 'State is required'),
  postalCode: z.string().trim().min(3, 'Postal code is required'),
  country: z
    .string()
    .trim()
    .length(2, 'Use a 2-letter country code')
    .transform((v) => v.toUpperCase()),
  phone: z.string().trim().min(7).max(20).optional().or(z.literal('')),
  saveAddress: z.boolean(),
  existingAddressId: z.string().optional(),
});

export type ShippingAddressFormValues = z.infer<typeof shippingAddressSchema>;

export const checkoutSteps = [
  { id: 1, key: 'shipping', label: 'Shipping' },
  { id: 2, key: 'payment', label: 'Payment' },
  { id: 3, key: 'review', label: 'Review' },
] as const;

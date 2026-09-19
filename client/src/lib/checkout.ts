import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api';

export type Address = {
  id: string;
  type: 'SHIPPING' | 'BILLING';
  label: string | null;
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
};

export type OrderSummary = {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: string;
  tax: string;
  shippingCost: string;
  discountAmount: string;
  total: string;
  currency: string;
  createdAt: string;
  paidAt: string | null;
  shippingAddress: Address;
  billingAddress: Address;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    productSku: string;
    unitPrice: string;
    quantity: number;
    lineTotal: string;
  }>;
  payment?: {
    id: string;
    status: string;
    amount: string;
    provider: string;
  } | null;
};

export type PaymentIntentPayload = {
  payment: {
    id: string;
    orderId: string;
    status: string;
    amount: string;
    currency: string;
  };
  clientSecret: string;
  mode?: 'stripe' | 'demo';
};

export async function listAddresses(): Promise<Address[]> {
  const { data } = await api.get<ApiResponse<{ addresses: Address[] }>>('/addresses');
  if (!data.success) return [];
  return data.data.addresses;
}

export async function createAddress(payload: {
  type?: 'SHIPPING' | 'BILLING';
  label?: string | null;
  fullName: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string | null;
  isDefault?: boolean;
}): Promise<Address> {
  const { data } = await api.post<ApiResponse<{ address: Address }>>('/addresses', payload);
  if (!data.success) throw new Error(data.message);
  return data.data.address;
}

export async function createCheckoutOrder(payload: {
  shippingAddressId: string;
  billingAddressId?: string;
  couponCode?: string;
  notes?: string;
}): Promise<{ order: OrderSummary; payment: PaymentIntentPayload | null }> {
  const { data } = await api.post<
    ApiResponse<{ order: OrderSummary; payment: PaymentIntentPayload | null }>
  >('/orders', payload);
  if (!data.success) throw new Error(data.message);
  return data.data;
}

export async function createPaymentIntent(orderId: string): Promise<PaymentIntentPayload> {
  const { data } = await api.post<ApiResponse<PaymentIntentPayload>>('/payments/intent', {
    orderId,
  });
  if (!data.success) throw new Error(data.message);
  return data.data;
}

export async function confirmDemoPayment(
  orderId: string,
  clientSecret: string,
): Promise<void> {
  const { data } = await api.post<ApiResponse<{ orderId: string }>>('/payments/demo/confirm', {
    orderId,
    clientSecret,
  });
  if (!data.success) throw new Error(data.message);
}

export async function fetchOrder(orderId: string): Promise<OrderSummary> {
  const { data } = await api.get<ApiResponse<{ order: OrderSummary }>>(`/orders/${orderId}`);
  if (!data.success) throw new Error(data.message);
  return data.data.order;
}

export function estimatedDeliveryLabel(from = new Date()): string {
  const start = new Date(from);
  start.setDate(start.getDate() + 3);
  const end = new Date(from);
  end.setDate(end.getDate() + 7);
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

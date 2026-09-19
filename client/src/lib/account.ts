import { api } from '@/lib/api';
import type { Address, OrderSummary } from '@/lib/checkout';
import type { ApiResponse, AuthUser } from '@/types/api';

export type OrderListResult = {
  items: OrderSummary[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export async function updateProfile(payload: {
  name: string;
  phone?: string | null;
}): Promise<AuthUser> {
  const { data } = await api.patch<ApiResponse<{ user: AuthUser }>>('/auth/me', {
    name: payload.name,
    phone: payload.phone || null,
  });
  if (!data.success) throw new Error(data.message);
  return data.data.user;
}

export async function listOrders(params: {
  page?: number;
  limit?: number;
  status?: string;
} = {}): Promise<OrderListResult> {
  const { data } = await api.get<ApiResponse<OrderListResult>>('/orders', { params });
  if (!data.success) throw new Error(data.message);
  return data.data;
}

export async function updateAddress(
  id: string,
  payload: Partial<{
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
  }>,
): Promise<Address> {
  const { data } = await api.put<ApiResponse<{ address: Address }>>(`/addresses/${id}`, payload);
  if (!data.success) throw new Error(data.message);
  return data.data.address;
}

export async function deleteAddress(id: string): Promise<void> {
  const { data } = await api.delete<ApiResponse<{ address: Address }>>(`/addresses/${id}`);
  if (!data.success) throw new Error(data.message);
}

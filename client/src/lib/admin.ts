import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api';
import type { Address, OrderSummary } from '@/lib/checkout';
import type { CatalogCategory, CatalogProduct } from '@/lib/catalog';

export type AdminStats = {
  totalRevenue: string;
  orderCount: number;
  customerCount: number;
  lowStockCount: number;
  lowStockThreshold: number;
  lowStockProducts: Array<{
    id: string;
    name: string;
    sku: string;
    stockQuantity: number;
    images: string[];
  }>;
  salesOverTime: Array<{ date: string; revenue: number; orders: number }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    total: string;
    createdAt: string;
    user: { id: string; name: string; email: string };
  }>;
};

export type AdminProduct = CatalogProduct & {
  sku: string;
  categoryId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  orderCount: number;
  totalSpent: string;
};

export type AdminCategory = CatalogCategory & {
  isActive: boolean;
  sortOrder: number;
  parentId: string | null;
  parent?: { id: string; name: string; slug: string } | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminOrder = OrderSummary & {
  user?: { id: string; name: string; email: string };
  notes?: string | null;
  statusHistory?: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    createdAt: string;
    changedBy?: { id: string; name: string; email: string } | null;
  }>;
  shippingAddress: Address;
  billingAddress: Address;
};

type Paginated<T> = {
  items: T[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
};

export async function fetchAdminStats(days = 30): Promise<AdminStats> {
  const { data } = await api.get<ApiResponse<AdminStats>>('/admin/stats', {
    params: { days },
  });
  if (!data.success) throw new Error(data.message);
  return data.data;
}

export async function fetchAdminProducts(params: {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  lowStock?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} = {}): Promise<Paginated<AdminProduct>> {
  const { data } = await api.get<ApiResponse<Paginated<AdminProduct>>>('/admin/products', {
    params,
  });
  if (!data.success) throw new Error(data.message);
  return data.data;
}

export async function createAdminProduct(formData: FormData): Promise<AdminProduct> {
  const { data } = await api.post<ApiResponse<{ product: AdminProduct }>>('/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    transformRequest: [
      (payload, headers) => {
        if (payload instanceof FormData && headers) {
          delete headers['Content-Type'];
        }
        return payload;
      },
    ],
  });
  if (!data.success) throw new Error(data.message);
  return data.data.product;
}

export async function updateAdminProduct(id: string, formData: FormData): Promise<AdminProduct> {
  const { data } = await api.put<ApiResponse<{ product: AdminProduct }>>(
    `/products/${id}`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      transformRequest: [
        (payload, headers) => {
          if (payload instanceof FormData && headers) {
            delete headers['Content-Type'];
          }
          return payload;
        },
      ],
    },
  );
  if (!data.success) throw new Error(data.message);
  return data.data.product;
}

export async function deleteAdminProduct(id: string): Promise<void> {
  const { data } = await api.delete<ApiResponse<{ product: AdminProduct }>>(`/products/${id}`);
  if (!data.success) throw new Error(data.message);
}

export async function fetchAdminOrders(params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  userId?: string;
} = {}): Promise<Paginated<AdminOrder>> {
  const { data } = await api.get<ApiResponse<Paginated<AdminOrder>>>('/admin/orders', { params });
  if (!data.success) throw new Error(data.message);
  return data.data;
}

export async function updateAdminOrderStatus(
  id: string,
  payload: { status: string; note?: string },
): Promise<AdminOrder> {
  const { data } = await api.patch<ApiResponse<{ order: AdminOrder }>>(
    `/admin/orders/${id}/status`,
    payload,
  );
  if (!data.success) throw new Error(data.message);
  return data.data.order;
}

export async function fetchAdminCustomers(params: {
  page?: number;
  limit?: number;
  search?: string;
} = {}): Promise<Paginated<AdminCustomer>> {
  const { data } = await api.get<ApiResponse<Paginated<AdminCustomer>>>('/admin/customers', {
    params,
  });
  if (!data.success) throw new Error(data.message);
  return data.data;
}

export async function fetchAdminCategories(): Promise<AdminCategory[]> {
  const { data } = await api.get<ApiResponse<{ categories: AdminCategory[] }>>(
    '/admin/categories',
  );
  if (!data.success) throw new Error(data.message);
  return data.data.categories;
}

export async function createAdminCategory(payload: {
  name: string;
  slug?: string;
  description?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<AdminCategory> {
  const { data } = await api.post<ApiResponse<{ category: AdminCategory }>>(
    '/categories',
    payload,
  );
  if (!data.success) throw new Error(data.message);
  return data.data.category;
}

export async function updateAdminCategory(
  id: string,
  payload: Partial<{
    name: string;
    slug: string;
    description: string | null;
    parentId: string | null;
    sortOrder: number;
    isActive: boolean;
  }>,
): Promise<AdminCategory> {
  const { data } = await api.put<ApiResponse<{ category: AdminCategory }>>(
    `/categories/${id}`,
    payload,
  );
  if (!data.success) throw new Error(data.message);
  return data.data.category;
}

export async function deleteAdminCategory(id: string): Promise<void> {
  const { data } = await api.delete<ApiResponse<{ category: AdminCategory }>>(
    `/categories/${id}`,
  );
  if (!data.success) throw new Error(data.message);
}

export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

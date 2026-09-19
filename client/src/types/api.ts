export type ApiSuccess<T> = {
  success: true;
  data: T;
  message?: string;
  error: null;
};

export type ApiFailure = {
  success: false;
  data: null;
  message: string;
  error: {
    code: string;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type Role = 'CUSTOMER' | 'ADMIN';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  createdAt: string;
};

export type CartItem = {
  id: string;
  productId: string;
  quantity: number;
  lineTotal: string;
  product: {
    id: string;
    name: string;
    slug: string;
    price: string;
    images: string[];
    stockQuantity: number;
    isActive: boolean;
    sku: string;
  };
};

export type Cart = {
  id: string;
  userId: string | null;
  guestId: string | null;
  items: CartItem[];
  itemCount: number;
  subtotal: string;
  updatedAt: string;
};

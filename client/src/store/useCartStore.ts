import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, getErrorMessage } from '@/lib/api';
import { isDemoCatalogId, resolveLiveCatalogProduct } from '@/lib/catalog';
import type { ApiResponse, Cart, CartItem } from '@/types/api';
import { toast } from '@/store/useToastStore';
import { useUiStore } from '@/store/useUiStore';

function ensureGuestId(): string {
  const key = 'ecommerce-guest-id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}

export type OptimisticProduct = {
  id: string;
  name: string;
  slug: string;
  price: string;
  images: string[];
  stockQuantity: number;
  sku: string;
};

type CartState = {
  cart: Cart | null;
  guestId: string;
  isLoading: boolean;
  isMutating: boolean;
  setCart: (cart: Cart | null) => void;
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number, product?: OptimisticProduct) => Promise<void>;
  updateItem: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  mergeGuestCart: () => Promise<void>;
  clearLocalCart: () => void;
};

function emptyCartShell(): Cart {
  return {
    id: 'local',
    userId: null,
    guestId: localStorage.getItem('ecommerce-guest-id'),
    items: [],
    itemCount: 0,
    subtotal: '0.00',
    updatedAt: new Date().toISOString(),
  };
}

function recalcCart(items: CartItem[]): Pick<Cart, 'itemCount' | 'subtotal'> {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items
    .reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0)
    .toFixed(2);
  return { itemCount, subtotal };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: null,
      guestId: typeof window !== 'undefined' ? ensureGuestId() : '',
      isLoading: false,
      isMutating: false,

      setCart: (cart) => set({ cart }),

      fetchCart: async () => {
        set({ isLoading: true });
        try {
          ensureGuestId();
          const { data } = await api.get<ApiResponse<{ cart: Cart }>>('/cart');
          if (data.success) {
            set({ cart: data.data.cart });
          }
        } finally {
          set({ isLoading: false });
        }
      },

      addItem: async (productId, quantity = 1, product) => {
        let resolvedId = productId;
        let resolvedProduct = product;

        if (isDemoCatalogId(productId) || isDemoCatalogId(product?.id)) {
          const live = await resolveLiveCatalogProduct({
            id: productId,
            slug: product?.slug,
          });
          if (!live) {
            toast.error('Could not add to cart', 'Product not found');
            throw new Error('Product not found');
          }
          resolvedId = live.id;
          resolvedProduct = {
            id: live.id,
            name: live.name,
            slug: live.slug,
            price: live.price,
            images: live.images,
            stockQuantity: live.stockQuantity,
            sku: live.sku ?? product?.sku ?? live.slug,
          };
        }

        const previous = get().cart;
        const base = previous ?? emptyCartShell();
        const existing = base.items.find((item) => item.productId === resolvedId);

        const optimisticProduct: CartItem['product'] = resolvedProduct
          ? {
              id: resolvedProduct.id,
              name: resolvedProduct.name,
              slug: resolvedProduct.slug,
              price: resolvedProduct.price,
              images: resolvedProduct.images,
              stockQuantity: resolvedProduct.stockQuantity,
              isActive: true,
              sku: resolvedProduct.sku,
            }
          : existing?.product ?? {
              id: resolvedId,
              name: 'Product',
              slug: resolvedId,
              price: '0.00',
              images: [],
              stockQuantity: 99,
              isActive: true,
              sku: 'SKU',
            };

        const nextItems = existing
          ? base.items.map((item) =>
              item.productId === resolvedId
                ? {
                    ...item,
                    quantity: item.quantity + quantity,
                    lineTotal: (Number(item.product.price) * (item.quantity + quantity)).toFixed(2),
                  }
                : item,
            )
          : [
              ...base.items,
              {
                id: `optimistic-${resolvedId}`,
                productId: resolvedId,
                quantity,
                lineTotal: (Number(optimisticProduct.price) * quantity).toFixed(2),
                product: optimisticProduct,
              },
            ];

        const totals = recalcCart(nextItems);
        set({
          cart: { ...base, items: nextItems, ...totals, updatedAt: new Date().toISOString() },
          isMutating: true,
        });
        useUiStore.getState().openCartDrawer();

        try {
          const { data } = await api.post<ApiResponse<{ cart: Cart }>>('/cart/items', {
            productId: resolvedId,
            quantity,
          });
          if (data.success) {
            set({ cart: data.data.cart });
            return;
          }
          set({ cart: previous });
          throw new Error(data.message);
        } catch (error) {
          set({ cart: previous });
          toast.error('Could not add to cart', getErrorMessage(error));
          throw error;
        } finally {
          set({ isMutating: false });
        }
      },

      updateItem: async (productId, quantity) => {
        const previous = get().cart;
        if (!previous) return;

        const nextItems = previous.items.map((item) =>
          item.productId === productId
            ? {
                ...item,
                quantity,
                lineTotal: (Number(item.product.price) * quantity).toFixed(2),
              }
            : item,
        );
        set({
          cart: {
            ...previous,
            items: nextItems,
            ...recalcCart(nextItems),
            updatedAt: new Date().toISOString(),
          },
          isMutating: true,
        });

        try {
          const { data } = await api.patch<ApiResponse<{ cart: Cart }>>(
            `/cart/items/${productId}`,
            { quantity },
          );
          if (data.success) set({ cart: data.data.cart });
          else {
            set({ cart: previous });
            toast.error('Update failed', data.message);
          }
        } catch (error) {
          set({ cart: previous });
          toast.error('Update failed', getErrorMessage(error));
        } finally {
          set({ isMutating: false });
        }
      },

      removeItem: async (productId) => {
        const previous = get().cart;
        if (!previous) return;

        const nextItems = previous.items.filter((item) => item.productId !== productId);
        set({
          cart: {
            ...previous,
            items: nextItems,
            ...recalcCart(nextItems),
            updatedAt: new Date().toISOString(),
          },
          isMutating: true,
        });

        try {
          const { data } = await api.delete<ApiResponse<{ cart: Cart }>>(
            `/cart/items/${productId}`,
          );
          if (data.success) set({ cart: data.data.cart });
          else {
            set({ cart: previous });
            toast.error('Remove failed', data.message);
          }
        } catch (error) {
          set({ cart: previous });
          toast.error('Remove failed', getErrorMessage(error));
        } finally {
          set({ isMutating: false });
        }
      },

      mergeGuestCart: async () => {
        const guestId = localStorage.getItem('ecommerce-guest-id');
        if (!guestId) return;
        const { data } = await api.post<ApiResponse<{ cart: Cart }>>('/cart/merge', { guestId });
        if (data.success) {
          set({ cart: data.data.cart });
          localStorage.removeItem('ecommerce-guest-id');
          set({ guestId: ensureGuestId() });
        }
      },

      clearLocalCart: () => set({ cart: null }),
    }),
    {
      name: 'ecommerce-cart',
      partialize: (state) => ({
        guestId: state.guestId,
        cart: state.cart,
      }),
    },
  ),
);

export function selectCartCount(state: CartState): number {
  return state.cart?.itemCount ?? 0;
}

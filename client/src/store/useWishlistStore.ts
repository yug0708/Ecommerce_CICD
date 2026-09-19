import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WishlistItem = {
  id: string;
  name: string;
  slug: string;
  price: string;
  compareAtPrice?: string | null;
  images: string[];
  addedAt: string;
};

type WishlistState = {
  items: WishlistItem[];
  isSaved: (productId: string) => boolean;
  toggle: (product: Omit<WishlistItem, 'addedAt'>) => boolean;
  remove: (productId: string) => void;
  clear: () => void;
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      isSaved: (productId) => get().items.some((item) => item.id === productId),

      toggle: (product) => {
        const exists = get().items.some((item) => item.id === product.id);
        if (exists) {
          set({ items: get().items.filter((item) => item.id !== product.id) });
          return false;
        }
        set({
          items: [{ ...product, addedAt: new Date().toISOString() }, ...get().items],
        });
        return true;
      },

      remove: (productId) => {
        set({ items: get().items.filter((item) => item.id !== productId) });
      },

      clear: () => set({ items: [] }),
    }),
    { name: 'ecommerce-wishlist' },
  ),
);

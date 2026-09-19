import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CheckoutAddressDraft = {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
};

type CheckoutState = {
  promoCode: string;
  shippingAddressId: string | null;
  billingSameAsShipping: boolean;
  notes: string;
  draftAddress: CheckoutAddressDraft | null;
  setPromoCode: (code: string) => void;
  setShippingAddressId: (id: string | null) => void;
  setBillingSameAsShipping: (value: boolean) => void;
  setNotes: (notes: string) => void;
  setDraftAddress: (address: CheckoutAddressDraft | null) => void;
  resetCheckout: () => void;
};

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      promoCode: '',
      shippingAddressId: null,
      billingSameAsShipping: true,
      notes: '',
      draftAddress: null,
      setPromoCode: (promoCode) => set({ promoCode: promoCode.trim().toUpperCase() }),
      setShippingAddressId: (shippingAddressId) => set({ shippingAddressId }),
      setBillingSameAsShipping: (billingSameAsShipping) => set({ billingSameAsShipping }),
      setNotes: (notes) => set({ notes }),
      setDraftAddress: (draftAddress) => set({ draftAddress }),
      resetCheckout: () =>
        set({
          shippingAddressId: null,
          notes: '',
          draftAddress: null,
        }),
    }),
    {
      name: 'ecommerce-checkout',
      partialize: (state) => ({
        promoCode: state.promoCode,
        billingSameAsShipping: state.billingSameAsShipping,
      }),
    },
  ),
);

/** Client-side estimate mirroring server defaults */
export const CHECKOUT_TAX_RATE = 0.08;
export const CHECKOUT_SHIPPING_FLAT = 5.99;
export const CHECKOUT_FREE_SHIPPING_THRESHOLD = 75;

export function estimateTotals(subtotal: number, promoPercentEstimate = 0) {
  const discount = Math.min(subtotal, (subtotal * promoPercentEstimate) / 100);
  const taxable = Math.max(subtotal - discount, 0);
  const shipping = taxable >= CHECKOUT_FREE_SHIPPING_THRESHOLD ? 0 : CHECKOUT_SHIPPING_FLAT;
  const tax = taxable * CHECKOUT_TAX_RATE;
  const total = taxable + tax + shipping;
  return {
    subtotal,
    discount,
    shipping,
    tax,
    total,
  };
}

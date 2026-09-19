import { create } from 'zustand';

type UiState = {
  mobileNavOpen: boolean;
  adminSidebarOpen: boolean;
  globalLoading: boolean;
  cartDrawerOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
  setAdminSidebarOpen: (open: boolean) => void;
  toggleAdminSidebar: () => void;
  setGlobalLoading: (loading: boolean) => void;
  setCartDrawerOpen: (open: boolean) => void;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  mobileNavOpen: false,
  adminSidebarOpen: true,
  globalLoading: false,
  cartDrawerOpen: false,
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
  toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),
  setAdminSidebarOpen: (adminSidebarOpen) => set({ adminSidebarOpen }),
  toggleAdminSidebar: () => set((s) => ({ adminSidebarOpen: !s.adminSidebarOpen })),
  setGlobalLoading: (globalLoading) => set({ globalLoading }),
  setCartDrawerOpen: (cartDrawerOpen) => set({ cartDrawerOpen }),
  openCartDrawer: () => set({ cartDrawerOpen: true }),
  closeCartDrawer: () => set({ cartDrawerOpen: false }),
}));

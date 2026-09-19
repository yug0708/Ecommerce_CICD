import { useEffect, type ReactNode } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { ToastViewport } from '@/components/ui';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';

type AppProvidersProps = {
  children: ReactNode;
};

/**
 * Global providers: auth bootstrap, cart hydrate, toast viewport.
 */
export function AppProviders({ children }: AppProvidersProps) {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const mergeGuestCart = useCartStore((s) => s.mergeGuestCart);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    async function syncCart() {
      if (isAuthenticated) {
        await mergeGuestCart().catch(() => undefined);
      }
      await fetchCart().catch(() => undefined);
    }
    void syncCart();
  }, [isAuthenticated, fetchCart, mergeGuestCart]);

  return (
    <HelmetProvider>
      {children}
      <ToastViewport />
    </HelmetProvider>
  );
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, ensureCsrfToken, getErrorMessage, setCsrfToken } from '@/lib/api';
import type { ApiResponse, AuthUser } from '@/types/api';
import { toast } from '@/store/useToastStore';

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  setSession: (user: AuthUser, accessToken: string) => void;
  setAccessToken: (accessToken: string | null) => void;
  clearSession: () => void;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (payload: { name: string; phone?: string | null }) => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isBootstrapping: true,

      setSession: (user, accessToken) => {
        set({ user, accessToken, isAuthenticated: true });
      },

      setAccessToken: (accessToken) => {
        set({ accessToken, isAuthenticated: Boolean(accessToken && get().user) });
      },

      clearSession: () => {
        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      bootstrap: async () => {
        set({ isBootstrapping: true });
        try {
          await ensureCsrfToken();
          // Prefer refresh cookie to restore session after reload
          const { data } = await api.post<ApiResponse<{ user: AuthUser; accessToken: string; csrfToken?: string }>>(
            '/auth/refresh',
          );
          if (data.success) {
            if (data.data.csrfToken) setCsrfToken(data.data.csrfToken);
            get().setSession(data.data.user, data.data.accessToken);
            return;
          }
          get().clearSession();
        } catch {
          // Fall back to /me if we still have a persisted access token
          const token = get().accessToken;
          if (!token) {
            get().clearSession();
            return;
          }
          try {
            const { data } = await api.get<ApiResponse<{ user: AuthUser }>>('/auth/me');
            if (data.success) {
              set({ user: data.data.user, isAuthenticated: true });
            } else {
              get().clearSession();
            }
          } catch {
            get().clearSession();
          }
        } finally {
          set({ isBootstrapping: false });
        }
      },

      login: async (email, password) => {
        const { data } = await api.post<
          ApiResponse<{ user: AuthUser; accessToken: string; csrfToken?: string }>
        >('/auth/login', { email, password });
        if (!data.success) {
          throw new Error(data.message);
        }
        if (data.data.csrfToken) setCsrfToken(data.data.csrfToken);
        get().setSession(data.data.user, data.data.accessToken);
      },

      register: async (payload) => {
        const { data } = await api.post<
          ApiResponse<{ user: AuthUser; accessToken: string; csrfToken?: string }>
        >('/auth/register', payload);
        if (!data.success) {
          throw new Error(data.message);
        }
        if (data.data.csrfToken) setCsrfToken(data.data.csrfToken);
        get().setSession(data.data.user, data.data.accessToken);
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch (error) {
          toast.warning('Signed out locally', getErrorMessage(error, 'Server logout failed'));
        } finally {
          get().clearSession();
        }
      },

      updateProfile: async (payload) => {
        const { data } = await api.patch<ApiResponse<{ user: AuthUser }>>('/auth/me', {
          name: payload.name,
          phone: payload.phone || null,
        });
        if (!data.success) {
          throw new Error(data.message);
        }
        set({ user: data.data.user });
      },
    }),
    {
      name: 'ecommerce-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

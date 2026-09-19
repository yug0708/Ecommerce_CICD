import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/useAuthStore';
import type { ApiResponse } from '@/types/api';

const baseURL = import.meta.env.VITE_API_URL || '/api';

let csrfToken: string | null = null;

export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

export async function ensureCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  try {
    const { data } = await axios.get<ApiResponse<{ csrfToken: string }>>(`${baseURL}/auth/csrf`, {
      withCredentials: true,
    });
    if (data.success) {
      csrfToken = data.data.csrfToken;
    }
  } catch {
    csrfToken = null;
  }
  return csrfToken;
}

export const api = axios.create({
  baseURL,
  timeout: 20000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

type RetryConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const token = await ensureCsrfToken();
    const { data } = await axios.post<
      ApiResponse<{ user: unknown; accessToken: string; csrfToken?: string }>
    >(
      `${baseURL}/auth/refresh`,
      {},
      {
        withCredentials: true,
        headers: token ? { 'X-CSRF-Token': token } : {},
      },
    );

    if (!data.success) {
      return null;
    }

    const accessToken = data.data.accessToken;
    if (data.data.csrfToken) setCsrfToken(data.data.csrfToken);
    useAuthStore.getState().setAccessToken(accessToken);
    return accessToken;
  } catch {
    useAuthStore.getState().clearSession();
    return null;
  }
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const guestId = localStorage.getItem('ecommerce-guest-id');
  if (guestId) {
    config.headers['X-Guest-Id'] = guestId;
  }

  const method = (config.method ?? 'get').toLowerCase();
  if (csrfToken && method !== 'get' && method !== 'head' && method !== 'options') {
    config.headers['X-CSRF-Token'] = csrfToken;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const original = error.config as RetryConfig | undefined;
    const status = error.response?.status;

    if (status === 401 && original && !original._retry) {
      const url = original.url ?? '';
      const isAuthEndpoint =
        url.includes('/auth/login') ||
        url.includes('/auth/register') ||
        url.includes('/auth/refresh');

      if (isAuthEndpoint) {
        return Promise.reject(error);
      }

      original._retry = true;

      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });

      const newToken = await refreshPromise;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }

    return Promise.reject(error);
  },
);

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    if (!error.response) {
      const code = error.code ?? '';
      if (code === 'ECONNREFUSED' || code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        return 'API is not running. Start the server on port 4000 and try again.';
      }
    }
    return error.response?.data?.message ?? error.message ?? fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

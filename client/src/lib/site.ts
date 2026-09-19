export const SITE_NAME = 'Ecommerce';

export function siteUrl(): string {
  const configured = import.meta.env.VITE_SITE_URL?.replace(/\/$/, '');
  if (configured) return configured;
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:5173';
}

export function absoluteUrl(path = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${siteUrl()}${normalized}`;
}

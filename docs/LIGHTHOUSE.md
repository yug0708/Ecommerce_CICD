# Lighthouse performance checklist

Run Chrome Lighthouse on `/` and `/products` (mobile + desktop) after a production build.

## Largest Contentful Paint (LCP)

- [x] Hero image uses `fetchpriority="high"`, responsive `srcset`, and WebP `<source>`
- [x] Hero dimensions reserved (`width`/`height` + full-bleed container)
- [x] Inter loaded with `display=swap` and preconnect
- [x] Route-level `React.lazy` / code splitting so home JS stays smaller
- [x] Catalog list responses cached (Redis or memory) to cut TTFB
- [ ] Replace Unsplash demo assets with self-hosted WebP/AVIF in production
- [ ] Consider a static hero image in `/client/public` and `<link rel="preload">` on `/` only
- [ ] Enable a CDN in front of `/uploads`

## Cumulative Layout Shift (CLS)

- [x] Product tiles use a fixed `aspect-[4/5]` frame before the image paints
- [x] Detail gallery is `aspect-square` with explicit width/height
- [x] Filter/skeleton placeholders occupy the same grid as real cards
- [ ] Avoid injecting late webfonts or cookie banners without reserved space
- [ ] Don’t swap image aspect ratios after load

## Other audits

- [x] Manual vendor chunks (React, Stripe, Recharts)
- [x] Compression middleware on the API
- [x] `robots.txt` + `sitemap.xml`
- [x] Per-route meta via `react-helmet-async`
- [ ] Add real favicon / apple-touch-icon set
- [ ] Self-host Inter to drop the Google Fonts request
- [ ] Connect Sentry + Web Vitals after launch

# Security review (Prompt 17)

Issues found during the production hardening pass, and the fix applied.

| # | Issue | Severity | Fix |
|---|--------|----------|-----|
| 1 | Cookie-authenticated `POST /auth/refresh` and `/auth/logout` had no CSRF defense. A malicious site could trigger refresh/logout while a session cookie was present. | High | Double-submit CSRF: `GET /api/auth/csrf` issues a token cookie + JSON body; mutating cookie routes require matching `X-CSRF-Token`. Client stores the token and sends it on non-GET requests. |
| 2 | Refresh cookie used `SameSite=strict` even when the SPA and API are on different hosts (Vercel + Render). Cross-site cookies would be dropped **or** (if switched to `None` without CSRF) would be CSRF-vulnerable. | High | `SameSite=None; Secure` only when `PUBLIC_API_URL` origin ≠ `CLIENT_URL`. Same-origin deploys stay `Strict` in production. |
| 3 | Helmet ran with defaults only — no CSP, weak HSTS. | Medium | CSP `default-src 'none'` on API responses, HSTS in production, referrer policy, `x-powered-by` already disabled. |
| 4 | HTTP was accepted in production behind a proxy. | Medium | `enforceHttps` redirects to HTTPS using `x-forwarded-proto` (trust proxy is on). |
| 5 | Uploads trusted the `Content-Type` header. A `.jpg` with PHP/HTML payload could be stored. | High | MIME + extension allow-list, reject double extensions, verify JPEG/PNG/GIF/WebP **magic bytes** after write and delete fakes. Size still capped at 5MB / 8 files. |
| 6 | `/uploads` was served as raw static files without nosniff. | Medium | `X-Content-Type-Options: nosniff` and no directory index on `/uploads`. |
| 7 | Operational error `details` were returned in production (`isOperational` leaked Prisma/Zod internals). | Medium | Details only in non-production. |
| 8 | XSS: no `dangerouslySetInnerHTML`, but string fields were stored as-is. | Low | Request sanitizer strips `<script>` and inline `on*` handlers from JSON/query strings. React still escapes render output. |
| 9 | SQL injection: raw queries exist for `SELECT … FOR UPDATE`. | Info (already safe) | All `$queryRaw` uses Prisma tagged templates (parameterized). No string-concatenated SQL. Health check is a constant `SELECT 1`. |
| 10 | Admin UI existed but needed confirmation that APIs were gated. | Info (already safe) | Frontend `AdminRoute` requires `role === ADMIN`. Backend `authenticate` + `authorize('ADMIN')` on `/admin/*`, product mutations, category mutations. |
| 11 | Frontend bundle could theoretically receive secret env vars if someone named them `VITE_*`. | Medium | Vite `envPrefix: ['VITE_']`. Client `.env.example` documents publishable Stripe key only. Server secrets stay on the API. |
| 12 | Catalog GETs were uncached and hit the DB on every listing (DoS / cost). | Low | Redis cache with in-memory fallback; invalidated on product/category writes. |
| 13 | N+1 risk on product lists if ratings were queried per row. | Low | One `include`/`select` for category + review count, plus a single `groupBy` for averages. List payload description truncated. |

## What we deliberately did not change

- Access tokens remain Bearer headers (not cookies), so typical CSRF does not apply to cart/orders/admin APIs.
- Stripe webhooks stay on the raw-body route and are signature-verified.
- Soft-deleted products stay in the database (intentional).

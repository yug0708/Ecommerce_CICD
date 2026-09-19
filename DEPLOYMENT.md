# Deployment

## Local / staging (Docker)

```bash
cp server/.env.example server/.env
# set real Stripe test keys in server/.env
docker compose up --build
```

- App: http://localhost  
- API: http://localhost/api (proxied) or http://localhost:4000/api  
- Postgres: localhost:5432  
- Redis: localhost:6379  

## Production build scripts

```bash
npm ci
npm run build          # client + server
npm run start:prod -w server   # migrate + node dist/index.js
npm run preview -w client      # optional static preview
```

Use `.env.production.example` (root, `client/`, `server/`) as a checklist. Never commit real values.

---

## Backend — Render / Railway / Fly.io

All three need: Node 20, a Postgres addon, and (optional) Redis.

### Render

1. New **Web Service** from this repo. Root directory: `server` *or* use the repo-root Dockerfile `server/Dockerfile` (build context = repo root).
2. Build: `npm ci && npx prisma generate && npm run build`
3. Start: `npm run start:prod`
4. Add a **Postgres** database and copy `DATABASE_URL`.
5. Optional: Render Redis → `REDIS_URL`.
6. Set env vars from `server/.env.production.example`.
7. `CLIENT_URL` = your Vercel/Netlify origin.  
   `PUBLIC_API_URL` = this service’s public origin (for cross-site cookies).
8. Stripe webhook endpoint: `https://<api-host>/api/payments/webhook`

### Railway

1. New project → deploy from GitHub.
2. Add Postgres + Redis plugins.
3. Service start command: `npm run start:prod` (working directory `server`).
4. Map the same env vars. Railway injects `DATABASE_URL` / Redis URL automatically.

### Fly.io

```bash
fly launch --dockerfile server/Dockerfile
fly postgres create
fly redis create
fly secrets set JWT_SECRET=... JWT_REFRESH_SECRET=... STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=... CLIENT_URL=https://... PUBLIC_API_URL=https://...
fly deploy
```

---

## Frontend — Vercel / Netlify

Build command: `npm run build` (or `npm run build -w client` from the monorepo root).  
Output directory: `client/dist`.  
Framework preset: Vite.

Environment (public only):

- `VITE_API_URL` — `https://<api-host>/api` (no trailing slash issues)
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_SITE_URL` — the storefront origin (used for canonical / OG tags)

SPA fallback: rewrite all routes to `index.html` (Vercel does this for Vite; on Netlify add `client/public/_redirects` if needed: `/* /index.html 200`).

Update `client/public/robots.txt` and `sitemap.xml` to the real `VITE_SITE_URL`.

CORS: API `CLIENT_URL` must exactly match the frontend origin.

---

## GitHub Actions

`.github/workflows/ci.yml`:

1. Lint → unit tests → Prisma generate → production build on every PR/push.
2. On push to `main`, optional deploy:
   - `RENDER_DEPLOY_HOOK` secret → POST to Render deploy hook
   - `VERCEL_TOKEN` secret → `vercel deploy --prod`

You can also skip the deploy job and use the native Render/Vercel GitHub integrations.

---

## Production launch checklist

- [ ] All production env vars set (JWT pair, Stripe live/test, `CLIENT_URL`, `PUBLIC_API_URL`, `DATABASE_URL`)
- [ ] `JWT_SECRET` / `JWT_REFRESH_SECRET` are unique, ≥16 chars, not the example values
- [ ] No `sk_live_` / `whsec_` / DB passwords in the client bundle (`VITE_*` only)
- [ ] Stripe webhook registered and `STRIPE_WEBHOOK_SECRET` matches
- [ ] Postgres automated backups enabled (Render/Railway/Fly default backups or `pg_dump` cron)
- [ ] Redis optional but recommended in production for catalog cache
- [ ] Custom domain + HTTPS on both frontend and API
- [ ] `robots.txt` / `sitemap.xml` use the real hostname
- [ ] Error monitoring: add [Sentry](https://sentry.io) (`@sentry/node` on the server, `@sentry/react` on the client)
- [ ] Analytics: Plausible or GA4 (load only after consent if you target the EU)
- [ ] Lighthouse pass on `/` and `/products` (see `docs/LIGHTHOUSE.md`)
- [ ] Create the first admin user in the database (`role = ADMIN`)
- [ ] Rate limits reviewed for your traffic
- [ ] Upload volume: plan object storage (S3) before disk fills on a single dyno

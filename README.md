# VaseraOS — Society Management on Cloudflare

Next.js housing-society app deployed **entirely on Cloudflare**: Workers (compute), D1 (SQLite DB), R2 (file uploads), KV (sessions/cache).

Modules: Dashboard · Residents · Maintenance · Complaints · Visitors · Notices.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000 (uses in-memory demo data)
```

## Cloudflare wiring

```bash
npx wrangler login
npm run cf-typegen                       # regenerate worker-configuration.d.ts

# D1 (first time only — then update database_id in wrangler.jsonc)
npx wrangler d1 create vaseraos-db
npm run db:migrate:local                 # local dev
npm run db:migrate:remote                # production D1

# R2 (first time only)
npx wrangler r2 bucket create vaseraos-uploads

# KV (first time only — then update id in wrangler.jsonc)
npx wrangler kv namespace create SESSIONS
```

## Deploy

```bash
npm run deploy   # build with OpenNext + deploy to Workers
npm run preview  # local Workers preview
```

API routes in `app/api/*` use `getCloudflareContext()` → `env.DB` / `env.UPLOADS` / `env.SESSIONS`, with an in-memory fallback so `next dev` works before bindings exist.

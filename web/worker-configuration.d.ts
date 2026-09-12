// Cloudflare bindings shared across the app.
// After `wrangler types` runs, this stays in sync with wrangler.jsonc.
export interface CloudflareEnv {
  DB: D1Database;
  UPLOADS: R2Bucket;
  SESSIONS: KVNamespace;
}

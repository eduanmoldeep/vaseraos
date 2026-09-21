// Cloudflare bindings shared across the app.
// After `wrangler types` runs, this stays in sync with wrangler.jsonc.
export interface CloudflareEnv {
  DB: D1Database;
  UPLOADS: R2Bucket;
  SESSIONS: KVNamespace;
  // Secrets — set via `wrangler secret put`, never in wrangler.jsonc.
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
}

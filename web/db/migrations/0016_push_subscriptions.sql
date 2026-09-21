-- 0016_push_subscriptions.sql — Web Push subscriptions (browser/installed-PWA),
-- one row per device a user has enabled alerts on. Separate from the guard
-- app's own Expo push tokens (guard_push_tokens) — this is the resident/admin
-- web side.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions (user_id);

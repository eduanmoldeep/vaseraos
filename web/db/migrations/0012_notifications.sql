-- 0012_notifications.sql — per-user notification inbox, fanned out from
-- society-wide events (starting with new notices).
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  society_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_society ON notifications (user_id, society_id);

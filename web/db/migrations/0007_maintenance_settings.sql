-- 0007_maintenance_settings.sql — per-society maintenance due config, set by the treasurer.
CREATE TABLE IF NOT EXISTS maintenance_settings (
  society_id TEXT PRIMARY KEY,
  amount INTEGER NOT NULL,
  cadence TEXT NOT NULL DEFAULT 'monthly',
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

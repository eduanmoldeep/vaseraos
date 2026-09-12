-- 0008_guard_sos.sql — guards are a distinct identity (not residents, no offices)
-- and the panic-alarm SOS flow that connects residents to them.

CREATE TABLE IF NOT EXISTS guards (
  id TEXT PRIMARY KEY,
  society_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  password_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_guards_society ON guards (society_id);

CREATE TABLE IF NOT EXISTS guard_push_tokens (
  id TEXT PRIMARY KEY,
  guard_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
  expo_token TEXT,
  voip_token TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (guard_id, platform)
);

CREATE TABLE IF NOT EXISTS sos_alerts (
  id TEXT PRIMARY KEY,
  society_id TEXT NOT NULL,
  raised_by_user_id TEXT NOT NULL,
  flat TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  acknowledged_by_guard_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  acknowledged_at TEXT,
  resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sos_society_status ON sos_alerts (society_id, status);

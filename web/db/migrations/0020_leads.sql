-- 0020_leads.sql — sales leads submitted from the public landing page
-- (no login required), reviewed by platform admins.
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  society_name TEXT,
  city TEXT,
  units INTEGER,
  message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads (created_at);

-- 0002_societies.sql — multi-tenancy: one societies table, every module row belongs to a society.

CREATE TABLE IF NOT EXISTS societies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed a default society so existing installs keep working.
INSERT OR IGNORE INTO societies (id, name, city) VALUES ('s_default', 'Default Society', '');

-- Add society_id to every module table (no-op if re-applied).
ALTER TABLE residents ADD COLUMN society_id TEXT NOT NULL DEFAULT 's_default';
ALTER TABLE maintenance_bills ADD COLUMN society_id TEXT NOT NULL DEFAULT 's_default';
ALTER TABLE complaints ADD COLUMN society_id TEXT NOT NULL DEFAULT 's_default';
ALTER TABLE visitors ADD COLUMN society_id TEXT NOT NULL DEFAULT 's_default';
ALTER TABLE notices ADD COLUMN society_id TEXT NOT NULL DEFAULT 's_default';

-- Flat numbers must be unique per society, not globally: rebuild residents.
-- (SQLite cannot drop the UNIQUE constraint on flat in place.)
CREATE TABLE IF NOT EXISTS residents_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  flat TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  members INTEGER NOT NULL DEFAULT 1,
  owner_tenant TEXT NOT NULL DEFAULT 'owner',
  society_id TEXT NOT NULL DEFAULT 's_default',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (society_id, flat)
);
INSERT OR IGNORE INTO residents_new (id, name, flat, phone, email, members, owner_tenant, society_id, created_at)
  SELECT id, name, flat, phone, email, members, owner_tenant, society_id, created_at FROM residents;
DROP TABLE residents;
ALTER TABLE residents_new RENAME TO residents;

CREATE INDEX IF NOT EXISTS idx_residents_society ON residents (society_id);
CREATE INDEX IF NOT EXISTS idx_bills_society ON maintenance_bills (society_id);
CREATE INDEX IF NOT EXISTS idx_complaints_society ON complaints (society_id);
CREATE INDEX IF NOT EXISTS idx_visitors_society ON visitors (society_id);
CREATE INDEX IF NOT EXISTS idx_notices_society ON notices (society_id);

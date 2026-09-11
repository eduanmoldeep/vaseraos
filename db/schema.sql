-- VaseraOS society management schema (Cloudflare D1 / SQLite)
-- Applied via: npx wrangler d1 migrations apply vaseraos-db --local/--remote
-- or: npx wrangler d1 execute vaseraos-db --file ./db/schema.sql

CREATE TABLE IF NOT EXISTS societies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS residents (
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

CREATE TABLE IF NOT EXISTS maintenance_bills (
  id TEXT PRIMARY KEY,
  flat TEXT NOT NULL,
  amount INTEGER NOT NULL,
  month TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  society_id TEXT NOT NULL DEFAULT 's_default',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,
  flat TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'open',
  society_id TEXT NOT NULL DEFAULT 's_default',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS visitors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  flat TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'visit',
  status TEXT NOT NULL DEFAULT 'expected',
  society_id TEXT NOT NULL DEFAULT 's_default',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notices (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all',
  attachment TEXT,
  society_id TEXT NOT NULL DEFAULT 's_default',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_residents_society ON residents (society_id);
CREATE INDEX IF NOT EXISTS idx_bills_society ON maintenance_bills (society_id);
CREATE INDEX IF NOT EXISTS idx_complaints_society ON complaints (society_id);
CREATE INDEX IF NOT EXISTS idx_visitors_society ON visitors (society_id);
CREATE INDEX IF NOT EXISTS idx_notices_society ON notices (society_id);

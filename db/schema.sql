-- VaseraOS society management schema (Cloudflare D1 / SQLite)
-- Applied via: npx wrangler d1 migrations apply vaseraos-db --local/--remote
-- or: npx wrangler d1 execute vaseraos-db --file ./db/schema.sql

CREATE TABLE IF NOT EXISTS residents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  flat TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  email TEXT,
  members INTEGER NOT NULL DEFAULT 1,
  owner_tenant TEXT NOT NULL DEFAULT 'owner',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS maintenance_bills (
  id TEXT PRIMARY KEY,
  flat TEXT NOT NULL,
  amount INTEGER NOT NULL,
  month TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,
  flat TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS visitors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  flat TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'visit',
  status TEXT NOT NULL DEFAULT 'expected',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notices (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all',
  attachment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
